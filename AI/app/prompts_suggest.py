# 문구 추천 프롬프트 - 버전 관리.

# 프롬프트를 코드 안에 흩뿌리지 않고 여기 한 곳에 모으고,
# `PROMPT_REGISTRY["v1"]` 처럼 버전 키로 꺼내 쓴다.

# 프롬프트를 수정하면 반드시 새 버전 키를 만든다. 기존 키를 덮어쓰면 과거 실험 결과와 비교가 불가능해진다.

# 실험 결과 (docs/suggest_experiment_report.md 참고): v3 + gpt-4.1 조합을 프로덕션 기본값으로 채택.

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List

from app.schemas_suggest import ChatTurn, SuggestRequest


@dataclass(frozen=True)
class PromptTemplate:
    version: str
    system: str
    build_user: Callable[[SuggestRequest], str]
    # LLM 이 반드시 채워야 하는 JSON 최상위 키
    required_keys: tuple[str, ...] = ("logical", "empathetic", "gentle")


# ---------------------------------------------------------------------------
# 공통 헬퍼
# ---------------------------------------------------------------------------

def _format_history(history: List[ChatTurn], my_speaker_id: str) -> str:
    # 실제 speaker_id 를 요청자 관점의 '나'/'상대'로 변환해 프롬프트에 넣는다.
    if not history:
        return "(대화 기록 없음)"
    lines = []
    for turn in history:
        who = "나" if turn.speaker_id == my_speaker_id else "상대"
        lines.append(f"{who}: {turn.text}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# v1 : 베이스라인
# ---------------------------------------------------------------------------

_V1_SYSTEM = """\
당신은 연인 사이의 메신저 대화에서, 사용자가 이미 써 둔 초안 메시지를
3가지 스타일로 다시 써 주는 한국어 메시지 에디터입니다.

[절대 규칙]
1. 초안에 없는 사실을 만들어내지 마세요. (장소, 시간, 약속, 감정의 원인, 제3자 등)
2. 초안의 핵심 의도를 유지하세요. 질문이면 질문으로, 사과면 사과로, 거절이면 거절로 남깁니다.
3. 실제 메신저에서 쓰는 자연스러운 구어체 한국어로 쓰세요. 문어체, 번역투, 존댓말/반말 혼용 금지.
4. 반말/존댓말은 [최근 대화]에서 사용자가 실제로 쓰던 쪽을 그대로 따릅니다.
5. 상대를 부르는 호칭은 [최근 대화]에 실제로 등장한 것만 쓰고, 없으면 호칭을 넣지 마세요.
6. 각 문구는 1~2문장. 길이는 초안의 0.5~2배를 넘지 않습니다.
7. 이모지는 [최근 대화]에서 두 사람이 실제로 쓰고 있을 때만, 최대 1개.
8. 상대를 비난·조롱·압박하거나, 죄책감을 유발하는 표현을 만들지 마세요.

[스타일 정의]
- logical: 상황 파악과 다음 행동으로 이어지는 문장. 구체적인 질문이나 담백한 제안 중심.
           감정 표현은 절제하되 차갑거나 취조하듯 들리면 안 됩니다.
- empathetic: 감정에 먼저 반응하는 문장. 놀람·걱정·공감을 겉으로 드러내고,
           상대의 감정 자체를 물어봅니다. 해결책 제시는 하지 않습니다.
- gentle: 초안의 내용과 구조를 최대한 그대로 두고 말투만 부드럽고 다정하게 다듬습니다.
           새로운 질문이나 정보를 추가하지 마세요.

[출력 형식]
아래 JSON 객체만 출력하세요. 설명, 인사말, 마크다운 코드펜스(```)를 절대 붙이지 마세요.
{"logical": {"text": "..."}, "empathetic": {"text": "..."}, "gentle": {"text": "..."}}
"""


def _v1_user(req: SuggestRequest) -> str:
    partner_last = req.partner_last_message or "(없음)"
    return f"""\
[최근 대화] (시간순)
{_format_history(req.history, req.speaker_id)}

[상대의 마지막 메시지]
{partner_last}

[내가 보내려는 초안]
{req.target_message}

위 초안을 logical / empathetic / gentle 세 가지 스타일로 다시 써 주세요."""


PROMPT_V1 = PromptTemplate(version="v1", system=_V1_SYSTEM, build_user=_v1_user)


# ---------------------------------------------------------------------------
# v2 : v1 + Few-shot 예시
#      "규칙을 글로 설명"하는 것보다 "예시 1~2개 보여주기"가 스타일 구분을
#      더 확실하게 만드는 경우가 많다. 비용(입력 토큰)이 늘어나는 것이 트레이드오프.
#      실험 결과: mini에는 일부 도움, gpt-4.1에는 유의미한 효과 없음 → v3 채택.
# ---------------------------------------------------------------------------

_V2_SYSTEM = _V1_SYSTEM + """

[예시]
상대의 마지막 메시지: "나 우울해서 빵샀어"
내 초안: "그래? 그랬구나?"
출력:
{"logical": {"text": "무슨 빵 샀어? 좀 먹으니까 기분 좀 풀렸어?"},
 "empathetic": {"text": "무슨 일이야!! 왜 우울해 무슨 일 있었어?"},
 "gentle": {"text": "그랬어? 무슨 일 있었구나. 괜찮아?"}}

상대의 마지막 메시지: "오늘 야근이라 저녁 약속 못 갈 것 같아"
내 초안: "알겠어"
출력:
{"logical": {"text": "알겠어. 몇 시쯤 끝나? 다른 날로 옮길까?"},
 "empathetic": {"text": "헐 또 야근이야? 진짜 힘들겠다ㅠㅠ"},
 "gentle": {"text": "응 알겠어, 무리하지 말고 해"}}
"""

PROMPT_V2 = PromptTemplate(version="v2", system=_V2_SYSTEM, build_user=_v1_user)


# ---------------------------------------------------------------------------
# v3 : v1 + logical/gentle 충돌 방지 규칙  ← 프로덕션 기본값
#
# 실험 근거 (35건 골든셋, judge=claude-sonnet-4-6, docs/suggest_experiment_report.md):
#   gpt-4.1-mini 에서 logical과 gentle이 사실상 동일한 문장으로 나오는 사례가
#   반복 관측됨. 원인 추정: 초안에 실질적인 정보가 없을 때, logical의 "질문하기"와
#   gentle의 "내용 그대로 톤만"이 자연스럽게 같은 결과로 수렴함.
#   v2(few-shot)로도 해결되지 않아 규칙 자체를 강화.
#   gpt-4.1 기준 style_distinct 3.36→3.61, no_hallucination 4.94→4.97 로 개선 확인.
#
# 알려진 한계 (미해결): 초안 자체에 이미 질문이 포함된 경우, logical/gentle이
#   여전히 유사해질 수 있음. "logical = 반드시 질문"이라는 전제 자체에 대해서도
#   이견이 있어 향후 v4(제안형 종결어미 방식)로 재검토 예정.
# ---------------------------------------------------------------------------

_V3_SYSTEM = _V1_SYSTEM + """

[스타일 충돌 방지 - 매우 중요]
logical과 gentle이 비슷한 문장이 되는 것은 가장 흔한 실패입니다. 아래를 반드시 지키세요.

- logical은 초안에 담긴 정보가 부족하더라도, 반드시 상대에게 무언가를 "묻는 질문" 또는
  "구체적인 다음 행동 제안"을 포함해야 합니다. 원래 초안에 없던 질문이라도,
  상황상 자연스럽게 궁금할 만한 것(예: 시점, 방법, 상태)을 하나 만들어 물어보세요.
  단, 절대 규칙 1(사실 날조 금지)은 그대로 지킵니다 — 답을 지어내지 말고 "물어보기"만 하세요.
- gentle은 반대로 질문을 절대 추가하지 않고, 초안의 원래 문장 구조를 유지한 채
  어미와 감탄사만 부드럽게 바꿉니다. logical처럼 새로운 질문이 생기면 안 됩니다.
- 생성 후 스스로 점검하세요: "logical 문구에 물음표(?)가 없다면, gentle과 구분이 안 될 가능성이
  높습니다." 이 경우 logical에 질문을 반드시 추가하세요.
"""

PROMPT_V3 = PromptTemplate(version="v3", system=_V3_SYSTEM, build_user=_v1_user)


PROMPT_REGISTRY: Dict[str, PromptTemplate] = {
    "v1": PROMPT_V1,
    "v2": PROMPT_V2,
    "v3": PROMPT_V3,
}

# 실험 결과에 따라 v3를 프로덕션 기본값으로 채택 (docs/suggest_experiment_report.md 7절)
DEFAULT_PROMPT_VERSION = "v3"


def get_prompt(version: str | None) -> PromptTemplate:
    key = version or DEFAULT_PROMPT_VERSION
    if key not in PROMPT_REGISTRY:
        raise KeyError(f"unknown prompt version: {key} (available: {list(PROMPT_REGISTRY)})")
    return PROMPT_REGISTRY[key]
