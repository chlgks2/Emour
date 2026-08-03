"""
프롬프트 조립 전담 모듈.

llm.py(API 호출)와 분리한 이유: 프롬프트는 가장 자주 고칠 부분이라,
호출 로직과 섞이면 프롬프트 한 줄 고치다 통신 코드를 건드리는 사고가 납니다.
분리해두면 API 키 없이도 프롬프트를 조립해 눈으로 확인할 수 있습니다.

구성 = [라벨 정의 15] + [헷갈리는 쌍 판정 기준] + [평범 규칙] + [단일 라벨 우선순위].
모두 팀 라벨링 가이드 문서를 정본으로 옮긴 것이라, 사람 라벨러와 LLM이
같은 기준으로 판단하게 됩니다(= 나중에 채점·비교가 의미 있어짐).
"""

from textwrap import dedent
from typing import List

from .config import LABEL_DEFINITIONS
from .schemas import ContextMessage, TargetMessage

# 주의: 아래 문자열은 일부러 들여쓰기 없이 씁니다.
# f-string/삼중따옴표 안에서 들여쓰면 실제 프롬프트에 공백이 줄줄이 들어가
# 토큰이 낭비되고 노이즈가 됩니다. (dedent 로 공통 들여쓰기 제거)


SYSTEM_PROMPT = dedent(
    """\
    당신은 한국어 커플 대화에서 각 발화자의 순간 감정을 분류하는 분석기입니다.

    핵심 원칙:
    1. 각 문장의 감정은 그 문장을 말한 사람의 감정입니다. 상대방의 감정이 아닙니다.
    2. 반드시 주어진 허용 라벨 안에서만, 한국어 이름 그대로 선택합니다.
    3. 분석 대상(target) 전부에 대해 빠짐없이 하나씩 라벨을 답합니다.
    4. 반드시 지정된 JSON 형식만 출력합니다. 설명·인사·코드블록을 붙이지 않습니다.
    """
)

# 팀 가이드 §2 "헷갈리는 쌍 판정 기준" 을 그대로 반영.
TIEBREAK_BLOCK = dedent(
    """\
    # 헷갈리는 라벨 판정 기준 (애매하면 아래를 따른다)
    - 당황 ↔ 놀람: 부정 뉘앙스(어이없음)면 당황, 중립적 예상 밖이면 놀람
    - 서운함 ↔ 슬픔: 상대 때문에 섭섭하면 서운함, 상황 자체가 슬프면 슬픔
    - 서운함 ↔ 화남: 섭섭한 정도면 서운함, 공격적·강한 표현이면 화남
    - 힘듦 ↔ 슬픔: 피곤·소진이면 힘듦, 정서적 아픔이면 슬픔
    - 걱정 ↔ 힘듦: 앞일에 대한 근심이면 걱정, 이미 지친 상태면 힘듦
    - 궁금 ↔ 놀람: 정보를 물어보면 궁금, 예상 밖 반응이면 놀람
    - 편안 ↔ 평범: 좋음·안정 신호가 있으면 편안, 신호 자체가 없으면 평범
    - 기쁨 ↔ 설렘: 연애적 기대·두근거림이면 설렘, 일반적 좋음이면 기쁨
    - 수긍("알겠어","응 그래") 자체는 라벨이 아니다: 신호 없으면 평범, 안정 신호 있으면 편안, 톤이 식었으면 서운함
    """
)

# 평범 규칙 + 단일 라벨 우선순위.
POLICY_BLOCK = dedent(
    """\
    # 평범(무감정) 규칙 — 가장 자주 쓰임
    - "ㅇㅇ", "ㅋㅋㅋ", "어", "몇 시야?" 처럼 감정 신호가 뚜렷이 없으면 무조건 "평범".
    - 억지로 다른 라벨을 붙이지 않는다.
    - 단, 앞 맥락 때문에 톤이 실린 경우(예: 다툰 뒤 "ㅇㅇ" = 서운함)는 맥락을 보고 판단한다.

    # 단일 라벨 원칙
    - 한 문장에 감정이 겹쳐도 지금은 하나만 고른다.
    - 우선순위: ① 더 강하게 드러난 감정 → ② 비슷하면 관계신호(미안함·고마움·서운함) 우선.
    """
)


