
# LLM 공급자(provider) 레지스트리 — "환경변수 하나로 갈아끼우기".

# 왜 필요한가
#     기존 config 는 boolean이라 표현 한계. 
#     모델까지 비교하려면 '이름' 표현 필수

# 핵심 아이디어 — OpenAI 호환(compatible) 엔드포인트
#     요즘 대부분의 LLM 서비스가 OpenAI와 똑같은 HTTP 규격(/v1/chat/completions)을 지원
#     → 공급자마다 클래스를 새로 만들 필요 X

#     provider          LLM_BASE_URL 예시
#     ─────────────────────────────────────────────────────────────
#     openai            (비움 = 기본값 https://api.openai.com/v1)
#     gemini            https://generativelanguage.googleapis.com/v1beta/openai/
#     upstage(solar)    https://api.upstage.ai/v1
#     openrouter        https://openrouter.ai/api/v1
#     ollama(로컬)       http://localhost:11434/v1
#     vllm(자체호스팅)    http://localhost:8000/v1

# 사용법 (.env)
#     LLM_PROVIDER=mock          # 평소: 토큰 0
#     LLM_PROVIDER=openai        # 실제 호출
#     LLM_PROVIDER=openai_compatible
#       + LLM_BASE_URL=...  + LLM_API_KEY=...  + LLM_MODEL=...

import json
import logging
import os
import time
from typing import Dict, List

from .config import (
    LLM_MAX_RETRIES,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    OPENAI_API_KEY,
    EMOUR_LABELS,
)
from .interfaces import EmotionLLM
from .metrics import METRICS
from .prompt import SYSTEM_PROMPT, build_user_prompt
from .schemas import ContextMessage, TargetMessage

logger = logging.getLogger(__name__)

LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "").strip().lower()
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "").strip()
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip() or OPENAI_API_KEY
# 'strict structured outputs' = 응답 JSON의 형태를 스키마로 강제하는 기능.
# 켜면 모델이 허용 라벨(enum) 밖의 값을 아예 만들 수 X.
USE_STRUCTURED_OUTPUT: bool = os.getenv("USE_STRUCTURED_OUTPUT", "false").lower() in (
    "1", "true", "yes",
)

# 응답 스키마. enum 에 15라벨을 박아두면 '환각 라벨'이 차단.
EMOTION_JSON_SCHEMA = {
    "name": "emotion_result",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "emotions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": {"type": "integer"},
                        "label": {"type": "string", "enum": EMOUR_LABELS},
                    },
                    "required": ["index", "label"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["emotions"],
        "additionalProperties": False,
    },
}


