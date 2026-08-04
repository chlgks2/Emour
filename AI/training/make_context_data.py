# -*- coding: utf-8 -*-
"""
맥락(context) 학습용 데이터 생성기.

기존 단문 CSV(text,label)를 입력받아, 추론(AI/app/local_model.py)과 '똑같은 형식'의
문장쌍 학습 데이터(context,text,label)를 만든다.

■ 추론과 맞춰야 하는 형식 (local_model.py._build_context_text 와 동일)
    context = "발화자: 내용" 줄들을 시간 오름차순으로 \n 으로 이어붙인 문자열 (예: "A: 오늘 뭐해\nB: 나 집이야")
    text    = 이번에 감정을 분석할 '대상' 메시지의 원문 (발화자 접두어 없음)
    label   = 대상 메시지의 감정 라벨 1개

■ 만들어지는 데이터 3종류
  1) cold-start (context 비어있음): 첫 메시지 상황. 단문 그대로 → 배포 모델의 '문맥 없을 때' 동작 보존.
  2) 자연스러운 앞대화 덧붙이기: 기존 샘플들에서 1~2줄을 뽑아 앞대화로 붙임(라벨은 대상 그대로).
     → 모델이 '문장쌍 입력 형식'에 익숙해지고, 관계없는 맥락은 무시하도록 학습.
  3) 맥락 의존 예시(소량, 손수 작성): "됐어/응/왜" 처럼 같은 말이 맥락에 따라 감정이 바뀌는 경우.
     → README 의 목표("맥락 의존 감정 개선")를 직접 겨냥한 씨앗 데이터.

⚠️ 진짜 성능 향상은 '실제 커플 대화' 데이터가 쌓여야 나온다. 이 생성기는 형식을 맞추고
   맥락 활용의 '발판'을 까는 용도다. 실데이터 CSV(context,text,label)가 생기면 그걸 우선 사용할 것.

usage:  python make_context_data.py <base.csv(text,label)> <output.csv(context,text,label)>
"""
import os, sys, csv, random, collections

DATA_DIR = os.environ.get(
    "EMOUR_DATA_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"),
)
_p = lambda n: n if os.path.isabs(n) else os.path.join(DATA_DIR, n)

random.seed(42)  # 재현성 (train.py 와 동일한 시드 정신)

SPEAKERS = ["A", "B"]

# 앞대화 없이(cold-start) 둘 비율
COLD_START_RATIO = 0.35
# 앞대화를 붙일 때 줄 수 후보
CONTEXT_LEN_CHOICES = [1, 1, 2, 2, 3]


def build_context_text(lines):
    """lines: [(speaker, text), ...] (시간 오름차순) → "A: ...\nB: ..." 문자열."""
    return "\n".join(f"{spk}: {txt}" for spk, txt in lines)


# ── 3) 맥락 의존 씨앗 데이터 (손수 작성, 소량) ─────────────────────────────
# 같은 대상 문장이라도 앞대화(context)에 따라 감정 라벨이 달라지는 예시.
# (context 줄들, 대상 문장, 라벨)
CONTEXT_DEPENDENT = [
    ([("A", "내가 정말 미안해 내가 잘못했어")], "됐어", "화남"),
    ([("A", "이거 내가 대신 해줄까?")], "됐어 괜찮아", "편안"),
    ([("A", "괜찮아? 무슨 일 있었어?")], "응...", "힘듦"),
    ([("A", "이거 이렇게 하는 거 맞지?")], "응 맞아", "평범"),
    ([("A", "나 오늘 회사에서 진짜 힘들었어")], "왜? 무슨 일인데", "궁금"),
    ([("A", "나 너한테 진짜 서운한 게 있어")], "왜 그래 갑자기", "당황"),
    ([("A", "우리 이번 주말에 여행 갈래?")], "완전 좋지 기대된다", "설렘"),
    ([("A", "나 사실 시험 떨어졌어")], "괜찮아 다음에 잘하면 되지", "편안"),
    ([("A", "너 왜 자꾸 약속 어겨")], "미안해 다음부턴 안 그럴게", "미안함"),
    ([("A", "선물 준비했어 이거 받아")], "헐 이걸 다 준비했어?", "놀람"),
    ([("A", "나 오늘 종일 네 생각했어")], "나도 보고 싶었어", "설렘"),
    ([("A", "그 얘기는 하지 말자")], "알겠어", "평범"),
    ([("A", "너 아까 왜 그렇게 말했어")], "그게 무슨 말이야", "당황"),
    ([("A", "나 요즘 너무 지친다")], "많이 힘들었구나 고생했어", "편안"),
    ([("B", "나 먼저 잘게"), ("A", "잘 자 내일 봐")], "응 잘 자", "평범"),
]


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: python make_context_data.py <base.csv> <output.csv>")
    base_p, out_p = _p(sys.argv[1]), _p(sys.argv[2])

    # 원본 단문 (text, label) 로드
    base = []
    with open(base_p, encoding="utf-8-sig") as f:
        r = csv.reader(f)
        next(r)  # header
        for x in r:
            if len(x) >= 2 and x[0].strip() and x[1].strip():
                base.append((x[0].strip(), x[1].strip()))
    if not base:
        sys.exit(f"입력이 비었습니다: {base_p}")

    texts_pool = [t for t, _ in base]
    rows = []  # (context, text, label)

    for text, label in base:
        if random.random() < COLD_START_RATIO:
            # 1) cold-start: 맥락 없음
            rows.append(("", text, label))
            continue

        # 2) 자연스러운 앞대화 붙이기 (라벨은 대상 그대로)
        n = random.choice(CONTEXT_LEN_CHOICES)
        ctx_lines = []
        # 대상 발화자를 B 로 두고, 앞대화는 마지막이 A 로 끝나도록 번갈아 배치
        # (자연스러운 턴교대: ... A / (target=B))
        for i in range(n):
            spk = "A" if (n - i) % 2 == 1 else "B"
            ctx_lines.append((spk, random.choice(texts_pool)))
        rows.append((build_context_text(ctx_lines), text, label))

    # 3) 맥락 의존 씨앗 (여러 번 복제해 비중 확보)
    for ctx_lines, text, label in CONTEXT_DEPENDENT:
        for _ in range(20):  # 소량이라 반복으로 학습 신호 강화
            rows.append((build_context_text(ctx_lines), text, label))

    random.shuffle(rows)

    with open(out_p, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["context", "text", "label"])
        w.writerows(rows)

    cold = sum(1 for c, _, _ in rows if not c)
    print(f"총 {len(rows)}행 (cold-start {cold} / with-context {len(rows) - cold}) → {out_p}")
    for l, c in collections.Counter(lab for _, _, lab in rows).most_common():
        print(f"  {l}: {c}")


if __name__ == "__main__":
    main()
