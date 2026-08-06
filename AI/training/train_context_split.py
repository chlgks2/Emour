# -*- coding: utf-8 -*-
"""
맥락(context) KcELECTRA 학습 — 미리 나눈 split 사용 + base/warm 비교 + 맥락 진단.

train_context.py 와 토크나이즈/손실은 같지만, 다음이 다르다:
  1) 분할을 안에서 안 한다. merge_and_split.py 가 만든 train/valid/test/context_test 를 그대로 쓴다.
     (valid/test = 실데이터만 → 진짜 성능. 합성·대조쌍은 train 에만.)
  2) 초기 가중치 출처를 고를 수 있다:  --from base | warm
       base : beomi/KcELECTRA-base 에서 새로 (입력형식 단문→문장쌍이라 깔끔)
       warm : 기존 배포모델(chlgks/emour-emotion-kcelectra)에서 이어서 (감정지식 재활용)
             ※ 라벨 순서가 우리와 같음을 확인함 → 헤드까지 그대로 warm-start 가능.
  3) context_test 로 '맥락 진단'을 한다:
       - 정확도
       - 같은 target(문장)이 맥락에 따라 '다른 예측'이 나오는지 (맥락을 실제로 쓰는지)

■ 추론(app/local_model.py)과 반드시 일치시키는 토크나이즈
  context 있음: tok(context, text, truncation="only_first", max_length=128)
  context 없음: tok(text, truncation=True, max_length=128)

usage:
  python train_context_split.py <out_dir> --from base
  python train_context_split.py <out_dir> --from warm
env:  EPOCHS(4) BATCH(16) LR(2e-5) MAXLEN(128) WARM_MODEL(chlgks/emour-emotion-kcelectra)
"""
import os, sys, json, collections
import numpy as np, pandas as pd, torch
from sklearn.metrics import classification_report, f1_score
from datasets import Dataset
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                          TrainingArguments, Trainer, DataCollatorWithPadding)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(HERE, "data"))
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)

BASE_MODEL = "beomi/KcELECTRA-base"
WARM_MODEL = os.environ.get("WARM_MODEL", "chlgks/emour-emotion-kcelectra")
MAXLEN = int(os.environ.get("MAXLEN", "128"))
EPOCHS = float(os.environ.get("EPOCHS", "4"))
BATCH  = int(os.environ.get("BATCH", "16"))
LR     = float(os.environ.get("LR", "2e-5"))
WEIGHT_DECAY = float(os.environ.get("WEIGHT_DECAY", "0.0"))  # 과적합 억제(정규화)
WARMUP_RATIO = float(os.environ.get("WARMUP_RATIO", "0.0"))  # 학습 초반 워밍업 비율

LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]
label2id = {l: i for i, l in enumerate(LABELS)}
id2label = {i: l for l, i in label2id.items()}


def load_split(name):
    df = pd.read_csv(_p(name))
    df["context"] = df.get("context", "").fillna("").astype(str)
    df = df.dropna(subset=["text", "label"])
    df = df[df["label"].isin(LABELS)].copy()
    df["label_id"] = df["label"].map(label2id)
    return df


def make_encoder(tok):
    def encode(row):
        ctx = row["context"]
        if isinstance(ctx, str) and ctx.strip():
            enc = tok(ctx, row["text"], truncation="only_first", max_length=MAXLEN)
        else:
            enc = tok(row["text"], truncation=True, max_length=MAXLEN)
        enc["labels"] = int(row["label_id"])
        return enc
    return encode


