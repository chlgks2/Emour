# 문구 추천(Message Suggestion) 기능의 입출력 스키마.

# 프로덕션 계약
# ------------
# [BE -> AI] POST /v1/messages/suggest
#     message_id  : BE가 이미 발급/저장한 메시지 식별자. AI는 새로 만들지 않고 그대로 돌려준다.
#     speaker_id  : 지금 target_message 를 보내려는 사람의 실제 유저 식별자
#     history     : 최근 대화 (turn마다 실제 화자 식별자 포함)
#     target_message : 스타일을 바꿔 쓸 원본 문구

# [AI -> BE] SuggestResponse
#     message_id 를 그대로 포함해서 돌려준다 -> BE가 원본 메시지와 매핑하는 데 사용.
#     AI 서버는 DB/Redis 어디에도 저장하지 않는다 (무상태). 저장은 BE가 유저의 최종 선택을 받은 뒤 처리.

# 설계 메모
# ---------
# - speaker 를 "me"/"partner" 같은 상대적 라벨이 아니라 실제 유저 식별자(문자열)로 받는다.
#   실제 채팅 DB는 보통 sender_id(진짜 유저 PK/닉네임)로 저장되지, 호출자 관점의 상대적
#   라벨로 저장되지 않기 때문이다. speaker_id 로 "누가 나인지"를 알려주면, 서버 내부에서
#   "나"/"상대"로 변환해 프롬프트를 만든다. (design 확정 전까지는 가정 사항 — 5절 참고)
# - 하루치 대화를 통째로 넣지 않는다. 최근 N턴만 슬라이딩 윈도우로 자른다.
#   (비용/지연/프라이버시 3중 문제. docs/suggest_feature_guide.md 참고)

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

# 프롬프트에 실어 보낼 최근 대화 최대 턴 수. 실험으로 튜닝한 하이퍼파라미터.
MAX_HISTORY_TURNS = 12
MAX_TURN_CHARS = 300
MAX_TARGET_CHARS = 1000


class SuggestionStyle(str, Enum):
    # 추천 스타일 3종.

    # 주의: 내부 식별자는 MBTI 용어를 쓰지 않는다.
    # MBTI 는 UI 라벨(사용자 이해용)일 뿐, 프롬프트/코드에서는
    # '어떤 행동을 하는 문장인가'로 정의해야 모델이 안정적으로 따른다.

    LOGICAL = "logical"        # UI 라벨: "해결형"
    EMPATHETIC = "empathetic"  # UI 라벨: "공감형"
    GENTLE = "gentle"          # UI 라벨: "상냥하게"


# UI 노출용 한글 라벨 (BE/FE가 하드코딩할 필요 없이 응답에 그대로 실어 보냄)
STYLE_LABELS: dict[SuggestionStyle, str] = {
    SuggestionStyle.LOGICAL: "해결형",
    SuggestionStyle.EMPATHETIC: "공감형",
    SuggestionStyle.GENTLE: "상냥하게",
}


class ChatTurn(BaseModel):
    # 대화 한 턴. speaker_id 는 실제 유저 식별자(예: DB user id, 닉네임 등).

    speaker_id: str = Field(..., min_length=1, max_length=100)
    text: str = Field(..., min_length=1)
    sent_at: Optional[datetime] = None

    @field_validator("text")
    @classmethod
    def _truncate(cls, v: str) -> str:
        return v.strip()[:MAX_TURN_CHARS]


class SuggestRequest(BaseModel):
    # [BE -> AI] 문구 추천 요청.

    message_id: str = Field(..., min_length=1, max_length=100, description="BE가 발급한 메시지 식별자. 응답에 그대로 echo됨")
    speaker_id: str = Field(..., min_length=1, max_length=100, description="target_message 를 보내려는 사람(요청자)의 유저 식별자")
    target_message: str = Field(..., min_length=1, max_length=MAX_TARGET_CHARS, description="스타일을 바꿔 쓸 원본 문구")
    history: List[ChatTurn] = Field(default_factory=list, description="최근 대화(시간순 오름차순)")

    # 실험/운영용 오버라이드. BE는 보통 생략하고 서버 기본값(.env)을 쓴다.
    prompt_version: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)

    @field_validator("history")
    @classmethod
    def _window(cls, v: List[ChatTurn]) -> List[ChatTurn]:
        # 최근 N턴만 남긴다. BE가 더 많이 보내도 서버에서 잘라낸다.
        return v[-MAX_HISTORY_TURNS:]

    @property
    def partner_last_message(self) -> Optional[str]:
        # 요청자(speaker_id) 본인이 아닌, 가장 최근 상대방 발화.
        for turn in reversed(self.history):
            if turn.speaker_id != self.speaker_id:
                return turn.text
        return None


class Suggestion(BaseModel):
    # 추천 문구 1건

    style: SuggestionStyle
    label: str
    text: str


class SuggestResponse(BaseModel):
    # [AI -> BE] 문구 추천 응답. AI는 이 응답을 어디에도 저장하지 않는다.

    message_id: str  # 요청의 message_id 를 그대로 echo. BE가 원본 메시지와 매핑하는 키.
    suggestions: List[Suggestion] = Field(default_factory=list)

    # 추천을 생성하지 않은 경우의 사유.
    #   too_short   : 초안이 너무 짧음 (가드레일)
    #   safety      : 민감 내용 감지 (가드레일)
    #   disabled    : SUGGEST_ENABLED=false 로 기능이 꺼져 있음 (킬스위치)
    #   llm_failure : LLM 호출/파싱 실패 (원인 세분화는 하지 않기로 함)
    blocked: bool = False
    block_reason: Optional[Literal["safety", "too_short", "disabled", "llm_failure"]] = None

    # 관측용 메타데이터. 실험 로그와 프로덕션 로그를 같은 형태로 남기기 위함.
    model: Optional[str] = None
    prompt_version: Optional[str] = None
    latency_ms: int = 0
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
