"""
LLM 호출 전담 모듈. EmotionLLM 인터페이스를 구현합니다.

나중에 로컬 LLM(vLLM, Ollama 등)으로 바꿀 때 같은 인터페이스를 따르는 클래스를
하나 더 만들면 되고, service/main 은 안 고쳐도 됩니다.

⭐ 클라이언트를 모듈 최상단이 아니라 __init__ 에서 만듭니다.
   최상단에서 만들면 import 하는 순간 API 키가 필요해져 테스트가 막힙니다.
"""

import json
import logging
from typing import Dict, List

from openai import AsyncOpenAI

from .config import (
    LLM_MAX_RETRIES,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    OPENAI_API_KEY,
)
from .interfaces import EmotionLLM
from .prompt import SYSTEM_PROMPT, build_user_prompt
from .schemas import ContextMessage, TargetMessage

logger = logging.getLogger(__name__)


class OpenAIEmotionLLM(EmotionLLM):
    def __init__(self, api_key: str | None = None) -> None:
        key = api_key or OPENAI_API_KEY
        if not key:
            raise RuntimeError("OPENAI_API_KEY 가 비어 있습니다. .env 를 확인하세요.")
        # AsyncOpenAI: await 로 호출 가능한 비동기 클라이언트.
        # 동기 클라이언트를 async 함수에서 쓰면 FastAPI 이벤트 루프가 멈춥니다.
        self._client = AsyncOpenAI(api_key=key, timeout=LLM_TIMEOUT)

    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        user_prompt = build_user_prompt(context, target)

        last_error: Exception | None = None
        for attempt in range(LLM_MAX_RETRIES + 1):  # 최초 1회 + 재시도 N회
            try:
                resp = await self._client.chat.completions.create(
                    model=LLM_MODEL,
                    temperature=LLM_TEMPERATURE,
                    response_format={"type": "json_object"},  # JSON 강제
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                content = resp.choices[0].message.content or "{}"
                data = json.loads(content)
                items = data.get("emotions", [])
                if not isinstance(items, list):
                    raise ValueError(f"emotions 가 리스트가 아님: {type(items)}")
                return items

            except Exception as e:  # noqa: BLE001 — 어떤 실패든 재시도 대상
                last_error = e
                logger.warning(
                    "LLM 호출 실패 (%d/%d): %s",
                    attempt + 1,
                    LLM_MAX_RETRIES + 1,
                    e,
                )

        logger.error("LLM 최종 실패. 전부 폴백 처리합니다: %s", last_error)
        return []  # 빈 리스트 → service 가 전부 폴백으로 채움 (계약 준수)
