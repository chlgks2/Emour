"""
설정 및 라벨 체계 (Single Source of Truth).

바꿀 일이 생기면 여기부터 봅니다. 라벨을 여러 파일에 흩어놓으면
반드시 불일치가 생기므로(과거 15 vs 10 사태), 라벨과 정의는 오직 이 파일에만 둡니다.

라벨/정의/판정기준은 팀 라벨링 가이드 문서를 정본(定本)으로 그대로 옮겼습니다.
최종 응답은 한국어 라벨을 그대로 사용합니다(영어 변환 없음).
"""

import os

from dotenv import load_dotenv

load_dotenv()


# ─────────────────────────────────────────────────────────────
# 1. LLM 설정
# ─────────────────────────────────────────────────────────────

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0"))  # 0 = 재현성
LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "30"))
LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "1"))

# ⭐ 목업 스위치: "1"/"true"/"yes" 면 실제 LLM 대신 MockEmotionLLM 을 씁니다.
#   BE/FE 연동 확인 단계에서는 이 값을 켜서 토큰(비용) 없이 서버를 굴립니다.
#   실제 LLM 으로 전환할 때는 이 값만 끄면 되고, 코드는 안 고칩니다.
USE_MOCK_LLM: bool = os.getenv("USE_MOCK_LLM", "false").lower() in ("1", "true", "yes")


# ─────────────────────────────────────────────────────────────
# 2. 감정 라벨 체계 — 확정 15라벨 (팀 라벨링 가이드 기준)
# ─────────────────────────────────────────────────────────────
#
#   긍정(3)     : 기쁨, 설렘, 편안
#   중립(5)     : 걱정, 놀람, 평범, 부끄러움, 궁금
#   부정(4)     : 슬픔, 화남, 당황, 힘듦
#   관계신호(3) : 고마움, 미안함, 서운함

# 라벨 → 한 줄 정의. 정의가 있어야 LLM 판단 일관성이 크게 올라갑니다.
LABEL_DEFINITIONS: dict[str, str] = {
    # ── 긍정 ──
    "기쁨":     "좋은 일에 대한 즐거움·기분 좋음 (일반 긍정)",
    "설렘":     "애정·기대·두근거림 (연애 감정)",
    "편안":     "긴장이 풀린 편안함·안정감·안심 (잔잔한 긍정, 안도 포함)",
    # ── 중립 ──
    "걱정":     "아직 안 일어난 일에 대한 불안·염려",
    "놀람":     "예상 밖 사건에 대한 즉각 반응 (중립~긍/부정 다 가능)",
    "평범":     "감정 신호 없음 (호응·단순 정보·노이즈)",
    "부끄러움": "창피함·수줍음·민망함",
    "궁금":     "알고 싶음·질문·확인하고 싶음 (의심 포함)",
    # ── 부정 ──
    "슬픔":     "상실·우울·눈물 나는 정서적 아픔 (상황이 슬픔)",
    "화남":     "분노·짜증·불만 (강하고 공격적인 부정)",
    "당황":     "어이없음·기막힘 (예상 밖이라 부정적으로 말문 막힘)",
    "힘듦":     "지침·피곤·소진 (에너지 고갈)",
    # ── 관계신호 ──
    "고마움":   "상대의 배려·도움에 대한 감사",
    "미안함":   "사과·죄책감",
    "서운함":   "상대의 말·행동에 마음이 상하거나 섭섭함 (화보다 약함)",
}

EMOUR_LABELS: list[str] = list(LABEL_DEFINITIONS.keys())

# 판단 불가·오류 시 채울 안전 라벨. 반드시 유효 라벨이어야 함.
FALLBACK_LABEL: str = "평범"


# ─────────────────────────────────────────────────────────────
# 3. 배치 제약 — 핸드오프 §2-3 (각각 최대 10개)
# ─────────────────────────────────────────────────────────────

MAX_TARGET: int = int(os.getenv("MAX_TARGET", "10"))
MAX_CONTEXT: int = int(os.getenv("MAX_CONTEXT", "10"))


# ─────────────────────────────────────────────────────────────
# 4. 자기 검증 — 설정이 틀리면 서버가 아예 안 뜨게 (fail-fast)
# ─────────────────────────────────────────────────────────────

def _validate() -> None:
    if not EMOUR_LABELS:
        raise ValueError("EMOUR_LABELS 가 비어 있습니다.")
    if FALLBACK_LABEL not in EMOUR_LABELS:
        raise ValueError(f"FALLBACK_LABEL('{FALLBACK_LABEL}')이 라벨 목록에 없습니다.")
    if len(EMOUR_LABELS) != len(set(EMOUR_LABELS)):
        raise ValueError("EMOUR_LABELS 에 중복된 라벨이 있습니다.")
    if len(EMOUR_LABELS) != 15:
        raise ValueError(f"라벨은 15개여야 하는데 {len(EMOUR_LABELS)}개입니다.")


_validate()
