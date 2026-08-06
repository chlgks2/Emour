# -*- coding: utf-8 -*-
"""
라벨링 끝난 CSV들(modify_data/) → 학습용 train/valid/test 로 병합·분할.

■ 왜 이렇게 나누나 (지름길·누수 방지의 핵심)
  - valid / test = '실데이터'만 사용한다. 합성·대조쌍을 평가에 넣으면 macro-F1 이 뻥튀기되고
    '진짜 실력'을 못 본다. 우리가 최종적으로 잘하고 싶은 건 실제 커플 대화이므로 평가도 그걸로.
  - 합성(synthetic) + 대조쌍(contrastive) 은 'train 에만' 넣는다.
  - 대조쌍(minimal_pair)의 '일부 target 그룹'은 통째로 빼서 context_test 로 둔다.
    → 같은 문장·다른 맥락을 학습에서 한 번도 안 본 상태로, '맥락을 쓰는지' 진단(누수 없음).
  - 대조쌍은 소량이므로 train 에서 여러 번 복제(upweight)해 신호를 키운다.

■ 인코딩
  엑셀에서 저장하면 cp949 가 섞인다. utf-8-sig → cp949 → euc-kr 순으로 자동 감지해 읽는다.

■ 출력 (data/)
  train.csv, valid.csv, test.csv, context_test.csv   (컬럼: context, text, label)
  + split_report.txt (분포·구성 요약)

usage:  python merge_and_split.py [modify_data_dir] [out_dir]
env:  TEST_RATIO(0.25) VALID_RATIO(0.15) CONTRASTIVE_UPWEIGHT(5) CONTEXT_TEST_GROUP_RATIO(0.2) SEED(42)
"""
import os, sys, csv, glob, random, collections

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("EMOUR_DATA_DIR", os.path.join(HERE, "data"))

LABELS = ["기쁨","설렘","편안","걱정","놀람","평범","부끄러움","궁금",
          "슬픔","화남","당황","힘듦","고마움","미안함","서운함"]
LSET = set(LABELS)

TEST_RATIO  = float(os.environ.get("TEST_RATIO", "0.25"))
VALID_RATIO = float(os.environ.get("VALID_RATIO", "0.15"))
UPWEIGHT    = int(os.environ.get("CONTRASTIVE_UPWEIGHT", "5"))
REAL_UPWEIGHT = int(os.environ.get("REAL_UPWEIGHT", "1"))  # 실데이터는 목표 도메인 → 복제해 비중↑
CTX_TEST_GROUP_RATIO = float(os.environ.get("CONTEXT_TEST_GROUP_RATIO", "0.2"))
# 띄어쓰기 변형 증강: 학습 데이터에 공백 제거/부분제거 변형본을 추가(붙여쓰기 강건성)
SPACING_AUG  = os.environ.get("SPACING_AUG", "0").lower() in ("1", "true", "yes")
SPACING_DROP = float(os.environ.get("SPACING_DROP", "0.5"))  # 공백 하나를 제거할 확률
SEED = int(os.environ.get("SEED", "42"))
random.seed(SEED)


def drop_spaces(text, p):
    """각 공백(' ')을 확률 p로 제거. 줄바꿈('\\n')·문장부호는 보존."""
    return "".join(c for c in text if not (c == " " and random.random() < p))


def readcsv(path):
    for enc in ("utf-8-sig", "cp949", "euc-kr", "utf-8"):
        try:
            with open(path, encoding=enc) as f:
                return list(csv.DictReader(f))
        except UnicodeDecodeError:
            continue
    raise RuntimeError("decode 실패: " + path)


def categorize(fname):
    n = os.path.basename(fname)
    if n.startswith(("to_label", "done_to_label")):
        return "real"
    if n.startswith("synthetic"):
        return "synthetic"
    if n.startswith("contrastive"):
        return "contrastive"
    return "other"


def clean(rows):
    """유효 라벨 + 필수 컬럼만 남긴다. (context 없으면 '', text/label 필수)"""
    out = []
    for x in rows:
        text = (x.get("text") or "").strip()
        label = (x.get("label") or "").strip()
        if not text or label not in LSET:
            continue
        out.append({
            "context": (x.get("context") or "").strip(),
            "text": text,
            "label": label,
            "kind": (x.get("kind") or "").strip(),  # contrastive 만 값 있음
        })
    return out


def split_real_per_label(real):
    """라벨별로 test/valid/train 비율 분할(희소 라벨도 안전). 1개면 train 으로."""
    by = collections.defaultdict(list)
    for r in real:
        by[r["label"]].append(r)
    tr, va, te = [], [], []
    for label, items in by.items():
        random.shuffle(items)
        n = len(items)
        n_te = int(round(n * TEST_RATIO))
        n_va = int(round(n * VALID_RATIO))
        # 너무 적으면 test/valid 우선순위 낮춤(train 확보)
        if n <= 1:
            n_te = n_va = 0
        elif n <= 3:
            n_te, n_va = 1, 0
        te += items[:n_te]
        va += items[n_te:n_te + n_va]
        tr += items[n_te + n_va:]
    return tr, va, te


