# 목업(가짜) LLM 구현 v2 — 실제 API를 호출하지 X(비용 0).
 
# 기존 v1의 문제
#     라벨을 "배치 안의 순번(index)"으로 배정
#     (예: message_id=500 이 첫 배치에서 0번이면 '기쁨', 재조회 때 2번이면 '편안')
#     FE가 화면을 다시 그릴 때마다 감정이 바뀌므로 버그처럼 보임.
 
# v2의 원칙
#     "같은 message_id → 언제나 같은 감정" (결정론적, deterministic)
#     'deterministic(결정론적)' = 같은 입력에 항상 같은 출력. 무작위가 아님.
 
# 3가지 전략 (.env 의 MOCK_STRATEGY 로 선택)
#     cycle : 배치 순번대로 15라벨 순환.  FE가 15개 UI를 한 번에 보고 싶을 때
#     hash  : message_id 를 섞어 라벨 배정. 안정적이고 골고루 퍼짐 (기본값 권장)
#     rule  : 텍스트 키워드 규칙 + hash 폴백. 데모/시연에서 "그럴듯해" 보임


import logging
import os
import re
from typing import Dict, List
 
from .config import EMOUR_LABELS
from .interfaces import EmotionLLM
from .schemas import ContextMessage, TargetMessage
 
logger = logging.getLogger(__name__)
 
MOCK_STRATEGY: str = os.getenv("MOCK_STRATEGY", "hash").lower()
 
# Knuth 승수. message_id 가 1,2,3처럼 연속이어도 라벨이 골고루 흩어지게 섞는 상수.
# "고르게 퍼뜨리는" 용도입니다.
_MIX = 2654435761
 
# rule 전략용 키워드 규칙. 위에서부터 먼저 맞는 것을 채택.
# (정규식 = 문자열 패턴 검색 문법. r"..." 은 역슬래시를 그대로 쓰기 위한 표기)
_RULES: List[tuple[str, str]] = [
    (r"미안|죄송|사과", "미안함"),
    (r"고마|감사|땡큐", "고마움"),
    (r"서운|섭섭|삐졌", "서운함"),
    (r"짜증|화나|열받|어이가", "화남"),
    (r"피곤|힘들|지침|졸려", "힘듦"),
    (r"걱정|불안|괜찮을까", "걱정"),
    (r"슬프|눈물|우울", "슬픔"),
    (r"헐|대박|헉", "놀람"),
    (r"보고\s*싶|좋아해|사랑|설레", "설렘"),
    (r"부끄|민망|창피", "부끄러움"),
    (r"ㅋㅋ|ㅎㅎ|좋다|신난|재밌", "기쁨"),
    (r"당황|황당|뭐야", "당황"),
    (r"\?|뭐해|어디|언제|왜", "궁금"),
    (r"ㅇㅇ|알겠|그래", "평범"),
]
_COMPILED = [(re.compile(p), lab) for p, lab in _RULES]
 
 
def _by_hash(message_id: int) -> str:
    # message_id → 항상 같은 라벨. 서버를 재시작해도 결과가 같습니다.
    return EMOUR_LABELS[(message_id * _MIX) % len(EMOUR_LABELS)]
 
 
def _by_rule(text: str, message_id: int) -> str:
    for pattern, label in _COMPILED:
        if pattern.search(text):
            return label
    return _by_hash(message_id)  # 규칙에 안 걸리면 해시로 폴백
 
 
class MockEmotionLLM(EmotionLLM):
    # API 키·네트워크 불필요. 비용 0.
 
    def __init__(self, strategy: str | None = None) -> None:
        self.strategy = (strategy or MOCK_STRATEGY).lower()
        if self.strategy not in ("cycle", "hash", "rule"):
            logger.warning("알 수 없는 MOCK_STRATEGY=%s → 'hash' 사용", self.strategy)
            self.strategy = "hash"
        logger.info(
            "⚠️  MockEmotionLLM 활성화 (비용 0) — strategy=%s, 라벨 %d개",
            self.strategy, len(EMOUR_LABELS),
        )
 
    async def classify(
        self,
        context: List[ContextMessage],
        target: List[TargetMessage],
    ) -> List[Dict]:
        out: List[Dict] = []
        for i, m in enumerate(target):
            if self.strategy == "cycle":
                label = EMOUR_LABELS[i % len(EMOUR_LABELS)]
            elif self.strategy == "rule":
                label = _by_rule(m.text, m.message_id)
            else:
                label = _by_hash(m.message_id)
            out.append({"index": i, "label": label})
        return out