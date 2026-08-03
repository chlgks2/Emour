"""
실험 A — KOTE(문장 단위 분류기)를 골드셋에 그대로 돌려본다.

목적
    "KOTE는 안 맞아서 안 썼습니다" 는 주장이고,
    "돌려봤더니 macro-F1 0.2x, 맥락 케이스에서는 0.1x 였습니다" 는 증거다.

KOTE 란
    한국어 온라인 댓글 5만 건으로 학습된 44라벨 멀티라벨 감정 분류기.
    (43개 감정 + '없음')  백본은 beomi/KcELECTRA-base.
    ⚠️ 학습을 시키지 않는다. 공개된 그대로 추론만 한다.

구조적 한계 3가지 (이 실험이 증명하려는 것)
    ① 도메인 불일치 — 온라인 댓글로 학습됨. 커플 카톡이 아님
    ② 출력 형태 불일치 — 멀티라벨 44개 확률 vs 우리는 단일라벨 15개
    ③ 문장 단위 — 앞 대화를 볼 수 없음. "알겠어"가 서운함인지 알 방법이 없음

실행
    python eval/run_kote.py --gold eval/gold_dev.jsonl
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS  # noqa: E402
from app.run_eval import score, coarse_accuracy, subset_accuracy  # noqa: E402

MODEL_NAME = "searle-j/kote_for_easygoing_people"

# ── KOTE 44라벨 → Emour 15라벨 매핑 ──────────────────────────
# 이 표 자체가 발표 자료입니다. "44개를 15개로 누르면 무엇이 사라지는가"
# 를 보여주는 증거이기 때문입니다.
#
# 매핑 불가로 버려지는 것들:
#   존경, 우쭐댐/무시함, 비장함, 깨달음, 재미없음 등
#   → 커플 대화용 15라벨 체계에 대응 항목이 없음
KOTE_TO_EMOUR: dict[str, str] = {
    # 긍정
    "기쁨": "기쁨", "즐거움/신남": "기쁨", "행복": "기쁨",
    "감동/감탄": "기쁨", "뿌듯함": "기쁨", "환영/호의": "기쁨",
    "흐뭇함(귀여움/예쁨)": "설렘", "기대감": "설렘", "아껴주는": "설렘",
    "편안/쾌적": "편안", "안심/신뢰": "편안",
    # 중립
    "불안/걱정": "걱정", "공포/무서움": "걱정", "불쌍함/연민": "걱정",
    "놀람": "놀람", "경악": "놀람",
    "신기함/관심": "궁금", "의심/불신": "궁금",
    "부끄러움": "부끄러움",
    "없음": "평범",
    # 부정
    "슬픔": "슬픔", "서러움": "슬픔", "절망": "슬픔",
    "화남/분노": "화남", "짜증": "화남", "불평/불만": "화남",
    "증오/혐오": "화남", "역겨움/징그러움": "화남", "지긋지긋": "화남",
    "한심함": "화남",
    "당황/난처": "당황", "어이없음": "당황",
    "힘듦/지침": "힘듦", "귀찮음": "힘듦", "부담/안_내킴": "힘듦",
    "패배/자기혐오": "힘듦",
    # 관계신호
    "고마움": "고마움",
    "죄책감": "미안함",
    "안타까움/실망": "서운함",
}

# 매핑 대상이 없어 버려지는 KOTE 라벨 (발표에서 언급할 것)
UNMAPPED_NOTE = ["존경", "우쭐댐/무시함", "비장함", "깨달음", "재미없음"]


def load_gold(path: Path) -> list[dict]:
    """골드셋에서 target 메시지만 평평하게 펼친다. 문장 단위 모델이므로 context는 버린다."""
    items = []
    for line in path.open(encoding="utf-8"):
        case = json.loads(line)
        for m in case["target"]:
            if "gold" in m:
                items.append({
                    "text": m["text"],
                    "gold": m["gold"],
                    "conf": m.get("conf", "high"),
                    "long_ctx": bool(m.get("long_ctx", False)),
                    "window_index": case.get("window_index", 0),
                })
    return items


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gold", default="eval/gold_dev.jsonl")
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()

    from transformers import pipeline

    print(f"매핑표: KOTE 44라벨 중 {len(KOTE_TO_EMOUR)}개 → Emour 15라벨")
    print(f"매핑 불가로 폐기: {', '.join(UNMAPPED_NOTE)} 등\n")

    items = load_gold(Path(args.gold))
    print(f"골드셋 {len(items)}문장 로드. 모델 로딩 중...")

    clf = pipeline("text-classification", model=MODEL_NAME, top_k=None)
    print("추론 시작 (첫 실행은 모델 다운로드로 시간이 걸립니다)\n")

    preds, unmapped_hits = [], Counter()
    texts = [it["text"] for it in items]

    for i in range(0, len(texts), args.batch):
        chunk = texts[i:i + args.batch]
        outs = clf(chunk, truncation=True, max_length=128)
        for out in outs:
            # 멀티라벨 44개 확률 → Emour 15라벨로 매핑 가능한 것 중 최고 점수
            best_label, best_score = "평범", -1.0
            for d in out:
                mapped = KOTE_TO_EMOUR.get(d["label"])
                if mapped is None:
                    unmapped_hits[d["label"]] += 1
                    continue
                if d["score"] > best_score:
                    best_label, best_score = mapped, d["score"]
            preds.append(best_label)
        print(f"  {min(i+args.batch, len(texts))}/{len(texts)}", end="\r")

    print("\n")

    # ── 채점 ──
    golds = [it["gold"] for it in items]
    pairs = list(zip(golds, preds))
    s = score(pairs)

    records = [
        {**it, "pred": p, "hit": it["gold"] == p}
        for it, p in zip(items, preds)
    ]

    print("=" * 62)
    print("  실험 A — KOTE (문장 단위, 학습 없음)")
    print("=" * 62)
    print(f"  문장 수        : {s['n']}")
    print(f"  정확도         : {s['accuracy']:.3f}")
    print(f"  macro-F1       : {s['macro_f1']:.3f}   ← 주요 지표")
    print(f"  대분류 정확도  : {coarse_accuracy(pairs):.3f}")

    print("\n  ── 서브셋 (LLM 결과와 비교할 것) ──")
    for label, key, val in [
        ("창밖맥락(long_ctx)", "long_ctx", True),
        ("저확신(conf=low)  ", "conf", "low"),
        ("첫 창(맥락 없음)  ", "window_index", 0),
    ]:
        sub = subset_accuracy(records, key, val)
        if sub["n"]:
            print(f"   {label} : n={sub['n']:<4} accuracy={sub['accuracy']:.3f}")

    print("\n  ── 예측 분포 (상위 8개) ──")
    for lab, c in Counter(preds).most_common(8):
        print(f"   {lab:<6} {c:>4}건  ({c/len(preds)*100:.1f}%)")

    print("\n  ── 라벨별 F1 ──")
    for lab in EMOUR_LABELS:
        f1 = s.get("per_label", {}).get(lab, {}).get("f1")
        n = golds.count(lab)
        if n:
            bar = "█" * int((f1 or 0) * 20)
            print(f"   {lab:<6} n={n:<4} F1={(f1 or 0):.2f} {bar}")

    # 결과 저장
    outdir = ROOT / "eval" / "results"
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "kote_result.json").write_text(
        json.dumps({
            "model": MODEL_NAME,
            "gold_file": args.gold,
            **{k: v for k, v in s.items() if k != "records"},
            "coarse_accuracy": coarse_accuracy(pairs),
            "records": records,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n  저장: eval/results/kote_result.json")


if __name__ == "__main__":
    main()
