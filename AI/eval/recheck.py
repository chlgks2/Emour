"""
재검사 신뢰도(intra-rater reliability) 측정.

왜 필요한가
    2명이 라벨링했다면 Cohen's kappa 로 '사람 간 일치도'를 낼 수 있지만,
    1인 라벨링에서는 불가능합니다. 대신 시간을 두고 같은 데이터를
    다시 매겨, '자기 자신과의 일치도'를 잽니다.
    이 값이 모델 성능 상한선의 (낙관적) 추정치가 됩니다.

사용법 (2단계)
    1) 표본 뽑기 — 원래 라벨을 지우고 순서를 섞은 파일을 만든다
         python eval/recheck.py make --n 40
       → data/recheck_blank.csv 생성
       → 이 파일의 gold 칸을 다시 채운다 (원본을 절대 보지 말 것)

    2) 채점
         python eval/recheck.py score
       → Cohen's kappa 출력
"""

from __future__ import annotations

import argparse
import csv
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import EMOUR_LABELS  # noqa: E402
from app.normalize import normalize_label  # noqa: E402

VALID = set(EMOUR_LABELS)
SRC = ROOT / "data" / "gold_raw.csv"
BLANK = ROOT / "data" / "recheck_blank.csv"
FILLED = ROOT / "data" / "recheck_blank.csv"  # 같은 파일에 채워 넣습니다


def _norm(raw: str) -> str:
    raw = (raw or "").strip()
    return raw if raw in VALID else (normalize_label(raw) or "")


def make(n: int, seed: int, head: int) -> None:
    """앞부분 head개 중에서 n개를 무작위로 뽑아, 라벨을 비우고 순서를 섞는다."""
    rows = []
    with SRC.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if _norm(r.get("gold", "")):
                rows.append(r)

    pool = rows[:head] if head else rows
    if n > len(pool):
        n = len(pool)

    rng = random.Random(seed)
    picked = rng.sample(pool, n)
    rng.shuffle(picked)  # 원래 대화 순서를 깨뜨려 기억 의존을 줄임

    with BLANK.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["set_id", "idx", "speaker", "text", "gold_2nd"])
        for r in picked:
            w.writerow([r["set_id"], r["idx"], r.get("speaker", ""), r.get("text", ""), ""])

    print(f"✅ {BLANK.relative_to(ROOT)} 생성 ({n}건)")
    print("   → 이 파일의 'gold_2nd' 칸을 다시 채우세요.")
    print("   ⚠️ 원본(gold_raw.csv)을 보지 마세요. 보면 측정이 무의미해집니다.")
    print("   ⚠️ 문맥이 필요하면 대화 원문만 참고하고, 1차 라벨은 절대 보지 마세요.")


def kappa(a: list[str], b: list[str]) -> float:
    """Cohen's kappa — 우연히 일치할 확률을 뺀 '진짜 일치도'."""
    n = len(a)
    if n == 0:
        return 0.0
    po = sum(1 for x, y in zip(a, b) if x == y) / n

    labels = set(a) | set(b)
    pe = 0.0
    for lab in labels:
        pe += (a.count(lab) / n) * (b.count(lab) / n)

    if pe == 1.0:
        return 1.0
    return (po - pe) / (1 - pe)


def score() -> None:
    """1차 라벨과 2차 라벨을 대조해 kappa 계산."""
    # 1차 라벨을 (set_id, idx) 로 찾을 수 있게 적재
    first: dict[tuple[str, str], str] = {}
    with SRC.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            lab = _norm(r.get("gold", ""))
            if lab:
                first[(r["set_id"].strip(), str(r["idx"]).strip())] = lab

    a, b, disagree = [], [], []
    missing = 0
    with FILLED.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            second = _norm(r.get("gold_2nd", ""))
            if not second:
                missing += 1
                continue
            key = (r["set_id"].strip(), str(r["idx"]).strip())
            if key not in first:
                continue
            a.append(first[key])
            b.append(second)
            if first[key] != second:
                disagree.append((r.get("text", ""), first[key], second))

    if missing:
        print(f"⚠️ 아직 안 채운 칸 {missing}건 — 제외하고 계산합니다\n")

    if not a:
        print("❌ 채점할 데이터가 없습니다. gold_2nd 칸을 채웠는지 확인하세요.")
        return

    k = kappa(a, b)
    agree = sum(1 for x, y in zip(a, b) if x == y)

    print("=" * 52)
    print(f"  재검사 표본      : {len(a)}건")
    print(f"  단순 일치        : {agree}건 ({agree/len(a)*100:.1f}%)")
    print(f"  Cohen's kappa    : {k:.3f}   ← 실험 카드에 이 값")
    print("=" * 52)

    if k >= 0.8:
        note = "매우 높음 — 다만 1차 라벨을 기억했을 가능성도 점검"
    elif k >= 0.6:
        note = "양호 — 골드셋으로 사용 가능"
    elif k >= 0.4:
        note = "보통 — 세밀한 감정 분류에서는 흔한 수준"
    else:
        note = "낮음 — 라벨 정의가 모호하다는 신호"
    print(f"  해석: {note}\n")

    if disagree:
        print("  ── 불일치 사례 (라벨링 가이드 보강에 사용) ──")
        for text, f1, f2 in disagree[:15]:
            t = text[:24]
            print(f"   \"{t}\"  1차={f1}  2차={f2}")
        if len(disagree) > 15:
            print(f"   ... 외 {len(disagree)-15}건")
        print()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["make", "score"])
    ap.add_argument("--n", type=int, default=40, help="재검사 표본 수")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--head", type=int, default=200,
                    help="앞에서 몇 건 안에서 뽑을지 (0=전체). 초반 라벨의 기준 표류 점검용")
    args = ap.parse_args()

    if args.cmd == "make":
        make(args.n, args.seed, args.head)
    else:
        score()