class OpenAICompatibleEmotionLLM(EmotionLLM):
    # OpenAI 규격을 따르는 모든 서비스에 붙는 범용 구현.

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        from openai import AsyncOpenAI  # 지연 import: mock 모드에선 설치 불필요

        key = api_key or LLM_API_KEY
        if not key:
            raise RuntimeError(
                "LLM_API_KEY(또는 OPENAI_API_KEY)가 비어 있습니다. .env 를 확인하세요."
            )
        self.model = model or LLM_MODEL
        kwargs: Dict = {"api_key": key, "timeout": LLM_TIMEOUT}
        url = base_url or LLM_BASE_URL
        if url:
            kwargs["base_url"] = url
        self._client = AsyncOpenAI(**kwargs)
        logger.info(
            "LLM 준비 완료 | model=%s | base_url=%s | structured=%s",
            self.model, url or "openai-default", USE_STRUCTURED_OUTPUT,
        )

    def _response_format(self) -> Dict:
        if USE_STRUCTURED_OUTPUT:
            return {"type": "json_schema", "json_schema": EMOTION_JSON_SCHEMA}
        return {"type": "json_object"}

    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        user_prompt = build_user_prompt(context, target)
        last_error: Exception | None = None

        for attempt in range(LLM_MAX_RETRIES + 1):
            t0 = time.perf_counter()
            try:
                resp = await self._client.chat.completions.create(
                    model=self.model,
                    temperature=LLM_TEMPERATURE,
                    response_format=self._response_format(),
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                elapsed_ms = (time.perf_counter() - t0) * 1000

                # 토큰 사용량 기록 → 나중에 '실험별 비용'을 계산할 근거가 됩니다.
                usage = getattr(resp, "usage", None)
                METRICS.record_call(
                    model=self.model,
                    latency_ms=elapsed_ms,
                    prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                    completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
                    ok=True,
                )

                content = resp.choices[0].message.content or "{}"
                data = json.loads(content)
                items = data.get("emotions", [])
                if not isinstance(items, list):
                    raise ValueError(f"emotions 가 리스트가 아님: {type(items)}")
                return items

            except Exception as e:  # noqa: BLE001
                last_error = e
                METRICS.record_call(
                    model=self.model,
                    latency_ms=(time.perf_counter() - t0) * 1000,
                    ok=False,
                )
                logger.warning(
                    "LLM 호출 실패 (%d/%d): %s", attempt + 1, LLM_MAX_RETRIES + 1, e
                )

        logger.error("LLM 최종 실패. 전부 폴백 처리합니다: %s", last_error)
        return []


class AnthropicEmotionLLM(EmotionLLM):
    # Claude 계열. SDK 규격이 달라 별도 구현.

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        from anthropic import AsyncAnthropic  # pip install anthropic

        key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY 가 비어 있습니다.")
        self.model = model or os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")
        self._client = AsyncAnthropic(api_key=key, timeout=LLM_TIMEOUT)

    async def classify(self, context, target) -> List[Dict]:
        user_prompt = build_user_prompt(context, target)
        t0 = time.perf_counter()
        try:
            resp = await self._client.messages.create(
                model=self.model,
                max_tokens=1024,
                temperature=LLM_TEMPERATURE,
                system=SYSTEM_PROMPT,
                # 'prefill(선행 채움)': 응답 첫 글자를 '{' 로 강제해 JSON만 나오게 하는 기법
                messages=[
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": "{"},
                ],
            )
            text = "{" + resp.content[0].text
            usage = getattr(resp, "usage", None)
            METRICS.record_call(
                model=self.model,
                latency_ms=(time.perf_counter() - t0) * 1000,
                prompt_tokens=getattr(usage, "input_tokens", 0) or 0,
                completion_tokens=getattr(usage, "output_tokens", 0) or 0,
                ok=True,
            )
            return json.loads(text).get("emotions", [])
        except Exception as e:  # noqa: BLE001
            METRICS.record_call(
                model=self.model,
                latency_ms=(time.perf_counter() - t0) * 1000,
                ok=False,
            )
            logger.error("Anthropic 호출 실패: %s", e)
            return []


def build_llm() -> EmotionLLM:
    # .env 의 LLM_PROVIDER 값을 보고 알맞은 구현을 만들어 돌려줌.

    # 구버전 호환: LLM_PROVIDER 가 비어 있으면 예전 USE_MOCK_LLM.
    # (기존 .env 를 안 고쳐도 그대로 돌아가게 하기 위함)

    provider = LLM_PROVIDER
    if not provider:
        legacy_mock = os.getenv("USE_MOCK_LLM", "false").lower() in ("1", "true", "yes")
        provider = "mock" if legacy_mock else "openai"
        logger.info("LLM_PROVIDER 미설정 → 구버전 USE_MOCK_LLM 기준으로 '%s' 사용", provider)

    if provider == "mock":
        from .mock_llm import MockEmotionLLM
        return MockEmotionLLM()
    if provider in ("openai", "openai_compatible", "gemini", "upstage", "openrouter", "ollama", "vllm"):
        return OpenAICompatibleEmotionLLM()
    if provider == "anthropic":
        return AnthropicEmotionLLM()
    if provider in ("local", "kcelectra"):
        # 파인튜닝 로컬 모델. LOCAL_MODEL_PATH 로 모델 폴더/HF repo 지정.
        from .local_model import KcElectraEmotionLLM
        return KcElectraEmotionLLM()

    raise ValueError(
        f"알 수 없는 LLM_PROVIDER='{provider}'. "
        "mock / openai / openai_compatible / anthropic / local 중에서 고르세요."
    )
