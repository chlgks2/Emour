"""문구 추천 - 안전장치/로직 계층 단위 테스트.

핵심: API 키 없이, 돈 한 푼 안 쓰고 로직을 검증합니다.
가짜 LLM 응답을 끼워 정상/차단/파싱실패 케이스를 재현합니다.

실행:  python tests/test_suggest_service.py   또는   pytest tests/test_suggest_service.py -v
"""

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.schemas_suggest import ChatTurn, SuggestRequest  # noqa: E402
from app.services_suggest import generate_suggestions, screen_input  # noqa: E402
import app.services_suggest as svc  # noqa: E402


def _fake_client(payload: dict):
    """OpenAI 응답 구조를 흉내낸 가짜 클라이언트."""
    fake_message = MagicMock()
    fake_message.content = json.dumps(payload, ensure_ascii=False)
    fake_choice = MagicMock()
    fake_choice.message = fake_message
    fake_usage = MagicMock()
    fake_usage.prompt_tokens = 100
    fake_usage.completion_tokens = 40
    fake_completion = MagicMock()
    fake_completion.choices = [fake_choice]
    fake_completion.usage = fake_usage

    fake_client = MagicMock()
    fake_client.chat.completions.create = AsyncMock(return_value=fake_completion)
    return fake_client


def make_request(target="그래? 그랬구나?", speaker_id="u1", history=None) -> SuggestRequest:
    return SuggestRequest(
        speaker_id=speaker_id,
        target_message=target,
        history=history or [ChatTurn(speaker_id="u2", text="나 우울해서 빵샀어")],
    )


async def _run_all() -> None:
    # 1) 정상 케이스 - 3개 스타일 모두 채워지는지
    svc._client = _fake_client({
        "logical": {"text": "언제부터 그랬어?"},
        "empathetic": {"text": "괜찮아? 많이 속상했겠다ㅠㅠ"},
        "gentle": {"text": "그랬구나, 힘들었겠다."},
    })
    res = await generate_suggestions(make_request())
    assert res.blocked is False
    assert len(res.suggestions) == 3
    assert res.model == "gpt-4.1"
    assert res.prompt_version == "v4"
    print("[1] 정상 케이스 통과:", [s.text for s in res.suggestions])

    # 2) 너무 짧은 메시지 -> LLM 호출 없이 차단
    res2 = await generate_suggestions(make_request(target="ㅇ"))
    assert res2.blocked is True and res2.block_reason == "too_short"
    print("[2] 짧은 메시지 차단 통과")

    # 3) 안전 필터 -> LLM 호출 없이 차단
    res3 = await generate_suggestions(make_request(target="나 진짜 죽고싶어"))
    assert res3.blocked is True and res3.block_reason == "safety"
    print("[3] 안전 필터 차단 통과")

    # 4) LLM이 키를 하나 빠뜨린 이상한 응답 -> 재시도 후에도 실패하면 llm_failure
    svc._client = _fake_client({
        "logical": {"text": "언제부터 그랬어?"},
        "empathetic": {"text": ""},  # gentle 통째로 빠짐 + empathetic 빈 문자열
    })
    res4 = await generate_suggestions(make_request(target="괜찮아 신경쓰지마"))
    assert res4.blocked is True and res4.block_reason == "llm_failure"
    print("[4] LLM 이상 응답 방어 통과")

    # 5) speaker_id 기반 "나"/"상대" 구분이 실제로 되는지
    #    (partner_last_message 가 요청자 본인이 아닌 발화를 정확히 찾는지)
    req5 = make_request(
        speaker_id="u1",
        history=[
            ChatTurn(speaker_id="u1", text="나 오늘 늦을 것 같아"),
            ChatTurn(speaker_id="u2", text="왜 또 늦어"),
        ],
    )
    assert req5.partner_last_message == "왜 또 늦어"
    print("[5] speaker_id 기반 상대 발화 식별 통과")

    print("\n✅ 문구 추천 단위 테스트 전체 통과 (비용 발생 없음)")


def main() -> None:
    asyncio.run(_run_all())


if __name__ == "__main__":
    main()