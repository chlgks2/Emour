"""
실험 1의 나머지 두 기준선(전부 '평범' / 무작위 15라벨)을
LLM 호출 없이 골드셋만으로 즉시 계산.

이미 gold_dev.jsonl 에 정답이 있으므로, 서버를 안 띄워도
"항상 평범을 예측했다면" 같은 가상의 채점을 계산할 수 있습니다.

실행
    python eval/baseline.py
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.run_eval import score, coarse_accuracy  # noqa: E402

random.seed(42)
LABELS15 = ["기쁨", "설렘", "편안", "걱정", "놀람", "평범", "부끄러움", "궁금",
            "슬픔", "화남", "당황", "힘듦", "고마움", "미안함", "서운함"]


def load_gold(path: str) -> list[str]:
    gold = []
    for line in Path(path).open(encoding="utf-8"):
        case = json.loads(line)
        for m in case["target"]:
            if "gold" in m:
                gold.append(m["gold"])
    return gold


def report(name: str, gold: list[str], preds: list[str]) -> None:
    pairs = list(zip(gold, preds))
    s = score(pairs)
    print(f"\n[{name}]  n={s['n']}")
    print(f"  accuracy   = {s['accuracy']:.4f}")
    print(f"  macro-F1   = {s['macro_f1']:.4f}   ← 실험 카드에 이 값을 적으세요")
    print(f"  대분류acc  = {coarse_accuracy(pairs):.4f}")


if __name__ == "__main__":
    gold = load_gold("eval/gold_dev.jsonl")
    print(f"골드셋 메시지 수: {len(gold)}")

    report("전부 '평범'", gold, ["평범"] * len(gold))
    report("무작위 15라벨", gold, [random.choice(LABELS15) for _ in gold])