def hold_out_contrastive_groups(contrastive):
    """minimal_pair 를 target(text) 그룹으로 묶어 일부 그룹을 context_test 로 뺀다.
    counterfactual 은 전부 train."""
    mp = [r for r in contrastive if r["kind"] == "minimal_pair"]
    cf = [r for r in contrastive if r["kind"] != "minimal_pair"]
    groups = collections.defaultdict(list)
    for r in mp:
        groups[r["text"]].append(r)
    gkeys = list(groups.keys())
    random.shuffle(gkeys)
    n_hold = int(round(len(gkeys) * CTX_TEST_GROUP_RATIO))
    hold_keys = set(gkeys[:n_hold])
    ctx_test, ctx_train = [], []
    for k, items in groups.items():
        (ctx_test if k in hold_keys else ctx_train).extend(items)
    ctx_train += cf
    return ctx_train, ctx_test


def write(path, rows):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["context", "text", "label"])
        w.writeheader()
        for r in rows:
            w.writerow({"context": r["context"], "text": r["text"], "label": r["label"]})


def dist(rows):
    c = collections.Counter(r["label"] for r in rows)
    return " ".join(f"{l}:{c.get(l,0)}" for l in LABELS)


def main():
    mdir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA_DIR, "modify_data")
    odir = sys.argv[2] if len(sys.argv) > 2 else DATA_DIR
    files = sorted(glob.glob(os.path.join(mdir, "*.csv")))
    if not files:
        sys.exit(f"CSV 없음: {mdir}")

    buckets = {"real": [], "synthetic": [], "contrastive": [], "other": []}
    other_files = []
    for p in files:
        cat = categorize(p)
        rows = clean(readcsv(p))
        buckets[cat] += rows
        if cat == "other":
            other_files.append(os.path.basename(p))
        print(f"  {os.path.basename(p)} [{cat}]: 유효 {len(rows)}행")
    if other_files:
        print("\n[주의: 무시됨] 아래 파일은 이름이 규칙에 안 맞아 '학습/평가에서 제외'됩니다:")
        for n in other_files:
            print(f"    - {n}")
        print("  규칙: 실데이터=to_label_* 또는 done_to_label_* / 합성=synthetic_* / 대조쌍=contrastive_*")
        print("  → 파일명을 규칙에 맞게 바꾼 뒤 다시 실행하세요.\n")

    real, syn, con = buckets["real"], buckets["synthetic"], buckets["contrastive"]

    # 1) 실데이터: train/valid/test (평가는 실데이터만)
    real_tr, valid, test = split_real_per_label(real)
    # 2) 대조쌍: 일부 그룹 → context_test, 나머지 → train(복제)
    con_train, context_test = hold_out_contrastive_groups(con)

    # 3) train 구성: 실train + 합성 + 대조쌍(×UPWEIGHT). 중복(context,text)은 실 우선으로 제거
    train, seen = [], set()
    def add(rows, times=1):
        for r in rows:
            key = (r["context"], r["text"])
            if key in seen:
                continue
            seen.add(key)
            for _ in range(times):
                train.append(r)
    add(real_tr, times=REAL_UPWEIGHT)  # 실데이터 train 먼저(우선) — 목표 도메인이라 복제 가중
    add(con_train, times=UPWEIGHT)     # 대조쌍 복제
    add(syn)                           # 합성

    # 띄어쓰기 변형 증강 (학습 데이터에만) — "기분나쁘다" 같은 붙여쓰기 케이스 강건화
    aug_n = 0
    if SPACING_AUG:
        aug = []
        for r in train:
            pt = drop_spaces(r["text"], SPACING_DROP)
            pc = drop_spaces(r["context"], SPACING_DROP)
            if pt != r["text"] or pc != r["context"]:  # 실제로 바뀐 것만 추가
                aug.append({**r, "text": pt, "context": pc})
        train += aug
        aug_n = len(aug)

    random.shuffle(train)

    write(os.path.join(odir, "train.csv"), train)
    write(os.path.join(odir, "valid.csv"), valid)
    write(os.path.join(odir, "test.csv"), test)
    write(os.path.join(odir, "context_test.csv"), context_test)

    lines = []
    def log(s): print(s); lines.append(s)
    log("="*60)
    aug_msg = f" + 띄어쓰기증강 {aug_n}" if SPACING_AUG else ""
    log(f"train {len(train)} (실{len(real_tr)}×{REAL_UPWEIGHT} + 대조쌍×{UPWEIGHT} + 합성{len(syn)}{aug_msg})")
    log(f"valid {len(valid)} (실데이터만)")
    log(f"test  {len(test)} (실데이터만 — 진짜 성능 지표)")
    log(f"context_test {len(context_test)} (대조쌍 held-out — 맥락 사용 진단)")
    log("-"*60)
    log("test 분포:  " + dist(test))
    log("valid 분포: " + dist(valid))
    log("train 분포: " + dist(train))
    log("="*60)
    with open(os.path.join(odir, "split_report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("→ data/train.csv, valid.csv, test.csv, context_test.csv 생성")


if __name__ == "__main__":
    main()
