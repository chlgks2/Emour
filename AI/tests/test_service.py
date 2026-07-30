"""
안전장치 계층 단위 테스트.

핵심: API 키 없이, 돈 한 푼 안 쓰고 로직을 검증합니다.
가짜 LLM(FakeLLM)을 끼워 "LLM이 이상하게 답했을 때"를 재현합니다.
(llm.py 를 인터페이스로 분리해뒀기에 가능)

실행:  python tests/test_service.py   또는   pytest tests/test_service.py -v
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import FALLBACK_LABEL  # noqa: E402
from app.schemas import AnalyzeRequest  # noqa: E402
from app.service import align_labels, analyze, to_response  # noqa: E402


class FakeLLM:
    """미리 정해둔 리스트만 돌려주는 가짜 LLM."""

    def __init__(self, canned):
        self.canned = canned

    async def classify(self, context, target):
        return self.canned


def make_request(n=3):
    return AnalyzeRequest(
        context=[{"speaker": "A", "text": "이전 대화"}],
        target=[
            {"message_id": 100 + i, "speaker": "A", "text": f"문장{i}"}
            for i in range(n)
        ],
    )


def test_normal():
    out = align_labels(
        [{"index": 0, "label": "기쁨"}, {"index": 1, "label": "슬픔"}, {"index": 2, "label": "평범"}],
        3,
    )
    assert out == ["기쁨", "슬픔", "평범"]
    print("✅ 1. 정상 케이스")


def test_missing():
    out = align_labels([{"index": 0, "label": "기쁨"}, {"index": 2, "label": "평범"}], 3)
    assert len(out) == 3 and out[1] == FALLBACK_LABEL
    print("✅ 2. 누락 → 폴백으로 채움")


def test_hallucinated_label():
    out = align_labels(
        [{"index": 0, "label": "행복해요!!"}, {"index": 1, "label": "슬픔"}, {"index": 2, "label": "평범"}],
        3,
    )
    assert out[0] == FALLBACK_LABEL
    print("✅ 3. 허용 목록에 없는 라벨 → 폴백")


def test_string_index():
    # LLM이 index 를 문자열 "0" 으로 주는 경우 (JSON mode 에서 흔함)
    out = align_labels(
        [{"index": "0", "label": "기쁨"}, {"index": "1", "label": "슬픔"}, {"index": "2", "label": "평범"}],
        3,
    )
    assert out == ["기쁨", "슬픔", "평범"]
    print("✅ 4. 문자열 index('0') → 정수 변환해 채택")


def test_out_of_range():
    out = align_labels(
        [{"index": 0, "label": "기쁨"}, {"index": 5, "label": "화남"}, {"index": 2, "label": "평범"}],
        3,
    )
    assert out[0] == "기쁨" and out[1] == FALLBACK_LABEL and out[2] == "평범"
    print("✅ 5. 범위 밖 index(5) → 무시")


def test_total_failure():
    out = align_labels([], 5)  # LLM 완전 실패(빈 리스트)
    assert out == [FALLBACK_LABEL] * 5
    print("✅ 6. LLM 전면 실패 → 전부 폴백 (서버는 살아있음)")


def test_whitespace_and_nondict():
    out = align_labels(
        ["깨진값", {"index": 0, "label": "  고마움  "}, {"index": 1, "label": "미안함"}, {"index": 2, "label": "서운함"}],
        3,
    )
    assert out == ["고마움", "미안함", "서운함"]
    print("✅ 7. 공백 제거 + dict 아닌 항목 무시")


def test_id_mapping():
    req = make_request(3)
    res = to_response(req.target, ["기쁨", "슬픔", "평범"])
    assert set(res.keys()) == {"100", "101", "102"}
    assert res["101"].emotion == "슬픔"
    print("✅ 8. message_id 키 매핑 정확")


def test_end_to_end():
    req = make_request(3)
    # 누락(1) + 환각(2) 동시 발생
    llm = FakeLLM([{"index": 0, "label": "설렘"}, {"index": 2, "label": "없는라벨"}])
    res = asyncio.run(analyze(req, llm))
    assert len(res) == 3, "입력 3개면 출력도 반드시 3개"
    assert res["100"].emotion == "설렘"
    assert res["101"].emotion == FALLBACK_LABEL
    assert res["102"].emotion == FALLBACK_LABEL
    print("✅ 9. E2E — 최악의 LLM 응답에도 N:N 유지")


if __name__ == "__main__":
    for fn in [
        test_normal, test_missing, test_hallucinated_label, test_string_index,
        test_out_of_range, test_total_failure, test_whitespace_and_nondict,
        test_id_mapping, test_end_to_end,
    ]:
        fn()
    print("\n🎉 전체 9개 통과")
