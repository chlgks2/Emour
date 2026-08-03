"""
팀원(또는 외부) HF 모델을 다운로드한 로컬 폴더에서 로드해,
우리 골드셋(gold_dev.jsonl)으로 채점한다.

우리 실험(run_eval.py, run_kote.py)과 같은 지표(macro-F1, 대분류 정확도,
혼동 쌍)를 뽑아서 공정하게 나란히 비교할 수 있게 만드는 게 목적.

사용 전 확인할 것
    1) 먼저 라벨을 확인하세요:
         python -c "from transformers import AutoModelForSequenceClassification as M; \
                    print(M.from_pretrained('models/teammate_model').config.id2label)"
    2) 라벨이 우리 15개(기쁨/설렘/편안/... )와 이름이 정확히 같으면 --label-map 없이 바로 실행
    3) 이름이 다르거나 순서만 다르면 --label-map 으로 직접 매핑 지정
       예) --label-map "행복=기쁨,불안=걱정"  (매핑 안 한 라벨은 원래 이름 그대로 시도)

실행
    python eval/run_hf_model.py --model models/teammate_model --gold eval/gold_dev.jsonl
    python eval/run_hf_model.py --model models/teammate_model --gold eval/gold_dev.jsonl \
        --label-map "행복=기쁨,불안=걱정,분노=화남"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS  # noqa: E402
from app.run_eval import score, coarse_accuracy, subset_accuracy  # noqa: E402

VALID = set(EMOUR_LABELS)


def parse_label_map(s: str) -> dict[str, str]:
    if not s:
        return {}
    out = {}
    for pair in s.split(","):
        pair = pair.strip()
        if not pair:
            continue
        k, v = pair.split("=")
        out[k.strip()] = v.strip()
    return out


def load_gold(path: Path) -> list[dict]:
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
    ap.add_argument("--model", required=True, help="로컬 모델 폴더 경로")
    ap.add_argument("--gold", default="eval/gold_dev.jsonl")
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--label-map", default="", help='예: "행복=기쁨,불안=걱정"')
    args = ap.parse_args()

    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    label_map = parse_label_map(args.label_map)

    print(f"모델 로딩: {args.model}")
    tok = AutoModelForSequenceClassification  # placeholder to keep flake quiet
    model = AutoModelForSequenceClassification.from_pretrained(args.model)
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model.eval()

    id2label = model.config.id2label
    print(f"모델 라벨 {len(id2label)}개: {list(id2label.values())}")

    # 라벨 이름이 우리 15라벨과 얼마나 겹치는지 미리 경고
    model_labels = set(id2label.values())
    mapped_labels = {label_map.get(v, v) for v in model_labels}
    unknown = mapped_labels - VALID
    if unknown:
        print(f"⚠️ 다음 라벨은 Emour 15라벨에 없습니다: {unknown}")
        print("   --label-map 으로 매핑을 지정하세요. 지정 안 하면 해당 예측은 폴백('평범')으로 처리됩니다.\n")

    items = load_gold(Path(args.gold))
    print(f"골드셋 {len(items)}문장 로드. 추론 시작...")

    texts = [it["text"] for it in items]
    preds: list[str] = []

    with torch.no_grad():
        for i in range(0, len(texts), args.batch):
            chunk = texts[i:i + args.batch]
            enc = tokenizer(chunk, truncation=True, padding=True, max_length=64, return_tensors="pt")
            logits = model(**enc).logits
            top = logits.argmax(dim=-1).tolist()
            for idx in top:
                raw_label = id2label[idx]
                mapped = label_map.get(raw_label, raw_label)
                preds.append(mapped if mapped in VALID else "평범")
            print(f"  {min(i + args.batch, len(texts))}/{len(texts)}", end="\r")
    print()

    golds = [it["gold"] for it in items]
    pairs = list(zip(golds, preds))
    s = score(pairs)

    records = [{**it, "pred": p, "hit": it["gold"] == p} for it, p in zip(items, preds)]

    print("\n" + "=" * 62)
    print(f"  외부 모델 평가: {args.model}")
    print("=" * 62)
    print(f"  문장 수        : {s['n']}")
    print(f"  정확도         : {s['accuracy']:.3f}")
    print(f"  macro-F1       : {s['macro_f1']:.3f}   ← 주요 지표")
    print(f"  대분류 정확도  : {coarse_accuracy(pairs):.3f}")

    print("\n  ── 서브셋 ──")
    for label, key, val in [
        ("창밖맥락(long_ctx)", "long_ctx", True),
        ("저확신(conf=low)  ", "conf", "low"),
        ("첫 창(맥락 없음)  ", "window_index", 0),
    ]:
        sub = subset_accuracy(records, key, val)
        if sub["n"]:
            print(f"   {label} : n={sub['n']:<4} accuracy={sub['accuracy']:.3f}")

    print("\n  ── 라벨별 F1 (support>0 만) ──")
    rows = [(lab, v) for lab, v in s["per_label"].items() if v["support"] > 0]
    rows.sort(key=lambda kv: kv[1]["f1"])
    for lab, v in rows:
        bar = "█" * int(v["f1"] * 20)
        print(f"   {lab:<6} n={v['support']:<4} F1={v['f1']:.2f} {bar}")

    if s["top_confusions"]:
        print("\n  ── 자주 틀리는 쌍 ──")
        for pair, cnt in s["top_confusions"]:
            print(f"   {pair:<20} {cnt}회")

    outdir = ROOT / "eval" / "results"
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "teammate_model_result.json").write_text(
        json.dumps({"model": args.model, **{k: v for k, v in s.items()},
                    "coarse_accuracy": coarse_accuracy(pairs), "records": records},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n  저장: eval/results/teammate_model_result.json")


if __name__ == "__main__":
    main()
