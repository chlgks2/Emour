
# 평가 하네스(harness) — "여러 방법을 시도했을 때 비교할 수 있게 기록한다"의 실체.

# harness(하네스) = 실험을 똑같은 조건으로 반복 실행해주는 껍데기 코드.

# 무엇을 하나
#     1) 골드셋(정답이 붙은 대화)을 읽는다
#     2) 현재 .env 설정대로 LLM 을 호출해 예측을 얻는다
#     3) 정확도 / 라벨별 F1 / 혼동 쌍 / 폴백률 / 지연 / 토큰·비용을 계산한다
#     4) 결과를 '실험 원장(ledger.csv)'에 한 줄 추가하고, 상세는 JSON 으로 남긴다

# 왜 원장(ledger)인가
#     매번 콘솔에 숫자만 찍으면 비교 힘듬
#     한 줄씩 쌓이는 CSV 하나가 있으면 엑셀로 바로 그래프를 그릴 수 있습니다.

# 실행
#     # 저장소 루트에서
#     export EXP_NAME="v1_baseline_gpt41nano"
#     python eval/run_eval.py --gold eval/gold.sample.jsonl

# 용어
#     accuracy(정확도)  = 맞힌 개수 / 전체.  라벨이 치우쳐 있으면 과대평가됨
#     precision(정밀도) = 그 라벨이라 예측한 것 중 실제로 맞은 비율
#     recall(재현율)    = 실제 그 라벨인 것 중 맞힌 비율
#     F1               = 정밀도와 재현율의 조화평균 (둘 다 좋아야 높음)
#     macro-F1         = 라벨별 F1 의 단순 평균. 희귀 라벨도 똑같이 중요하게 봄
#                        → 감정 분류에선 accuracy 보다 macro-F1 이 훨씬 정직한 지표


from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS, FALLBACK_LABEL  # noqa: E402
from app.metrics import METRICS, estimate_cost_usd    # noqa: E402
from app.providers import build_llm                   # noqa: E402
from app.schemas import AnalyzeRequest                # noqa: E402
from app.service import analyze                       # noqa: E402

RESULTS_DIR = ROOT / "eval" / "results"
LEDGER = RESULTS_DIR / "ledger.csv"


# ─────────────────────────────────────────────────────────────
# 채점
# ─────────────────────────────────────────────────────────────
# 대분류 4그룹 — "세부 감정은 틀려도 방향은 맞았는가"를 보는 보조 지표.
# 골드셋이 작을 때 macro-F1 보다 훨씬 안정적으로 움직입니다.
COARSE_MAP = {
    "기쁨": "긍정", "설렘": "긍정", "편안": "긍정",
    "걱정": "중립", "놀람": "중립", "평범": "중립", "부끄러움": "중립", "궁금": "중립",
    "슬픔": "부정", "화남": "부정", "당황": "부정", "힘듦": "부정",
    "고마움": "관계신호", "미안함": "관계신호", "서운함": "관계신호",
}


def coarse_accuracy(pairs: list[tuple[str, str]]) -> float:
    """대분류 기준 정확도. 라벨을 4그룹으로 묶어 채점."""
    if not pairs:
        return 0.0
    hit = sum(1 for g, p in pairs if COARSE_MAP.get(g) == COARSE_MAP.get(p))
    return round(hit / len(pairs), 4)


def p95(values: list[float]) -> float:
    """상위 5% 지연. 평균은 못 담는 '가끔 느린 경험'을 보여줍니다."""
    if not values:
        return 0.0
    xs = sorted(values)
    idx = min(int(len(xs) * 0.95), len(xs) - 1)
    return round(xs[idx], 1)


def subset_accuracy(records: list[dict], key: str, value=True) -> dict:
    """
    특정 조건(long_ctx / conf=low / 첫 창)을 만족하는 메시지만 골라
    그 부분집합의 정확도를 따로 잰다.

    왜 필요한가
        전체 macro-F1 하나만 보면 "맥락이 실제로 기여하는지"를
        확인할 방법이 없습니다. long_ctx=True 인 것만 따로 떼어
        정확도를 재야 실험 5(맥락 제거)와 비교할 수 있습니다.
    """
    sub = [r for r in records if r.get(key) == value]
    if not sub:
        return {"n": 0, "accuracy": None}
    hit = sum(1 for r in sub if r["hit"])
    return {"n": len(sub), "accuracy": round(hit / len(sub), 4)}


