# 문구 추천 서비스 레이어.

# 라우터(HTTP)와 LLM 호출을 분리하는 이유:
# - 이 파일은 FastAPI 없이도 import 해서 돌릴 수 있다 -> poc/ 실험 스크립트가 그대로 재사용.
# - 나중에 LLM 게이트웨이가 바뀌어도 라우터는 손대지 않는다.

# 이 서비스는 무상태(stateless)다. DB/Redis 어느 쪽에도 쓰지 않는다.
# 저장은 유저가 3개 중 하나를 선택해 "보내기"를 누른 뒤 BE가 처리한다.

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Optional

from openai import AsyncOpenAI

from app.prompts_suggest import PromptTemplate, get_prompt
from app.schemas_suggest import (
    STYLE_LABELS,
    Suggestion,
    SuggestionStyle,
    SuggestRequest,
    SuggestResponse,
)

logger = logging.getLogger(__name__)

# GMS 게이트웨이가 OpenAI 호환 스펙이라고 가정 (GPT 계열 기준).
# 아니라면 generate_suggestions() 안의 호출부만 갈아끼우면 된다.
GMS_BASE_URL = os.getenv("GMS_BASE_URL", "https://api.openai.com/v1")
GMS_API_KEY = os.getenv("GMS_API_KEY", "")

# 실험 결과(docs/suggest_experiment_report.md) 기준 프로덕션 기본값.
DEFAULT_MODEL = os.getenv("SUGGEST_MODEL", "gpt-4.1")
DEFAULT_TEMPERATURE = float(os.getenv("SUGGEST_TEMPERATURE", "0.7"))
LLM_TIMEOUT_SEC = float(os.getenv("SUGGEST_TIMEOUT_SEC", "8"))

# 킬스위치. LLM_PROVIDER와 같은 발상 — 크레딧을 아끼거나 장애 대응 시,
# 재배포 없이 .env 한 줄 + 컨테이너 재기동만으로 이 기능만 끌 수 있다.
# 꺼져 있으면 LLM을 아예 호출하지 않고 즉시 blocked(disabled) 응답한다.
SUGGEST_ENABLED = os.getenv("SUGGEST_ENABLED", "true").strip().lower() not in (
    "0", "false", "no",
)

_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    # 클라이언트는 프로세스당 1개만 만든다(커넥션 풀 재사용). FastAPI lifespan에서 미리 워밍업해도 된다.
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=GMS_API_KEY,
            base_url=GMS_BASE_URL,
            timeout=LLM_TIMEOUT_SEC,
            max_retries=0,  # 재시도는 아래에서 직접 제어한다
        )
    return _client


# ---------------------------------------------------------------------------
# 가드레일 (1차 필터)
# ---------------------------------------------------------------------------
# 키워드 매칭만으로 위험 신호를 다 잡을 수 없다. 이건 최소한의 1차 방어선이고,
# 실제 서비스에서는 별도 분류 모델 또는 모더레이션 API를 함께 붙여야 한다.
# 여기 걸리면 "AI 추천"이 아니라 앱 차원의 안내 UI로 넘긴다.
_SENSITIVE_PATTERNS = [
    r"죽고\s*싶",
    r"자살",
    r"자해",
    r"때렸|폭행|맞았",
]
_SENSITIVE_RE = re.compile("|".join(_SENSITIVE_PATTERNS))


def screen_input(req: SuggestRequest) -> Optional[str]:
    # 차단 사유를 문자열로 반환. 문제 없으면 None.
    if len(req.target_message.strip()) < 2:
        return "too_short"
    corpus = req.target_message + "\n" + "\n".join(t.text for t in req.history[-4:])
    if _SENSITIVE_RE.search(corpus):
        return "safety"
    return None


# ---------------------------------------------------------------------------
# 응답 파싱
# ---------------------------------------------------------------------------

_FENCE_RE = re.compile(r"^```(?:json)?|```$", re.MULTILINE)


def parse_llm_output(raw: str, template: PromptTemplate) -> dict[str, str]:
    # LLM 원문 -> {style_key: text} 딕셔너리.
    # JSON 모드를 켜도 모델이 코드펜스를 붙이거나 키를 빠뜨리는 일이 있다.
    # 파싱 실패는 '예외 상황'이 아니라 '정상적으로 자주 일어나는 일'로 보고 방어한다.

    cleaned = _FENCE_RE.sub("", raw).strip()
    data: Any = json.loads(cleaned)  # 실패 시 JSONDecodeError -> 호출부에서 재시도

    if not isinstance(data, dict):
        raise ValueError("top-level JSON is not an object")

    result: dict[str, str] = {}
    for key in template.required_keys:
        node = data.get(key)
        if isinstance(node, dict):
            text = node.get("text")
        elif isinstance(node, str):  # 모델이 축약해서 문자열만 준 경우도 수용
            text = node
        else:
            text = None
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"missing or empty key: {key}")
        result[key] = text.strip()
    return result


# ---------------------------------------------------------------------------
# 메인 진입점
# ---------------------------------------------------------------------------

async def generate_suggestions(req: SuggestRequest) -> SuggestResponse:
    # message_id 는 저장하지 않고 응답에 그대로 echo 만 한다.
    # BE 는 이 message_id 로 원본 메시지와 응답을 매핑해서, 유저가 셋 중 하나를
    # 선택했을 때 그 메시지를 최종 확정 저장하면 된다.
    
    started = time.perf_counter()

    if not SUGGEST_ENABLED:
        return SuggestResponse(
            message_id=req.message_id,
            blocked=True,
            block_reason="disabled",
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    block_reason = screen_input(req)
    if block_reason:
        return SuggestResponse(
            message_id=req.message_id,
            blocked=True,
            block_reason=block_reason,  # type: ignore[arg-type]
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    template = get_prompt(req.prompt_version)
    model = req.model or DEFAULT_MODEL
    temperature = req.temperature if req.temperature is not None else DEFAULT_TEMPERATURE

    messages = [
        {"role": "system", "content": template.system},
        {"role": "user", "content": template.build_user(req)},
    ]

    parsed: Optional[dict[str, str]] = None
    usage = None
    last_error: Optional[Exception] = None

    # 최대 2회. 3회 이상은 체감 지연이 너무 커진다(버튼 클릭 UX).
    for attempt in range(2):
        try:
            completion = await get_client().chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                response_format={"type": "json_object"},
                max_tokens=500,
            )
            raw = completion.choices[0].message.content or ""
            parsed = parse_llm_output(raw, template)
            usage = completion.usage
            break
        except Exception as e:  # noqa: BLE001 - 파싱/네트워크/타임아웃 모두 동일 처리
            last_error = e
            logger.warning(
                "suggest attempt %d failed (message_id=%s, model=%s): %s",
                attempt + 1, req.message_id, model, e,
            )

    if parsed is None:
        logger.error("suggest failed message_id=%s: %s", req.message_id, last_error)
        return SuggestResponse(
            message_id=req.message_id,
            blocked=True,
            block_reason="llm_failure",
            model=model,
            prompt_version=template.version,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    suggestions = [
        Suggestion(style=style, label=STYLE_LABELS[style], text=parsed[style.value])
        for style in (SuggestionStyle.LOGICAL, SuggestionStyle.EMPATHETIC, SuggestionStyle.GENTLE)
    ]

    return SuggestResponse(
        message_id=req.message_id,
        suggestions=suggestions,
        model=model,
        prompt_version=template.version,
        latency_ms=int((time.perf_counter() - started) * 1000),
        input_tokens=getattr(usage, "prompt_tokens", None),
        output_tokens=getattr(usage, "completion_tokens", None),
    )