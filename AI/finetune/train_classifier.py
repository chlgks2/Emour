"""
실험 B — KcELECTRA 파인튜닝 (문장 단위 15라벨 분류기)

무엇을 증명하려는 실험인가
    "데이터가 부족해서 파인튜닝을 안 했습니다" 는 주장이고,
    "175건으로 돌려보니 train 0.9x / test 0.3x 로 과적합이 확인됐습니다" 는 증거입니다.
    → 성능이 낮게 나오는 게 정상이고, 그 격차가 결과물입니다.

모델 저장 규칙 (중요)
    학습마다 폴더를 따로 만듭니다.  models/kcelectra_n175/
    이 폴더가 곧 'A′' 이며, 추론할 때는 언제나 여기서 로드합니다.
    재학습할 때는 A′ 가 아니라 항상 A(beomi/KcELECTRA-base)에서 다시 시작합니다.
    → 그래야 데이터 크기별 비교 곡선이 의미를 가집니다.

실행
    python finetune/train_classifier.py --csv data/gold_raw.csv --n 175
    python finetune/train_classifier.py --csv data/gold_raw.csv --n 50   # 곡선용
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS          # noqa: E402
from app.normalize import normalize_label    # noqa: E402

BASE_MODEL = "beomi/KcELECTRA-base"          # ← 이것이 'A'
LABEL2ID = {lab: i for i, lab in enumerate(EMOUR_LABELS)}
ID2LABEL = {i: lab for lab, i in LABEL2ID.items()}


def load_data(csv_path: Path):
    """CSV → (텍스트, 라벨id) 리스트. 라벨은 15라벨로 정규화."""
    import csv as _csv

    valid = set(EMOUR_LABELS)
    texts, labels = [], []
    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        for r in _csv.DictReader(f):
            raw = (r.get("gold") or "").strip()
            text = (r.get("text") or "").strip()
            if not raw or not text:
                continue
            lab = raw if raw in valid else (normalize_label(raw) or "")
            if lab not in valid:
                continue
            texts.append(text)
            labels.append(LABEL2ID[lab])
    return texts, labels


def stratified_split(texts, labels, test_size=0.2, seed=42):
    """라벨 비율을 유지하며 나눈다. support 1건짜리 라벨도 죽지 않게 처리."""
    from collections import defaultdict
    import random

    rng = random.Random(seed)
    by_label = defaultdict(list)
    for i, y in enumerate(labels):
        by_label[y].append(i)

    tr_idx, te_idx = [], []
    for y, idxs in by_label.items():
        rng.shuffle(idxs)
        k = int(len(idxs) * test_size)
        if len(idxs) >= 2:
            k = max(1, k)          # 2건 이상이면 최소 1건은 test 로
        te_idx += idxs[:k]
        tr_idx += idxs[k:]

    pick = lambda ii: ([texts[i] for i in ii], [labels[i] for i in ii])  # noqa: E731
    return pick(tr_idx), pick(te_idx)


def macro_f1(y_true, y_pred) -> float:
    from sklearn.metrics import f1_score
    return float(f1_score(y_true, y_pred, average="macro", zero_division=0))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--n", type=int, default=0, help="학습에 쓸 건수 (0=전부). 곡선 실험용")
    ap.add_argument("--epochs", type=int, default=5)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--lr", type=float, default=3e-5)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--outdir", default=None)
    args = ap.parse_args()

    import torch
    from torch.utils.data import Dataset
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    set_seed(args.seed)

    texts, labels = load_data(Path(args.csv))
    (tr_x, tr_y), (te_x, te_y) = stratified_split(texts, labels, seed=args.seed)

    # 데이터 크기별 곡선을 그리려면 train 만 잘라냅니다. test 는 항상 동일해야
    # 비교가 성립합니다.
    if args.n and args.n < len(tr_x):
        tr_x, tr_y = tr_x[:args.n], tr_y[:args.n]

    n_train = len(tr_x)
    outdir = Path(args.outdir or f"models/kcelectra_n{n_train}")
    print(f"train {n_train}건 / test {len(te_x)}건 → {outdir}")

    tok = AutoTokenizer.from_pretrained(BASE_MODEL)

    class DS(Dataset):
        def __init__(self, xs, ys):
            self.enc = tok(xs, truncation=True, max_length=64, padding="max_length")
            self.ys = ys

        def __len__(self):
            return len(self.ys)

        def __getitem__(self, i):
            item = {k: torch.tensor(v[i]) for k, v in self.enc.items()}
            item["labels"] = torch.tensor(self.ys[i])
            return item

    # ⭐ 매번 A(BASE_MODEL)에서 새로 시작합니다. A′ 를 이어받지 않습니다.
    model = AutoModelForSequenceClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(EMOUR_LABELS),
        label2id=LABEL2ID,     # ← 저장해두면 추론 시 숫자→한글 변환이 자동
        id2label=ID2LABEL,
    )

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=str(outdir / "_ckpt"),
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch,
            per_device_eval_batch_size=32,
            learning_rate=args.lr,
            logging_steps=10,
            save_strategy="no",       # 중간 체크포인트 안 남김 (디스크 절약)
            report_to=[],
            seed=args.seed,
        ),
        train_dataset=DS(tr_x, tr_y),
    )
    trainer.train()

    def evaluate(xs, ys):
        preds = trainer.predict(DS(xs, ys)).predictions.argmax(-1)
        return macro_f1(ys, preds), float((preds == np.array(ys)).mean()), preds

    tr_f1, tr_acc, _ = evaluate(tr_x, tr_y)
    te_f1, te_acc, te_pred = evaluate(te_x, te_y)

    # ── 저장 (여기서 A′ 가 파일로 남습니다) ──
    outdir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(outdir)
    tok.save_pretrained(outdir)

    result = {
        "base_model": BASE_MODEL,
        "n_train": n_train,
        "n_test": len(te_x),
        "epochs": args.epochs,
        "seed": args.seed,
        "train_macro_f1": round(tr_f1, 4),
        "train_accuracy": round(tr_acc, 4),
        "test_macro_f1": round(te_f1, 4),
        "test_accuracy": round(te_acc, 4),
        "overfit_gap_f1": round(tr_f1 - te_f1, 4),   # ← 이 숫자가 발표 결과물
        "model_path": str(outdir),
    }
    (outdir / "result.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 실험 원장에 한 줄 추가
    import csv as _csv
    ledger = Path("eval/results/finetune_ledger.csv")
    ledger.parent.mkdir(parents=True, exist_ok=True)
    new = not ledger.exists()
    with ledger.open("a", encoding="utf-8-sig", newline="") as f:
        w = _csv.DictWriter(f, fieldnames=list(result.keys()))
        if new:
            w.writeheader()
        w.writerow(result)

    print("\n" + "=" * 52)
    print(f"  train  macro-F1 {tr_f1:.3f}  /  acc {tr_acc:.3f}")
    print(f"  test   macro-F1 {te_f1:.3f}  /  acc {te_acc:.3f}")
    print(f"  과적합 격차      {tr_f1 - te_f1:.3f}   ← 발표 결과물")
    print("=" * 52)
    print(f"\n✅ 모델 저장 완료 (= A′): {outdir}")
    print(f"   추론할 때는 반드시 이 경로에서 로드하세요:")
    print(f"     AutoModelForSequenceClassification.from_pretrained('{outdir}')")


if __name__ == "__main__":
    main()
