# -*- coding: utf-8 -*-
"""
저장된 모델을 '현재 test 분할'로 평가만 한다(학습 안 함).

용도: 이전 모델과 새 모델을 **같은 test.csv** 로 평가해 '얼마나 좋아졌는지' 공정 비교.
      (merge_and_split.py 를 새로 돌린 뒤 실행)  run_upgrade.py 가 이 evaluate() 를 재사용한다.

usage:  python eval_model.py <model_dir>
"""
import os, sys
import numpy as np, pandas as pd, torch
from sklearn.metrics import classification_report, f1_score
from transformers import AutoTokenizer, AutoModelForSequenceClassification

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(HERE, "data"))
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)
MAXLEN = int(os.environ.get("MAXLEN", "128"))

LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]
label2id = {l: i for i, l in enumerate(LABELS)}


def load(name):
    df = pd.read_csv(_p(name))
    df["context"] = df.get("context", "").fillna("").astype(str)
    df = df.dropna(subset=["text", "label"])
    df = df[df["label"].isin(LABELS)].copy()
    return df


def _predict(df, tok, model, device, single=False):
    preds = []
    model.eval()
    with torch.no_grad():
        for _, row in df.iterrows():
            ctx = row["context"]
            if (not single) and isinstance(ctx, str) and ctx.strip():
                enc = tok(ctx, row["text"], truncation="longest_first",
                          max_length=MAXLEN, return_tensors="pt")
            else:
                # single=True: 맥락 무시하고 대상만(=배포 단문모델과 동일 조건)
                enc = tok(row["text"], truncation=True, max_length=MAXLEN, return_tensors="pt")
            enc = {k: v.to(device) for k, v in enc.items()}
            preds.append(int(model(**enc).logits.argmax(-1).item()))
    return preds


def _resolve(name):
    """로컬 폴더면 data/ 기준으로, 아니면 HF repo id 로 그대로."""
    if os.path.isabs(name):
        return name
    local = os.path.join(DATA_DIR, name)
    return local if os.path.exists(local) else name


def evaluate(model_dir, single=False):
    """모델 1개를 test.csv/context_test.csv 로 평가 → 지표 dict 반환(출력 안 함).
    single=True 면 맥락 없이 대상 문장만으로 추론(배포 단문모델 기준)."""
    model_dir = _resolve(model_dir)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tok = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir).to(device)

    te = load("test.csv")
    y_true = [label2id[l] for l in te["label"]]
    y_pred = _predict(te, tok, model, device, single=single)
    present = sorted(set(te["label"]))
    ids = [label2id[l] for l in present]
    per = dict(zip(present, f1_score(y_true, y_pred, labels=ids, average=None, zero_division=0)))
    macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    report = classification_report(y_true, y_pred, labels=ids, target_names=present,
                                   digits=3, zero_division=0)
    support = {l: int((te["label"] == l).sum()) for l in present}
    out = {"macro": float(macro), "report": report, "per_label": {k: float(v) for k, v in per.items()},
           "support": support, "n_test": len(te), "ctx_acc": None, "ctx_varied": None}
    try:
        ct = load("context_test.csv")
        if len(ct):
            cp = _predict(ct, tok, model, device, single=single)
            ct = ct.reset_index(drop=True); ct["pred"] = [LABELS[i] for i in cp]
            out["ctx_acc"] = float((ct["pred"] == ct["label"]).mean())
            out["ctx_varied"] = sum(1 for _, g in ct.groupby("text")
                                    if len(g) >= 2 and g["pred"].nunique() > 1)
    except FileNotFoundError:
        pass
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python eval_model.py <model_dir> [--single]")
    single = "--single" in sys.argv
    model_dir = [a for a in sys.argv[1:] if not a.startswith("--")][0]
    m = evaluate(model_dir, single=single)
    print(f"[eval] {model_dir}" + ("  (단문 모드)" if single else "  (맥락 모드)"))
    print("\n[TEST · 실데이터]\n" + m["report"])
    print(f"test macro-F1 (실데이터): {round(m['macro'],4)}")
    if m["ctx_acc"] is not None:
        print(f"[맥락 진단] 정확도 {m['ctx_acc']:.3f} / 맥락따라 예측 바뀐 target {m['ctx_varied']}종")


if __name__ == "__main__":
    main()