def score(pairs: list[tuple[str, str]]) -> dict:
    """pairs = [(gold, pred), ...] → 지표 묶음."""
    total = len(pairs)
    correct = sum(1 for g, p in pairs if g == p)

    tp: Counter = Counter()
    fp: Counter = Counter()
    fn: Counter = Counter()
    for g, p in pairs:
        if g == p:
            tp[g] += 1
        else:
            fp[p] += 1
            fn[g] += 1

    per_label = {}
    f1s = []
    for lab in EMOUR_LABELS:
        support = tp[lab] + fn[lab]
        prec = tp[lab] / (tp[lab] + fp[lab]) if (tp[lab] + fp[lab]) else 0.0
        rec = tp[lab] / support if support else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        per_label[lab] = {
            "support": support,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
        }
        # support 가 0인 라벨(골드셋에 한 번도 안 나온 라벨)은 macro 평균에서 제외.
        # 안 그러면 안 쓰는 라벨 -> 점수낮음
        if support > 0:
            f1s.append(f1)

    confusion: Counter = Counter()
    for g, p in pairs:
        if g != p:
            confusion[f"{g}→{p}"] += 1

    return {
        "n": total,
        "accuracy": round(correct / total, 4) if total else 0.0,
        "macro_f1": round(sum(f1s) / len(f1s), 4) if f1s else 0.0,
        "per_label": per_label,
        "top_confusions": confusion.most_common(10),
        "pred_distribution": dict(Counter(p for _, p in pairs).most_common()),
        "gold_distribution": dict(Counter(g for g, _ in pairs).most_common()),
    }


# ─────────────────────────────────────────────────────────────
# 실행
# ─────────────────────────────────────────────────────────────
async def run(gold_path: Path, limit: int | None) -> dict:
    cases = []
    with gold_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("//"):
                cases.append(json.loads(line))
    if limit:
        cases = cases[:limit]

    METRICS.reset()
    llm = build_llm()

    pairs: list[tuple[str, str]] = []
    records = []
    t0 = time.perf_counter()

    for case in cases:
        gold_by_id = {
            str(m["message_id"]): m["gold"] for m in case["target"] if "gold" in m
        }
        req = AnalyzeRequest(
            context=case.get("context", []),
            target=[
                {k: v for k, v in m.items() if k != "gold"} for m in case["target"]
            ],
        )
        case_t0 = time.perf_counter()
        result = await analyze(req, llm=llm)
        case_latency_ms = (time.perf_counter() - case_t0) * 1000

        # 어댑터가 만든 target 항목에서 서브셋 분석용 플래그를 그대로 가져옵니다.
        meta_by_id = {str(m["message_id"]): m for m in case["target"]}

        for mid, gold in gold_by_id.items():
            pred = result[mid].emotion
            pairs.append((gold, pred))
            meta = meta_by_id.get(mid, {})
            records.append(
                {
                    "case_id": case.get("case_id"),
                    "message_id": mid,
                    "text": meta.get("text", ""),
                    "gold": gold,
                    "pred": pred,
                    "hit": gold == pred,
                    # ↓ 서브셋 분석용. 없으면 기본값으로 채움 (구버전 골드셋 호환)
                    "conf": meta.get("conf", "high"),
                    "long_ctx": bool(meta.get("long_ctx", False)),
                    "window_index": case.get("window_index", 0),
                    "case_latency_ms": case_latency_ms,
                }
            )

    wall_sec = time.perf_counter() - t0
    metrics = METRICS.snapshot()
    model = os.getenv("LLM_MODEL", "")
    s = score(pairs)

    # ── 서브셋 분리 측정 ──
    # 전체 macro-F1 하나로는 "맥락이 실제로 기여했는가"를 증명 못 합니다.
    # 조건별로 따로 떼어 정확도를 재고, 실험 5(맥락 제거)와 비교할 재료로 씁니다.
    subsets = {
        "long_ctx_subset": subset_accuracy(records, "long_ctx", True),
        "low_conf_subset": subset_accuracy(records, "conf", "low"),
        "first_window_subset": subset_accuracy(records, "window_index", 0),
    }

    return {
        "run_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "exp_name": os.getenv("EXP_NAME", "unnamed"),
        "provider": os.getenv("LLM_PROVIDER", "") or "legacy",
        "model": model,
        "temperature": os.getenv("LLM_TEMPERATURE", ""),
        "structured_output": os.getenv("USE_STRUCTURED_OUTPUT", "false"),
        "gold_file": gold_path.name,
        "n_cases": len(cases),
        "wall_sec": round(wall_sec, 2),
        "avg_latency_ms": metrics["avg_latency_ms"],
        "p95_latency_ms": p95([r["case_latency_ms"] for r in records]),
        "fallback_rate": metrics["fallback_rate"],
        "llm_failure_rate": metrics["llm_failure_rate"],
        "prompt_tokens": metrics["prompt_tokens"],
        "completion_tokens": metrics["completion_tokens"],
        "est_cost_usd": round(
            estimate_cost_usd(
                model, metrics["prompt_tokens"], metrics["completion_tokens"]
            ),
            6,
        ),
        **s,
        "coarse_accuracy": coarse_accuracy(pairs),
        **subsets,
        "records": records,
    }


