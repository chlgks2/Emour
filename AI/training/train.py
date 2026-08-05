# -*- coding: utf-8 -*-
"""
KcELECTRA 파인튜닝 (15라벨, 클래스 불균형 가중손실, macro-F1 평가).

usage:  python train.py <train.csv> <output_model_dir>
GPU 권장 (없으면 CPU로 느리게 동작).
"""
import os, sys
import numpy as np, pandas as pd, torch
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
from datasets import Dataset
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                          TrainingArguments, Trainer, DataCollatorWithPadding)

DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)

MODEL = "beomi/KcELECTRA-base"
MAX_LEN, EPOCHS, BATCH, LR = 128, 4, 16, 2e-5
LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]
label2id = {l: i for i, l in enumerate(LABELS)}
id2label = {i: l for l, i in label2id.items()}

def main():
    if len(sys.argv) < 3:
        sys.exit("usage: python train.py <train.csv> <output_model_dir>")
    csv_path, out_dir = _p(sys.argv[1]), _p(sys.argv[2])

    df = pd.read_csv(csv_path).dropna().drop_duplicates(subset=["text"])
    df = df[df["label"].isin(LABELS)].copy()
    df["label_id"] = df["label"].map(label2id)
    present = sorted(df["label"].unique())
    print("라벨:", present)

    tr, tmp = train_test_split(df, test_size=0.2, stratify=df["label_id"], random_state=42)
    va, te = train_test_split(tmp, test_size=0.5, stratify=tmp["label_id"], random_state=42)
    print(f"train {len(tr)} / valid {len(va)} / test {len(te)}")

    tok = AutoTokenizer.from_pretrained(MODEL)
    to_ds = lambda d: Dataset.from_dict({"text": d["text"].tolist(), "labels": d["label_id"].tolist()}) \
        .map(lambda b: tok(b["text"], truncation=True, max_length=MAX_LEN), batched=True)
    tr_ds, va_ds, te_ds = to_ds(tr), to_ds(va), to_ds(te)

    counts = tr["label_id"].value_counts().to_dict()
    weights = torch.tensor([(len(tr)/(len(present)*counts[i]) if counts.get(i) else 0.0)
                            for i in range(len(LABELS))], dtype=torch.float)

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL, num_labels=len(LABELS), id2label=id2label, label2id=label2id)

    class WeightedTrainer(Trainer):
        def compute_loss(self, model, inputs, return_outputs=False, **kw):
            labels = inputs.pop("labels")
            out = model(**inputs)
            loss = torch.nn.functional.cross_entropy(out.logits, labels, weight=weights.to(out.logits.device))
            return (loss, out) if return_outputs else loss

    def metrics(p):
        return {"macro_f1": f1_score(p.label_ids, np.argmax(p.predictions, 1), average="macro", zero_division=0)}

    args = TrainingArguments(
        output_dir=out_dir, num_train_epochs=EPOCHS, per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH*2, learning_rate=LR, eval_strategy="epoch",
        save_strategy="epoch", load_best_model_at_end=True, metric_for_best_model="macro_f1",
        logging_steps=100, report_to="none")
    trainer = WeightedTrainer(model=model, args=args, train_dataset=tr_ds, eval_dataset=va_ds,
        processing_class=tok, data_collator=DataCollatorWithPadding(tok), compute_metrics=metrics)
    trainer.train()

    pred = trainer.predict(te_ds); y = np.argmax(pred.predictions, 1)
    print("\n" + classification_report(pred.label_ids, y, labels=[label2id[l] for l in present],
          target_names=present, digits=3, zero_division=0))
    print("test macro-F1:", round(f1_score(pred.label_ids, y, average="macro", zero_division=0), 4))
    trainer.save_model(out_dir); tok.save_pretrained(out_dir)
    print("모델 저장 →", out_dir)

if __name__ == "__main__":
    main()
