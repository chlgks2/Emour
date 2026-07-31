
# 비즈니스 로직 + 안전장치 계층 (v2 — 정규화·계측 추가).

# v1 대비 달라진 점
#   1) 폴백 직전에 normalize_label() 로 '표기만 다른 답'을 구제합니다.
#   2) 폴백 개수를 METRICS 에 기록합니다. → /metrics 로 품질 감시 가능.

# 한 줄 요약은 그대로입니다:
#   "LLM이 무슨 짓을 하든, 백엔드는 항상 target 개수만큼, 허용 라벨만 담긴 응답을 받는다."

import logging
from typing import Dict, List, Optional, Tuple

from .config import EMOUR_LABELS, FALLBACK_LABEL
from .interfaces import EmotionLLM
from .metrics import METRICS
from .normalize import normalize_label
from .schemas import AnalyzeRequest, EmotionResult, TargetMessage

logger = logging.getLogger(__name__)

_VALID_LABELS = set(EMOUR_LABELS)


def align_labels_with_stats(items: List[Dict], n: int) -> Tuple[List[str], int]:

    # LLM raw 리스트 → 길이 n 의 안전한 라벨 리스트 + 폴백 개수.

    # 보정하는 사고:
    #   1) 누락      — 해당 index 없음            → 폴백
    #   2) 표기 흔들림 — '기쁨.', '행복' 등         → 정규화로 구제 (v2 신규)
    #   3) 진짜 오염  — 정규화도 실패              → 폴백
    #   4) 범위 밖   — index < 0 또는 >= n         → 무시
    #   5) 타입 오류  — index 가 "0" 같은 문자열     → int 변환 후 채택
    #   6) 형식 오류  — 항목이 dict 가 아님          → 무시

    slots: List[Optional[str]] = [None] * n

    for item in items:
        if not isinstance(item, dict):
            logger.warning("항목이 객체가 아님 → 무시: %r", item)
            continue

        raw_idx = item.get("index")
        try:
            idx = int(raw_idx)
        except (TypeError, ValueError):
            logger.warning("index 를 정수로 못 읽음 → 무시: %r", raw_idx)
            continue

        if not (0 <= idx < n):
            logger.warning("index %d 범위 밖(0~%d) → 무시", idx, n - 1)
            continue

        raw_label = item.get("label")
        label = normalize_label(raw_label)      # ⭐ v2: 정규화 한 단계 추가
        if label is None:
            logger.warning(
                "index %d 라벨 %r 을 해석 불가 → 폴백('%s')", idx, raw_label, FALLBACK_LABEL
            )
            continue
        if label != str(raw_label).strip():
            logger.info("index %d 라벨 정규화: %r → '%s'", idx, raw_label, label)

        slots[idx] = label

    missing = [i for i, v in enumerate(slots) if v is None]
    if missing:
        logger.warning("빈 슬롯 %s → 폴백('%s')로 채움", missing, FALLBACK_LABEL)

    labels = [v if v is not None else FALLBACK_LABEL for v in slots]
    return labels, len(missing)


def align_labels(items: List[Dict], n: int) -> List[str]:
    # 구버전 호환용 래퍼. 기존 테스트가 그대로 통과
    labels, _ = align_labels_with_stats(items, n)
    return labels


def to_response(
    target: List[TargetMessage], labels: List[str]
) -> Dict[str, EmotionResult]:
    # 순번 기반 라벨 리스트를 message_id 키의 응답으로 복원
    if len(target) != len(labels):
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
    # 전체 분석 흐름.
    if hints:
        logger.debug("hints 전달됨(LLM-only 모드에서는 미사용).")

    raw = await llm.classify(req.context, req.target)
    labels, fallback_count = align_labels_with_stats(raw, len(req.target))
    METRICS.record_result(labels, fallback_count)
    return to_response(req.target, labels)