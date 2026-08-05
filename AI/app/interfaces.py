"""
'약속(인터페이스)'만 모아둔 모듈. 외부 라이브러리 의존성이 없습니다.

service.py 가 llm.py 를 직접 import 하면, service 만 테스트하려 해도
openai 패키지가 설치돼 있어야 합니다. 약속만 여기로 빼두면
service 는 openai 없이 import 되고 단위 테스트가 가벼워집니다.
(의존성 역전 — 상위 로직이 하위 구현에 끌려다니지 않게)
"""

from typing import Dict, List

from .schemas import ContextMessage, TargetMessage


class EmotionLLM:
    """
    LLM 구현이 지켜야 할 약속.

    classify 는 [{"index": 0, "label": "궁금"}, ...] 형태의 raw 리스트를 반환.
    (검증·정렬·message_id 매핑은 service 가 담당)

    ※ 하이브리드 최종본과 출력 형식을 '리스트'로 통일했습니다.
      나중에 KOTE를 붙일 때 service 정렬 로직을 그대로 재사용하기 위함입니다.
    """

    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        raise NotImplementedError
