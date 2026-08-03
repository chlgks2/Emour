"""
골드셋 어댑터 — 라벨링한 CSV → run_eval.py 가 먹는 JSONL 로 변환.

무엇을 하나
    1) 사람이 매긴 CSV 를 읽는다
    2) 라벨 이름을 확정 15라벨로 정규화한다 (무감정→평범, 평온→편안, 황당→당황)
    3) 세트를 10/10 슬라이딩 창으로 자른다 (백엔드 실제 입력과 동일한 모양)
    4) dev / test 로 층화 분할한다
    5) run_eval.py 형식 JSONL 로 저장한다

왜 창을 미리 안 자르고 여기서 자르나
    라벨링은 '메시지 단위'로 하고, 창은 '평가 시점'에 만듭니다.
    이렇게 해두면 창 크기를 10/10 → 10/5 로 바꾸고 싶어져도
    골드셋을 다시 만들 필요 없이 이 스크립트만 다시 돌리면 됩니다.

입력 CSV 형식
    set_id,idx,speaker,text,gold,conf,long_ctx
    s01,0,A,오늘 늦을듯,평범,high,
    s01,1,B,ㅇㅇ,서운함,low,
    s01,2,B,알겠어,서운함,high,TRUE

실행
    python eval/gold_adapter.py --csv data/gold_raw.csv
    python eval/gold_adapter.py --csv data/gold_raw.csv --ctx 10 --tgt 10
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS  # noqa: E402
from app.normalize import normalize_label  # noqa: E402

VALID = set(EMOUR_LABELS)

# 대분류 4그룹 — 실험 분석용 보조 지표에 씁니다.
COARSE_MAP = {
    "기쁨": "긍정", "설렘": "긍정", "편안": "긍정",
    "걱정": "중립", "놀람": "중립", "평범": "중립", "부끄러움": "중립", "궁금": "중립",
    "슬픔": "부정", "화남": "부정", "당황": "부정", "힘듦": "부정",
    "고마움": "관계신호", "미안함": "관계신호", "서운함": "관계신호",
}


def _truthy(v: str | None) -> bool:
    return str(v or "").strip().lower() in ("1", "true", "y", "yes", "t", "o")


def load_rows(csv_path: Path) -> list[dict]:
    """CSV 를 읽고 라벨을 정규화. 알 수 없는 라벨은 즉시 알려줍니다."""
    rows: list[dict] = []
    unknown: Counter = Counter()

    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        for i, r in enumerate(csv.DictReader(f), start=2):  # 2 = 헤더 다음 줄
            raw = (r.get("gold") or "").strip()
            if not raw:
                continue  # 라벨 안 매긴 줄은 건너뜀

            label = raw if raw in VALID else (normalize_label(raw) or "")
            if label not in VALID:
                unknown[raw] += 1
                continue

            rows.append({
                "set_id": (r.get("set_id") or "").strip(),
                "idx": int(r["idx"]),
                "speaker": (r.get("speaker") or "").strip() or "A",
                "text": (r.get("text") or "").strip(),
                "gold": label,
                "conf": (r.get("conf") or "high").strip().lower(),
                "long_ctx": _truthy(r.get("long_ctx")),
            })

    if unknown:
        print("⚠️  변환 실패한 라벨 (오타이거나 15라벨에 없는 이름):")
        for k, v in unknown.most_common():
            print(f"      '{k}'  {v}건")
        print("   → normalize.py 의 ALIASES 에 추가하거나 CSV 를 고치세요.\n")

    return rows


def make_windows(rows: list[dict], ctx: int, tgt: int) -> list[dict]:
    """
    세트별로 10/10 슬라이딩 창을 만든다.

    target 이었던 10개가 다음 창의 context 가 되는 구조.
      창1: context []           target [0..9]
      창2: context [0..9]       target [10..19]
      창3: context [10..19]     target [20..29]
    """
    by_set: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_set[r["set_id"]].append(r)

    cases: list[dict] = []
    mid = 1  # message_id 는 전역 일련번호로 부여 (중복 방지)

    for set_id in sorted(by_set):
        msgs = sorted(by_set[set_id], key=lambda x: x["idx"])
        for w, start in enumerate(range(0, len(msgs), tgt)):
            chunk = msgs[start:start + tgt]
            if not chunk:
                continue
            ctx_chunk = msgs[max(0, start - ctx):start]

            targets = []
            for m in chunk:
                targets.append({
                    "message_id": mid,
                    "speaker": m["speaker"],
                    "text": m["text"],
                    "gold": m["gold"],
                    # ↓ run_eval 은 무시하지만 서브셋 분석에 씁니다
                    "conf": m["conf"],
                    "long_ctx": m["long_ctx"],
                    "coarse": COARSE_MAP[m["gold"]],
                })
                mid += 1

            cases.append({
                "case_id": f"{set_id}_w{w}",
                "set_id": set_id,
                "window_index": w,          # 0 = context 없는 첫 창
                "context": [{"speaker": c["speaker"], "text": c["text"]} for c in ctx_chunk],
                "target": targets,
            })

    return cases


def split(cases: list[dict], test_ratio: float, seed: int) -> tuple[list, list]:
    """
    세트 단위로 분할한다.

    ⚠️ 창 단위로 나누면 같은 세트의 앞창이 dev, 뒷창이 test 에 들어가
       내용이 새어나갑니다(leakage). 반드시 세트째로 갈라야 합니다.
    """
    set_ids = sorted({c["set_id"] for c in cases})
    rng = random.Random(seed)
    rng.shuffle(set_ids)

    n_test = max(1, round(len(set_ids) * test_ratio))
    test_sets = set(set_ids[:n_test])

    dev = [c for c in cases if c["set_id"] not in test_sets]
    test = [c for c in cases if c["set_id"] in test_sets]
    return dev, test


def write_jsonl(cases: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")


def report(name: str, cases: list[dict]) -> None:
    msgs = [m for c in cases for m in c["target"]]
    dist = Counter(m["gold"] for m in msgs)
    print(f"\n── {name} ── 창 {len(cases)}개 / 메시지 {len(msgs)}개")
    print(f"   저확신(conf=low)     : {sum(1 for m in msgs if m['conf'] == 'low')}건")
    print(f"   창밖맥락(long_ctx)   : {sum(1 for m in msgs if m['long_ctx'])}건")
    print(f"   첫 창(context 없음)  : {sum(1 for c in cases if c['window_index'] == 0)}개")
    print("   라벨 분포:")
    for lab in EMOUR_LABELS:
        n = dist.get(lab, 0)
        flag = "  ⚠️ support 부족" if 0 < n < 5 else ("  ⚠️ 0건" if n == 0 else "")
        print(f"      {lab:<6} {n:>4}{flag}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="라벨링한 CSV 경로")
    ap.add_argument("--outdir", default="eval", help="출력 폴더")
    ap.add_argument("--ctx", type=int, default=10, help="context 개수")
    ap.add_argument("--tgt", type=int, default=10, help="target 개수")
    ap.add_argument("--test-ratio", type=float, default=0.25)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rows = load_rows(Path(args.csv))
    print(f"읽은 라벨: {len(rows)}건")

    cases = make_windows(rows, args.ctx, args.tgt)
    dev, test = split(cases, args.test_ratio, args.seed)

    outdir = Path(args.outdir)
    write_jsonl(cases, outdir / "gold_all.jsonl")
    write_jsonl(dev, outdir / "gold_dev.jsonl")
    write_jsonl(test, outdir / "gold_test.jsonl")

    report("전체", cases)
    report("dev", dev)
    report("test", test)

    print(f"\n✅ 저장 완료")
    print(f"   {outdir}/gold_all.jsonl")
    print(f"   {outdir}/gold_dev.jsonl   ← 실험은 전부 여기서")
    print(f"   {outdir}/gold_test.jsonl  ← 마지막에 딱 한 번")


if __name__ == "__main__":
    main()
