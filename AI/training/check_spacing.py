# -*- coding: utf-8 -*-
"""
띄어쓰기 강건성 점검 — 같은 말의 '띄움/붙임' 표기를 모델이 같게 예측하는지 확인.

usage:  python check_spacing.py [model_dir]     # 기본: emour-emotion-kcelectra-context
학습(run_upgrade.py) 전후로 돌려서 '붙여쓰기' 케이스가 고쳐졌는지 비교하세요.
"""
import os, sys
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(HERE, "data"))
LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]

# (띄어쓴 표기, 붙여쓴 표기) — 둘의 예측이 같아야 강건한 것
PAIRS = [
    ("기분 나쁘다", "기분나쁘다"),
    ("기분 나빠", "기분나빠"),
    ("짜증 나", "짜증나"),
    ("너무 싫어", "너무싫어"),
    ("정말 고마워", "정말고마워"),
    ("진짜 미안해", "진짜미안해"),
    ("너무 슬퍼", "너무슬퍼"),
    ("보고 싶어", "보고싶어"),
]


def main():
    md = sys.argv[1] if len(sys.argv) > 1 else "emour-emotion-kcelectra-context"
    md = md if os.path.isabs(md) else os.path.join(DATA_DIR, md)
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(md)
    model = AutoModelForSequenceClassification.from_pretrained(md).to(dev).eval()

    def pred(s):
        with torch.no_grad():
            enc = tok(s, return_tensors="pt").to(dev)
            return LABELS[model(**enc).logits.argmax(-1).item()]

    print(f"[모델] {md}\n")
    print(f"  {'띄움':<12}{'예측':<7}| {'붙임':<12}{'예측':<7} 일치?")
    print("  " + "-"*48)
    same = 0
    for a, b in PAIRS:
        pa, pb = pred(a), pred(b)
        ok = "✅" if pa == pb else "❌"
        if pa == pb:
            same += 1
        print(f"  {a:<12}{pa:<7}| {b:<12}{pb:<7} {ok}")
    print(f"\n  일치 {same}/{len(PAIRS)}  (많을수록 띄어쓰기에 강건)")


if __name__ == "__main__":
    main()
