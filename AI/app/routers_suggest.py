# 문구 추천 라우터.

# 기존 감정 분석 서버(src/app/main.py)의 lifespan/앱 인스턴스에
# `app.include_router(suggest_router)` 로 붙이면 된다.

# 호출 경로 가정: FE -> BE -> 이 서버 (내부망). GMS API 키가 이 서버 밖으로
# 나가지 않도록, 이 서버는 EC2 보안 그룹/도커 네트워크에서 외부에 노출하지 않고
# BE 컨테이너만 접근 가능하게 설정하는 것을 권장한다.

# 인증: INTERNAL_API_KEY 를 .env 에 설정하면 X-Internal-Api-Key 헤더를 검증한다.
#       설정하지 않으면 검증을 건너뛴다 (내부망 신뢰 모드).
#       실제 인증 방식이 정해지면 이 부분만 교체하면 된다.

from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException

from app.schemas_suggest import SuggestRequest, SuggestResponse
from app.services_suggest import generate_suggestions

router = APIRouter(prefix="/v1/messages", tags=["suggest"])

_INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")  # 비어 있으면 인증 스킵


def _verify_internal_caller(x_internal_api_key: str | None = Header(default=None)) -> None:
    if not _INTERNAL_API_KEY:
        return  # 인증 미설정 상태 - 내부망 신뢰
    if x_internal_api_key != _INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="invalid internal api key")


@router.post("/suggest", response_model=SuggestResponse)
async def suggest_message(
    req: SuggestRequest,
    x_internal_api_key: str | None = Header(default=None),
) -> SuggestResponse:
    """BE가 '문구 추천' 버튼 클릭 시 호출한다.

    이 엔드포인트는 아무것도 저장하지 않는다 (무상태). BE는 응답의 message_id로
    원본 메시지를 찾아 매핑하고, 유저가 셋 중 하나를 선택해 전송하면 그때 저장한다.

    실패해도 500을 던지지 않고 blocked=true 로 200을 내려준다.
    BE/FE 입장에서 "추천을 못 만들었어요"는 에러가 아니라 하나의 정상 상태다.
    """
    _verify_internal_caller(x_internal_api_key)
    try:
        return await generate_suggestions(req)
    except KeyError as e:  # 알 수 없는 prompt_version 등 명백한 클라이언트 오류
        raise HTTPException(status_code=400, detail=str(e)) from e
