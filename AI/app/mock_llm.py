"""
목업(가짜) LLM 구현. 실제 OpenAI API를 호출하지 않습니다.

목적:
    BE/FE가 AI 없이도 전체 연동을 확인할 수 있게, 무슨 입력이 오든
    '정해진 규칙'으로 감정을 리턴합니다. 토큰(비용)이 전혀 들지 않습니다.

동작:
    target 문장들에 대해 EMOUR_LABELS(15개)를 index 0부터 순서대로 배정합니다.
    target 이 15개를 넘어가면 다시 처음 라벨로 순환합니다(모듈로).
    → FE 가 15개 감정별 UI(색/아이콘 등)를 한 번에 확인하기 좋습니다.

⭐ 실제 llm.py 의 OpenAIEmotionLLM 과 '똑같은 약속(EmotionLLM)'을 지키므로,
   service.py / main.py / schemas.py 는 한 줄도 고치지 않고 이 클래스로 교체됩니다.
   (interfaces.py 로 인터페이스를 분리해둔 덕분)
"""

import logging
from typing import Dict, List

from .config import EMOUR_LABELS
from .interfaces import EmotionLLM
from .schemas import ContextMessage, TargetMessage

logger = logging.getLogger(__name__)


class MockEmotionLLM(EmotionLLM):
    """라벨 15개를 순서대로 돌려주는 가짜 LLM. API 키·네트워크 불필요."""

    def __init__(self) -> None:
        # 진짜 클라이언트처럼 보이게 로그만 남김(실제 자원은 안 만듦)
        logger.info(
            "⚠️  MockEmotionLLM 활성화 — 실제 LLM을 호출하지 않습니다(비용 0). "
            "라벨 %d개를 순환 배정합니다.",
            len(EMOUR_LABELS),
        )

    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        # 실제 LLM 과 동일한 반환 형식: [{"index": i, "label": ...}, ...]
        # service.align_labels() 가 이 리스트를 그대로 받아 검증·정렬합니다.
        n_labels = len(EMOUR_LABELS)
        return [
            {"index": i, "label": EMOUR_LABELS[i % n_labels]}
            for i in range(len(target))
        ]