# ── 실험 4: 혼동 쌍 표적 few-shot ──────────────────────────────
# 실험 3 결과에서 상위 혼동이 전부 "X → 평범" 방향이었음:
#   당황→평범 31 / 화남→평범 27 / 편안→평범 26 / 힘듦→평범 19 / 걱정→평범 17
#   추가로 화남→서운함 13 (structured output 이후 새로 등장)
# → 감정 신호가 있는데도 '평범'으로 뭉개는 사례를 교정하는 예시를 넣는다.
#   동시에 '진짜 평범'도 함께 보여줘야 반대 방향 과교정을 막을 수 있다.
#
# USE_FEWSHOT=false 로 끄면 실험 3 상태로 되돌아간다(A/B 비교용).
FEWSHOT_BLOCK = dedent(
    """\
    # 판정 예시 (실제 라벨링 사례)

    맥락) A: "이번 주만 세 번째야"  A: "미안 갑자기 잡혔어"
    [0] B: "알겠어"  → 서운함
    (짧은 수긍이지만 직전에 약속이 밀렸으므로 톤이 실림. 평범 아님)

    맥락) A: "9시 넘을 듯"
    [0] B: "그럼 말고"  → 서운함
    (섭섭함이 억눌린 표현. 공격적이지 않으므로 화남 아님)

    맥락) A: "또 말 바꾸네"
    [0] B: "너는 맨날 그런 식이잖아"  → 화남
    (공격적·직접적 표현이므로 서운함이 아니라 화남)

    맥락) A: "비상 키 조수석에 있어?"
    [0] B: "비상 키가 왜 차 안에 있어"  → 당황
    (어이없음·말문 막힘. 평범 아님)

    맥락) A: "택배 박스 뜯겨 있더라"
    [0] B: "??"  [1] B: "안에 물건 보여?"  → 놀람, 궁금
    (예상 밖 반응은 놀람, 정보를 묻는 건 궁금. 둘 다 평범 아님)

    맥락) A: "팀장님 퇴사하신대"
    [0] B: "후임 안 구해주면 죽음임"  → 힘듦
    (이미 지친 상태. 앞일 근심이면 걱정이지만 여기선 소진에 가까움)

    맥락) A: "입맛 없어서 그냥 자려고"
    [0] B: "밥은 먹어야지"  → 걱정
    (상대를 염려하는 신호가 있음. 평범 아님)

    맥락) A: "지금 출발해"
    [0] B: "응 천천히 와"  → 편안
    (긴장 풀린 온기가 있음. 단순 정보 호응이 아니므로 평범 아님)

    맥락) A: "회의 끝나고 연락할게"
    [0] B: "ㅇㅇ"  → 평범
    (앞 맥락에 불만·거절이 없고 감정 신호도 없음. 억지로 라벨 붙이지 않음)

    맥락) A: "어디서 만나?"
    [0] B: "3번 출구"  → 평범
    (순수 정보 전달)

    맥락) A: "차 키 못 찾겠다"
    [0] A: "아 가방에 있었네 ㅈㅅ"  → 미안함
    ("ㅈㅅ" 는 사과 신호. 당황보다 미안함 우선)

    맥락) A: "주말에 여행 가기로 한 거"
    [0] B: "빨리 가고 싶다"  → 설렘
    (연애적 기대·두근거림. 일반적 좋음이면 기쁨)
    """
)


def _format_labels() -> str:
    return "\n".join(f"- {name}: {desc}" for name, desc in LABEL_DEFINITIONS.items())


def _format_context(context: List[ContextMessage]) -> str:
    if not context:
        return "(이전 대화 없음)"
    return "\n".join(f'{m.speaker}: "{m.text}"' for m in context)


def _format_target(target: List[TargetMessage]) -> str:
    # message_id 대신 0부터의 순번(index)을 노출.
    # 긴 message_id(1024 등)는 LLM이 잘못 옮겨 적기 쉬우므로 짧은 index를 쓰고,
    # 실제 message_id 복원은 파이썬(service.py)이 확실히 처리합니다.
    return "\n".join(f'[{i}] {m.speaker}: "{m.text}"' for i, m in enumerate(target))


def build_user_prompt(
    context: List[ContextMessage],
    target: List[TargetMessage],
) -> str:
    n = len(target)

    # 실험 4: USE_FEWSHOT=true 일 때만 예시 블록을 끼워 넣는다.
    # 실험 5: NO_CONTEXT=true 면 배경 대화를 통째로 비운다(ablation).
    import os

    fewshot = FEWSHOT_BLOCK if os.getenv("USE_FEWSHOT", "false").lower() in ("1", "true", "yes") else ""
    if os.getenv("NO_CONTEXT", "false").lower() in ("1", "true", "yes"):
        context = []

    return dedent(
        """\
        아래는 시간 순서대로 정렬된 커플의 대화입니다.

        # 허용 라벨 (반드시 이 중에서만, 한국어 이름 그대로 선택)
        {labels}

        {tiebreak}
        {policy}
        {fewshot}
        # 배경 대화 (context) — 맥락 이해용일 뿐, 감정을 판단하거나 출력하지 마세요
        {context_block}

        # 분석 대상 (target) — 오직 이 문장들에 대해서만 감정을 판단하세요
        {target_block}

        # 지시
        - 각 문장을 '말한 사람'의 감정 관점에서, 대화 전체 맥락으로 판단하세요.
        - 배경 대화는 흐름 파악용이며, 답에는 target 의 index만 넣으세요.
        - 감정이 뚜렷하지 않으면 "평범"을 선택하세요.

        # 출력 형식 (JSON 객체 하나만)
        {{"emotions": [{{"index": 0, "label": "라벨"}}, {{"index": 1, "label": "라벨"}}]}}

        # ★ 반드시 지킬 것
        - index 0 부터 {last} 까지, 총 {n}개를 빠짐없이 출력하세요.
        - label 은 위 허용 라벨의 한국어 이름과 글자까지 정확히 일치해야 합니다.
        """
    ).format(
        labels=_format_labels(),
        tiebreak=TIEBREAK_BLOCK,
        policy=POLICY_BLOCK,
        fewshot=fewshot,
        context_block=_format_context(context),
        target_block=_format_target(target),
        n=n,
        last=n - 1,
    )
