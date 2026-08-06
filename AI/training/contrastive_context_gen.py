# -*- coding: utf-8 -*-
"""
대조쌍(contrastive / minimal-pair) 맥락 학습 데이터 생성 — '지름길 학습' 방지용.

■ 왜 필요한가 (핵심)
  기존 합성/실데이터는 target 문장에 감정 단어가 그대로 들어있는 경우가 많다
  (예: 서운함 target 에 "서운", 미안함 target 에 "미안"). 그러면 모델은 맥락(담화)을
  이해하는 게 아니라 '키워드 매칭'만 배운다(= label leakage / shortcut learning).
  → 언어학의 1번(단어) 층위에서 끝나고, 3번(맥락) 을 못 배운다.

  해결: target 에서 감정 단어를 빼고, '오직 맥락(A의 앞말)으로만' 감정이 갈리게 한다.
  같은 target 이 맥락에 따라 다른 label 을 갖도록 배치하면(minimal pair),
  모델은 맥락을 보지 않고는 맞출 수 없다 → 3번을 강제 학습.

■ 두 종류
  1) MINIMAL_PAIRS : 감정 단어 없는 같은 target 을 여러 맥락에 붙여 서로 다른 label.
  2) COUNTERFACTUAL: 감정 단어가 있어도(예: "미안", "고마워") 맥락상 다른 label.
     → "그 단어=그 감정" 이라는 지름길 자체를 깨뜨린다. (반사실 데이터)

■ ⚠️ 사람 검수 강력 권장
  여기 label 은 미묘하다(특히 비꼼/서운). '가장 신경 써서' 검수할 데이터.
  학습 시 이 데이터는 소량이므로 train_context.py 에 넣기 전 여러 번 복제해 신호를 키우는 걸 권장
  (make_context_data.py 의 CONTEXT_DEPENDENT ×20 과 같은 취지).

usage:  python contrastive_context_gen.py [out.csv]   # 기본: data/contrastive_context.csv
출력 컬럼: source, context, text, label, kind, note
"""
import os, sys, csv, collections

DATA_DIR = os.environ.get(
    "EMOUR_DATA_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data"))

# 1) 감정 단어 없는 target → 맥락(A의 말)에 따라 label 이 달라짐
#    (target, [(A의 앞말, label), ...])
MINIMAL_PAIRS = [
 ("됐어", [
   ("내가 다 잘못했어 정말 미안해", "화남"),
   ("무거워 보이는데 내가 들어줄까?", "편안"),
   ("이 메뉴로 시킬까?", "평범"),
 ]),
 ("왜", [
   ("나 오늘은 좀 일찍 들어갈게", "궁금"),
   ("나 사실 너한테 할 말 있어", "당황"),
   ("자기야", "평범"),
 ]),
 ("응...", [
   ("괜찮아? 무슨 일 있었어?", "힘듦"),
   ("이거 이렇게 하는 거 맞지?", "평범"),
   ("나랑 있는 거 재미없어?", "서운함"),
 ]),
 ("그래", [
   ("우리 이제 그만 만나자", "슬픔"),
   ("내일 두 시에 볼까?", "평범"),
   ("내가 미안하다고 몇 번을 말해", "화남"),
 ]),
 ("알겠어", [
   ("앞으로 연락 자주 하자", "평범"),
   ("그럼 오늘은 나 혼자 갈게", "서운함"),
   ("다신 안 늦을게 진짜 약속해", "편안"),
 ]),
 ("진짜?", [
   ("나 로또 1등 됐어", "놀람"),
   ("나 오늘 몸이 좀 안 좋아", "걱정"),
   ("나 사실 네 생일 까먹었어", "서운함"),
 ]),
 ("몰라", [
   ("너 왜 아까부터 아무 말 안 해?", "화남"),
   ("이 문제 답 뭐야?", "평범"),
 ]),
 ("왜 이제 말해", [
   ("나 사실 며칠째 아팠어", "걱정"),
   ("나 저번에 네 선물 잃어버렸어", "화남"),
 ]),
 ("너 진짜", [
   ("짠 이거 너 주려고 준비한 서프라이즈야", "설렘"),
   ("나 또 약속 까먹었어", "화남"),
 ]),
 ("아니야", [
   ("너 나한테 마음 식었지", "당황"),
   ("이 컵 네가 깬 거야?", "평범"),
 ]),
 ("응 나도", [
   ("보고 싶다", "설렘"),
   ("요즘 좀 지치지 않아?", "힘듦"),
 ]),
 ("그럼 어떡해", [
   ("우리 예약 취소됐대 지금 도착했는데", "당황"),
   ("나 몸이 너무 안 좋아", "걱정"),
 ]),
 ("그러게", [
   ("우리 요즘 얼굴 보기 힘드네", "서운함"),
   ("오늘 날씨 진짜 좋다", "평범"),
 ]),
 ("뭐라고", [
   ("나 다음 달에 외국으로 가게 됐어", "놀람"),
   ("우리 잠깐 떨어져 있자", "슬픔"),
 ]),
 ("나 지금 좀 그래", [
   ("무슨 일 있어? 표정이 안 좋아", "힘듦"),
   ("왜 이렇게 말이 없어", "서운함"),
 ]),
 ("왜 그런 말을 해", [
   ("나 없으면 넌 더 편할 거야", "서운함"),
   ("너 오늘 진짜 예뻐 자꾸 보게 돼", "부끄러움"),
 ]),
 ("응 알겠어", [
   ("그럼 이번 주말은 못 보겠다", "서운함"),
   ("여기 이름만 적으면 돼", "평범"),
 ]),
 ("그런 거 아니야", [
   ("너 요즘 나 피하는 거지", "당황"),
   ("혹시 나 때문에 화났어?", "편안"),
 ]),
 ("지금 뭐 하자는 거야", [
   ("나 사실 딴 사람이랑 계속 연락했어", "화남"),
   ("눈 감아봐 놀랄 거 있어", "당황"),
 ]),
 ("괜찮아 나는", [
   ("너 혼자 다 하느라 힘들었지", "힘듦"),
   ("이거 너 다 가져 나는 됐어", "편안"),
 ]),
 ("어떻게 그럴 수가 있어", [
   ("나 사실 네 부탁 잊어버렸어", "화남"),
   ("나 너 위해서 이거 다 준비했어", "놀람"),
 ]),
 ("말을 안 하니까 모르지", [
   ("너 나 서운하게 한 거 몰라?", "당황"),
   ("나 사실 오늘 힘든 일 있었어", "서운함"),
 ]),
]

