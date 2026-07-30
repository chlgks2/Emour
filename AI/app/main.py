"""
FastAPI 앱 본체 (LLM-only).

실행:  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
문서:  http://localhost:8000/docs

설계 2가지:
1) LLM 클라이언트는 서버가 켜질 때 lifespan 에서 1번만 생성 (매 요청마다 새로 안 만듦)
2) LLM 실패 시 502 를 던지지 않는다. service 의 폴백이 계약(N:N)을 지키므로,
   실패해도 백엔드는 정상 응답을 받는다. (핸드오프 §2-4 의 '보장' 준수)
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .config import EMOUR_LABELS, LLM_MODEL, USE_MOCK_LLM
from .llm import OpenAIEmotionLLM
from .mock_llm import MockEmotionLLM
from .schemas import AnalyzeRequest, AnalyzeResponse
from .service import analyze

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# 앱 전역 자원 보관소 (요청마다 클라이언트를 새로 만들면 느려짐)
resources: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("Emour AI (LLM-only) 시작")
    logger.info("모드: %s", "MOCK (비용 0)" if USE_MOCK_LLM else "REAL LLM")
    logger.info("모델: %s", LLM_MODEL)
    logger.info("라벨: %d개 %s", len(EMOUR_LABELS), EMOUR_LABELS)
    logger.info("=" * 50)

    # ⭐ 스위치 하나로 목업/실제 교체. 둘 다 EmotionLLM 약속을 지키므로
    #   아래 service.analyze() 는 어느 쪽이 오든 똑같이 동작합니다.
    if USE_MOCK_LLM:
        resources["llm"] = MockEmotionLLM()
    else:
        resources["llm"] = OpenAIEmotionLLM()

    yield  # ← 여기서 서버가 요청을 받는 상태로 머무름

    resources.clear()
    logger.info("Emour AI 종료")


app = FastAPI(
    title="Emour AI - 감정 분석 (LLM-only)",
    description="커플 대화의 감정을 분석합니다. 초기 버전은 LLM 단독 구성.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["시스템"])
async def health():
    """배포 파이프라인이 '서버가 살아났는가'를 확인하는 용도. 없으면 배포가 무한 대기함."""
    return {
        "status": "ok",
        "mode": "mock" if USE_MOCK_LLM else "llm-only",
        "model": LLM_MODEL,
        "labels": len(EMOUR_LABELS),
    }


@app.get("/labels", tags=["시스템"])
async def labels():
    """서버가 실제로 쓰는 라벨 목록. 백엔드/프론트와의 불일치를 조기에 발견하기 위함."""
    return {"labels": EMOUR_LABELS}


@app.post("/analyze", response_model=AnalyzeResponse, tags=["분석"])
async def analyze_endpoint(req: AnalyzeRequest):
    started = time.perf_counter()
    try:
        result = await analyze(req, llm=resources["llm"])
    except KeyError:
        # lifespan 이 안 돌았을 때(테스트 실수 등)
        raise HTTPException(status_code=503, detail="서버가 아직 준비되지 않았습니다.")
    except Exception as e:  # noqa: BLE001
        # 여기까지 오는 건 폴백으로도 못 막는 진짜 예상 밖 오류일 때만.
        logger.exception("분석 중 예상치 못한 오류")
        raise HTTPException(status_code=500, detail=f"분석 실패: {e}")

    elapsed = (time.perf_counter() - started) * 1000
    logger.info(
        "분석 완료 | context=%d target=%d | %.0fms",
        len(req.context), len(req.target), elapsed,
    )
    return result
