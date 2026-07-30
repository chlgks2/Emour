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
    return dedent(
        """\
        아래는 시간 순서대로 정렬된 커플의 대화입니다.

        # 허용 라벨 (반드시 이 중에서만, 한국어 이름 그대로 선택)
        {labels}

        {tiebreak}
        {policy}
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
        context_block=_format_context(context),
        target_block=_format_target(target),
        n=n,
        last=n - 1,
    )