LEDGER_COLUMNS = [
    "run_id", "exp_name", "provider", "model", "temperature", "structured_output",
    "gold_file", "n", "accuracy", "macro_f1", "coarse_accuracy",
    "fallback_rate", "llm_failure_rate",
    "avg_latency_ms", "p95_latency_ms", "wall_sec",
    "prompt_tokens", "completion_tokens", "est_cost_usd",
    "notes",
]


def append_ledger(res: dict, notes: str) -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    is_new = not LEDGER.exists()
    row = {c: res.get(c, "") for c in LEDGER_COLUMNS}
    row["notes"] = notes
    with LEDGER.open("a", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=LEDGER_COLUMNS)
        if is_new:
            w.writeheader()
        w.writerow(row)


def print_report(res: dict) -> None:
    print("\n" + "=" * 62)
    print(f"  실험: {res['exp_name']}  ({res['run_id']})")
    print(f"  공급자/모델: {res['provider']} / {res['model']}")
    print("=" * 62)
    print(f"  문장 수        : {res['n']}")
    print(f"  정확도         : {res['accuracy']:.3f}")
    print(f"  macro-F1       : {res['macro_f1']:.3f}   ← 주요 지표")
    print(f"  대분류 정확도  : {res['coarse_accuracy']:.3f}   (긍정/중립/부정/관계신호 4그룹)")
    print(f"  폴백률         : {res['fallback_rate']:.3f}  ('{FALLBACK_LABEL}'으로 때운 비율)")
    print(f"  LLM 실패율     : {res['llm_failure_rate']:.3f}")
    print(f"  평균 지연      : {res['avg_latency_ms']:.0f} ms   /   p95 : {res['p95_latency_ms']:.0f} ms")
    print(f"  토큰(in/out)   : {res['prompt_tokens']} / {res['completion_tokens']}")
    print(f"  추정 비용      : ${res['est_cost_usd']:.6f}")

    print("\n  ── 서브셋 분리 측정 (실험 5 재료) ──")
    for label, key in [
        ("창밖맥락(long_ctx)", "long_ctx_subset"),
        ("저확신(conf=low)  ", "low_conf_subset"),
        ("첫 창(맥락 없음)  ", "first_window_subset"),
    ]:
        sub = res[key]
        if sub["n"] == 0:
            print(f"   {label} : n=0 (해당 없음)")
        else:
            print(f"   {label} : n={sub['n']:<4} accuracy={sub['accuracy']:.3f}")

    print("\n  ── 라벨별 F1 (support>0 만) ──")
    rows = [
        (lab, v) for lab, v in res["per_label"].items() if v["support"] > 0
    ]
    rows.sort(key=lambda kv: kv[1]["f1"])
    for lab, v in rows:
        bar = "█" * int(v["f1"] * 20)
        print(f"   {lab:<6} n={v['support']:<4} F1={v['f1']:.2f} {bar}")

    if res["top_confusions"]:
        print("\n  ── 자주 틀리는 쌍 (정답→예측) ──")
        for pair, cnt in res["top_confusions"]:
            print(f"   {pair:<20} {cnt}회")
    print()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gold", default="eval/gold.sample.jsonl")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--notes", default="")
    args = ap.parse_args()

    gold_path = Path(args.gold)
    if not gold_path.is_absolute():
        gold_path = ROOT / gold_path
    if not gold_path.exists():
        sys.exit(f"골드셋을 찾을 수 없습니다: {gold_path}")

    res = asyncio.run(run(gold_path, args.limit))
    print_report(res)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    detail = RESULTS_DIR / f"{res['run_id']}_{res['exp_name']}.json"
    detail.write_text(
        json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    append_ledger(res, args.notes)
    print(f"  상세 결과 : {detail.relative_to(ROOT)}")
    print(f"  실험 원장 : {LEDGER.relative_to(ROOT)}\n")


if __name__ == "__main__":
    main()
