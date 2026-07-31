
# FastAPI 앱 본체 (v2 — 공급자 레지스트리 + /metrics).

# 실행:  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# 문서:  http://localhost:8000/docs

# v1 대비 달라진 점
#   1) if USE_MOCK_LLM 하드코딩 → build_llm() 팩토리로 교체 (공급자 자유 전환)
#   2) /metrics 추가 — 폴백률·지연시간·토큰 사용량을 눈으로 확인

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from .config import EMOUR_LABELS, LLM_MODEL
from .metrics import METRICS, estimate_cost_usd
from .providers import build_llm
from .schemas import AnalyzeRequest, AnalyzeResponse
from .service import analyze

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

resources: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    provider = os.getenv("LLM_PROVIDER", "") or (
        "mock" if os.getenv("USE_MOCK_LLM", "false").lower() in ("1", "true", "yes")
        else "openai"
    )
    logger.info("=" * 50)
    logger.info("Emour AI 시작")
    logger.info("공급자: %s", provider)
    logger.info("모델: %s", LLM_MODEL)
    logger.info("라벨: %d개", len(EMOUR_LABELS))
    logger.info("=" * 50)

    resources["llm"] = build_llm()      # 공급자 교체는 .env 로.
    resources["provider"] = provider
    yield
    resources.clear()
    logger.info("Emour AI 종료")


app = FastAPI(
    title="Emour AI - 감정 분석",
    description="커플 대화의 감정을 분석합니다.",
    version="0.2.0",
    lifespan=lifespan,
    root_path="/ai",
)


@app.get("/health", tags=["시스템"])
async def health():
    return {
        "status": "ok",
        "provider": resources.get("provider", "unknown"),
        "model": LLM_MODEL,
        "labels": len(EMOUR_LABELS),
    }


@app.get("/labels", tags=["시스템"])
async def labels():
    return {"labels": EMOUR_LABELS}


@app.get("/metrics", tags=["시스템"])
async def metrics():
    # 운영 지표 (fallback_rate)
    # 0.2 이상이면 '겉으론 정상, 속으론 고장'

    snap = METRICS.snapshot()
    snap["estimated_cost_usd"] = round(
        estimate_cost_usd(LLM_MODEL, snap["prompt_tokens"], snap["completion_tokens"]), 6
    )
    return snap


@app.post("/metrics/reset", tags=["시스템"])
async def metrics_reset():
    # 실험 하나를 시작하기 전에 0으로.
    METRICS.reset()
    return {"status": "reset"}


@app.post("/analyze", response_model=AnalyzeResponse, tags=["분석"])
async def analyze_endpoint(req: AnalyzeRequest):
    started = time.perf_counter()
    try:
        result = await analyze(req, llm=resources["llm"])
    except KeyError:
        raise HTTPException(status_code=503, detail="서버가 아직 준비되지 않았습니다.")
    except Exception as e:  # noqa: BLE001
        logger.exception("분석 중 예상치 못한 오류")
        raise HTTPException(status_code=500, detail=f"분석 실패: {e}")

    elapsed = (time.perf_counter() - started) * 1000
    logger.info(
        "분석 완료 | context=%d target=%d | %.0fms",
        len(req.context), len(req.target), elapsed,
    )
    return result