"""
입출력 스키마 — 핸드오프 계약 §2-3, §2-4 를 그대로 코드화.

⭐ 이 파일은 하이브리드(KOTE+LLM) 최종본과 동일하게 유지합니다.
   나중에 KOTE를 붙여도 백엔드는 아무것도 고칠 필요가 없습니다.
"""

from typing import Dict, List

from pydantic import BaseModel, Field

from .config import MAX_CONTEXT, MAX_TARGET


class ContextMessage(BaseModel):
    """읽기전용 배경 메시지. 맥락 이해에만 쓰고 감정은 반환하지 않음. message_id 불필요."""

    speaker: str = Field(..., description="발화자 (예: 'A' / 'B')")
    text: str = Field(..., description="메시지 내용")


class TargetMessage(BaseModel):
    """이번에 감정을 분석할 대상 메시지. message_id 필수(응답 키가 됨)."""

    message_id: int = Field(..., description="원본 메시지 고유 ID (결과 매칭 키)")
    speaker: str = Field(..., description="발화자")
    text: str = Field(..., description="메시지 내용")


class AnalyzeRequest(BaseModel):
    context: List[ContextMessage] = Field(
        default_factory=list,
        max_length=MAX_CONTEXT,  # 계약: 최대 10개
        description="같은 방의 직전 분석 완료 메시지들. 시간 오름차순. 없으면 [].",
    )
    target: List[TargetMessage] = Field(
        ...,
        min_length=1,            # 0개면 백엔드가 호출하지 않기로 약속
        max_length=MAX_TARGET,   # 계약: 최대 10개
        description="이번에 분석할 메시지들. 시간 오름차순. message_id 필수.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "context": [
                    {"speaker": "A", "text": "안녕"},
                    {"speaker": "B", "text": "안녕~"},
                ],
                "target": [
                    {"message_id": 101, "speaker": "A", "text": "오늘 뭐해?"},
                    {"message_id": 102, "speaker": "B", "text": "공강이야~"},
                ],
            }
        }
    }


class EmotionResult(BaseModel):
    """
    감정 결과 1건. emotion 값은 한국어 라벨(예: '궁금').
    지금은 emotion 하나뿐이지만, MVP2에서 dist 등을 추가할 때
    필드만 덧붙이면 되도록 객체로 감쌉니다. (전방 호환)
    """

    emotion: str = Field(..., description="확정된 감정 한국어 라벨 1개 (예: '궁금')")


# 응답 형태 §2-4: { "<message_id>": {"emotion": "궁금"} }
AnalyzeResponse = Dict[str, EmotionResult]