def to_ds(df, encode):
    ds = Dataset.from_pandas(df[["context", "text", "label_id"]], preserve_index=False)
    return ds.map(encode, remove_columns=ds.column_names)


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python train_context_split.py <out_dir> [--from base|warm]")
    out_dir = _p(sys.argv[1])
    source = "base"
    if "--from" in sys.argv:
        source = sys.argv[sys.argv.index("--from") + 1]
    init_model = BASE_MODEL if source == "base" else WARM_MODEL
    print(f"[init] source={source}  model={init_model}  device={'cuda' if torch.cuda.is_available() else 'cpu'}")

    tr, va, te = load_split("train.csv"), load_split("valid.csv"), load_split("test.csv")
    ctx_te = load_split("context_test.csv")
    print(f"train {len(tr)} / valid {len(va)} / test {len(te)} / context_test {len(ctx_te)}")

    tok = AutoTokenizer.from_pretrained(init_model)
    enc = make_encoder(tok)
    tr_ds, va_ds, te_ds = to_ds(tr, enc), to_ds(va, enc), to_ds(te, enc)
    ctx_ds = to_ds(ctx_te, enc) if len(ctx_te) else None

    # 클래스 가중치(불균형 보정) — train 기준
    counts = tr["label_id"].value_counts().to_dict()
    present = len([i for i in range(len(LABELS)) if counts.get(i)])
    weights = torch.tensor(
        [(len(tr) / (present * counts[i]) if counts.get(i) else 0.0) for i in range(len(LABELS))],
        dtype=torch.float)

    model = AutoModelForSequenceClassification.from_pretrained(
        init_model, num_labels=len(LABELS), id2label=id2label, label2id=label2id,
        ignore_mismatched_sizes=True)

    class WeightedTrainer(Trainer):
        def compute_loss(self, model, inputs, return_outputs=False, **kw):
            labels = inputs.pop("labels")
            out = model(**inputs)
            loss = torch.nn.functional.cross_entropy(
                out.logits, labels, weight=weights.to(out.logits.device))
            return (loss, out) if return_outputs else loss

    def metrics(p):
        return {"macro_f1": f1_score(p.label_ids, np.argmax(p.predictions, 1),
                                     average="macro", zero_division=0)}

    args = TrainingArguments(
        output_dir=out_dir, num_train_epochs=EPOCHS, per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH * 2, learning_rate=LR, eval_strategy="epoch",
        save_strategy="epoch", load_best_model_at_end=True, metric_for_best_model="macro_f1",
        weight_decay=WEIGHT_DECAY, warmup_ratio=WARMUP_RATIO,
        logging_steps=50, report_to="none", seed=42)
    trainer = WeightedTrainer(
        model=model, args=args, train_dataset=tr_ds, eval_dataset=va_ds,
        processing_class=tok, data_collator=DataCollatorWithPadding(tok), compute_metrics=metrics)
    trainer.train()

    # ── 실데이터 test 평가 (진짜 성능) ──
    pred = trainer.predict(te_ds)
    y = np.argmax(pred.predictions, 1)
    present_labels = sorted(set(te["label"]))
    report = classification_report(
        pred.label_ids, y, labels=[label2id[l] for l in present_labels],
        target_names=present_labels, digits=3, zero_division=0)
    test_macro = f1_score(pred.label_ids, y, average="macro", zero_division=0)
    print("\n[TEST · 실데이터]\n" + report)
    print("test macro-F1 (실데이터):", round(test_macro, 4))

    # ── 맥락 진단 (context_test) ──
    ctx_summary = {}
    if ctx_ds is not None and len(ctx_te):
        cp = trainer.predict(ctx_ds)
        cy = np.argmax(cp.predictions, 1)
        ctx_te = ctx_te.reset_index(drop=True)
        ctx_te["pred"] = [id2label[i] for i in cy]
        acc = float((ctx_te["pred"] == ctx_te["label"]).mean())
        # 같은 target(문장)이 맥락에 따라 다른 예측이 나오는가?
        varied = same = 0
        for tgt, g in ctx_te.groupby("text"):
            if len(g) < 2:
                continue
            (varied := varied + 1) if g["pred"].nunique() > 1 else (same := same + 1)
        ctx_summary = {"accuracy": round(acc, 4),
                       "context_sensitive_targets": varied,
                       "context_ignored_targets": same}
        print("\n[맥락 진단 · context_test]")
        print(f"  정확도: {acc:.3f}")
        print(f"  맥락에 따라 예측이 바뀐 target: {varied}종 (맥락 사용 ✓)")
        print(f"  맥락 무시하고 같은 예측만 한 target: {same}종 (아직 키워드 의존일 수 있음)")

    os.makedirs(out_dir, exist_ok=True)
    trainer.save_model(out_dir); tok.save_pretrained(out_dir)
    with open(os.path.join(out_dir, "eval_report.txt"), "w", encoding="utf-8") as f:
        f.write(f"source={source} init={init_model}\n")
        f.write(f"test_macro_f1={round(test_macro,4)}\n")
        f.write(f"context_diag={json.dumps(ctx_summary, ensure_ascii=False)}\n\n")
        f.write(report + "\n")
    print("\n모델 저장 →", out_dir)
    print("※ 배포: LOCAL_MODEL_PATH=<이 폴더> + LOCAL_USE_CONTEXT=true")


if __name__ == "__main__":
    main()
