"""
저장된 실험 결과(JSON)에서 특정 골드 라벨이 실제로 무엇으로 예측됐는지 확인.
재실행 없이 이미 있는 파일만 읽으므로 비용·시간이 들지 않습니다.

사용
    python eval/check_label.py eval/results/20260803_093207_e4_fewshot.json 당황
"""
import json
import sys
from collections import Counter

path = sys.argv[1]
label = sys.argv[2] if len(sys.argv) > 2 else "당황"

data = json.load(open(path, encoding="utf-8"))
records = data["records"]

target = [r for r in records if r["gold"] == label]
dist = Counter(r["pred"] for r in target)

print(f"골드='{label}' {len(target)}건이 실제로 예측된 라벨 분포:")
for lab, c in dist.most_common():
    marker = " ← 정답" if lab == label else ""
    print(f"  {lab:<8} {c:>3}건{marker}")

# 오답 예시 몇 개 텍스트로 확인
print("\n오답 예시 (최대 6개):")
for r in [r for r in target if r["pred"] != label][:6]:
    print(f'  "{r["text"][:30]}"  → {r["pred"]}')
