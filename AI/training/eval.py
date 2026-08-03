# -*- coding: utf-8 -*-
"""
저장된 모델을 평가한다. (있는 파일만 자동 평가)
  - aihub_val_15label.csv    : AI Hub Validation (독립 평가셋, text/label)
  - couple_eval*_to_review.csv: 커플 채팅 평가셋 (text/model_pred/gold, gold 사용)

usage:  python eval.py <model_dir>
"""
import os, sys, csv, collections
import torch
from sklearn.metrics import classification_report, f1_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification

DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)
LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]

def read_pairs(path, gold_col):
    for enc in ("utf-8-sig", "cp949", "utf-8"):
        try:
            with open(path, encoding=enc) as f:
                rows = list(csv.reader(f))
            out = []
            for r in rows[1:]:
                if len(r) > gold_col and r[0].strip() and r[gold_col].strip() in LABELS:
                    out.append((r[0], r[gold_col].strip()))
            return out
        except (UnicodeDecodeError, FileNotFoundError):
            if not os.path.exists(path): return []
    return []

def predict(model_dir, texts):
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir).to(dev).eval()
    out = []
    with torch.no_grad():
        for i in range(0, len(texts), 64):
            enc = tok(texts[i:i+64], padding=True, truncation=True, max_length=128, return_tensors="pt").to(dev)
            out += [LABELS[x] for x in model(**enc).logits.argmax(-1).cpu().tolist()]
    return out

def score(name, model_dir, pairs):
    if not pairs:
        print(f"[{name}] 파일 없음 → 건너뜀"); return
    texts, gold = [p[0] for p in pairs], [p[1] for p in pairs]
    pred = predict(model_dir, texts)
    labs = sorted(set(gold) | set(pred))
    print(f"\n===== [{name}] n={len(gold)} =====")
    print(f"accuracy {sum(p==g for p,g in zip(pred,gold))/len(gold):.3f} | "
          f"macro-F1 {f1_score(gold,pred,average='macro',labels=labs,zero_division=0):.3f}")
    print(classification_report(gold, pred, labels=labs, digits=3, zero_division=0))

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python eval.py <model_dir>")
    md = _p(sys.argv[1])
    score("AI Hub Validation", md, read_pairs(_p("aihub_val_15label.csv"), 1))
    couple = []
    for f in ("couple_eval_to_review.csv", "couple_eval2_to_review.csv"):
        couple += read_pairs(_p(f), 2)   # gold = 3번째 열
    score("커플 채팅 평가셋", md, couple)

if __name__ == "__main__":
    main()
