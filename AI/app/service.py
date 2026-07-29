"""
비즈니스 로직 + 안전장치 계층.

한 줄 요약: "LLM이 무슨 짓을 하든, 백엔드는 항상 target 개수만큼,
허용 라벨만 담긴 응답을 받는다." (핸드오프 §2-4 의 '보장'을 여기서 담보)

LLM은 확률적이라 개수를 빠뜨리거나, 없는 라벨을 만들거나, index를 문자열로 주거나,
아예 응답을 못 줄 수 있습니다. 그 모든 경우를 여기서 흡수합니다.
"""

import logging
from typing import Dict, List, Optional

from .config import EMOUR_LABELS, FALLBACK_LABEL
from .interfaces import EmotionLLM
from .schemas import AnalyzeRequest, EmotionResult, TargetMessage

logger = logging.getLogger(__name__)

# 검색 속도를 위해 set 으로 (list 의 `in` 은 O(n), set 은 O(1))
_VALID_LABELS = set(EMOUR_LABELS)


def align_labels(items: List[Dict], n: int) -> List[str]:
    """
    LLM이 준 raw 리스트 [{"index": 0, "label": "궁금"}, ...] 를
    길이 n 의 안전한 리스트로 변환합니다.

    보정하는 사고:
      1) 누락       — 해당 index가 없음        → 폴백
      2) 오염       — 허용 목록에 없는 라벨      → 폴백
      3) 범위 밖    — index < 0 또는 >= n       → 무시
      4) 타입 오류  — index가 "0" 같은 문자열    → int 변환 시도 후 채택
      5) 형식 오류  — 항목이 dict가 아님         → 무시

    반환값은 **항상 정확히 n개**임이 보장됩니다.
    """
    slots: List[Optional[str]] = [None] * n

    for item in items:
        if not isinstance(item, dict):
            logger.warning("항목이 객체가 아님 → 무시: %r", item)
            continue

        raw_idx = item.get("index")
        # index 가 int 든 "0" 같은 문자열이든 모두 int 로 변환 시도
        try:
            idx = int(raw_idx)
        except (TypeError, ValueError):
            logger.warning("index 를 정수로 못 읽음 → 무시: %r", raw_idx)
            continue

        if not (0 <= idx < n):
            logger.warning("index %d 범위 밖(0~%d) → 무시", idx, n - 1)
            continue

        label = item.get("label")
        if label is None:
            continue
        label = str(label).strip()

        if label not in _VALID_LABELS:
            logger.warning(
                "index %d 라벨 '%s' 은 허용 목록에 없음 → 폴백('%s')",
                idx, label, FALLBACK_LABEL,
            )
            continue  # 슬롯을 비워두면 아래에서 폴백으로 채움

        slots[idx] = label  # 같은 index 중복 시 마지막 값이 유지됨

    missing = [i for i, v in enumerate(slots) if v is None]
    if missing:
        logger.warning("빈 슬롯 %s → 폴백('%s')로 채움", missing, FALLBACK_LABEL)

    return [v if v is not None else FALLBACK_LABEL for v in slots]


def to_response(
    target: List[TargetMessage], labels: List[str]
) -> Dict[str, EmotionResult]:
    """순번 기반 라벨 리스트를 message_id 키의 응답으로 복원합니다."""
    if len(target) != len(labels):
        # align_labels 를 거쳤다면 발생할 수 없음. 방어적 검사.
        raise AssertionError(
            f"내부 정합성 오류: target {len(target)}개 vs labels {len(labels)}개"
        )
    return {
        str(m.message_id): EmotionResult(emotion=lab)
        for m, lab in zip(target, labels)
    }


async def analyze(
    req: AnalyzeRequest,
    llm: EmotionLLM,
    hints: Optional[Dict[int, str]] = None,   # ← 🔌 KOTE 확장 지점
) -> Dict[str, EmotionResult]:
    """
    전체 분석 흐름.

    `hints` 는 지금 안 쓰이지만 미리 열어둔 확장 지점입니다.
    나중에 KOTE를 붙일 때 {index: "KOTE가 본 감정"} 을 여기로 넘기고
    prompt 에서 각 줄 뒤에 힌트를 붙이기만 하면 됩니다.
    main.py 와 백엔드는 그때도 손댈 필요가 없습니다.
    """
    if hints:
        logger.debug("hints 전달됨(LLM-only 모드에서는 미사용).")

    raw = await llm.classify(req.context, req.target)
    labels = align_labels(raw, len(req.target))
    return to_response(req.target, labels)