# 2) 감정 단어가 들어있어도 맥락상 다른 감정 (지름길 깨기 / 반사실)
#    (A의 앞말, target, label, 메모)
COUNTERFACTUAL = [
 ("너 진짜 매번 이런 식이야", "그래 미안하다고 했잖아 됐지?", "화남",
  "'미안' 있지만 사과가 아니라 짜증(비꼼) → 화남"),
 ("이제 와서 챙겨주는 척하네", "네 고마워 참 고마워", "화남",
  "'고마워' 있지만 비꼼 → 화남"),
 ("나 때문에 많이 속상했지", "아니 안 속상해 하나도", "서운함",
  "'안 속상' 이라 말하지만 맥락상 서운함(반어)"),
 ("나 이번에 큰 상 받았어", "좋겠다 너는 참", "서운함",
  "'좋겠다'는 보통 기쁨/부러움이나 여기선 비꼼 섞인 서운함"),
 ("내가 다 알아서 할게 넌 빠져", "그래 잘~ 해봐 아주", "화남",
  "칭찬 어휘('잘')지만 비꼼 → 화남"),
 ("나 사실 너 몰래 이거 준비했어", "뭐야 이런 걸 왜 미안하게", "고마움",
  "'미안'이 들어가지만 실제 감정은 고마움/감동"),
 ("오늘도 못 보겠네 미안", "괜찮아 뭐 늘 그렇지", "서운함",
  "'괜찮아'라 말하지만 체념 섞인 서운함"),
 ("나 너한테 서운한 거 없어 진짜", "근데 왜 표정이 그래", "당황",
  "'서운한 거 없어'가 target 아닌 context. target은 당황 반응"),
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "contrastive_context.csv"
    out = out if os.path.isabs(out) else os.path.join(DATA_DIR, out)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

    rows = []
    for target, ctxs in MINIMAL_PAIRS:
        for a_line, label in ctxs:
            rows.append({
                "source": "contrastive", "context": f"A: {a_line}", "text": target,
                "label": label, "kind": "minimal_pair",
                "note": "감정단어 없는 target — 맥락으로만 판단",
            })
    for a_line, target, label, note in COUNTERFACTUAL:
        rows.append({
            "source": "contrastive", "context": f"A: {a_line}", "text": target,
            "label": label, "kind": "counterfactual", "note": note,
        })

    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["source", "context", "text", "label", "kind", "note"])
        w.writeheader()
        w.writerows(rows)

    # 같은 target 이 몇 개 라벨에 걸치는지(대조성) 요약
    by_target = collections.defaultdict(set)
    for target, ctxs in MINIMAL_PAIRS:
        for _, label in ctxs:
            by_target[target].add(label)

    print(f"대조쌍/반사실 {len(rows)}행 -> {out}")
    print(f"  minimal_pair: {sum(len(c) for _,c in MINIMAL_PAIRS)}행 / target {len(MINIMAL_PAIRS)}종")
    print(f"  counterfactual: {len(COUNTERFACTUAL)}행")
    multi = {t: sorted(ls) for t, ls in by_target.items() if len(ls) >= 2}
    print(f"  같은 문장이 2개 이상 라벨에 걸친 target: {len(multi)}종 (맥락 강제 학습의 핵심)")
    print("검수: 여기 label 은 미묘함 — '가장 신경 써서' 확인. 틀리면 label 직접 수정.")
    print("학습 팁: 소량이므로 train_context.py 에 넣기 전 여러 번 복제해 신호를 키우세요.")


if __name__ == "__main__":
    main()
