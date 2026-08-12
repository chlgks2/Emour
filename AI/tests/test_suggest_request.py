"""문구 추천 - 스모크 테스트 (서버가 실제로 도는지 확인하는 최소 검사).

⚠️ 실제 LLM(GMS)을 호출하므로 소액 비용이 발생합니다.
   로직 검증은 test_suggest_service.py(무료)로 하고, 이건 연동 확인용입니다.

사용법:
  터미널 1)  uvicorn app.main:app --port 8000
  터미널 2)  python tests/test_suggest_request.py
"""

import json

import httpx

BASE = "http://localhost:8000"

PAYLOAD = {
    "speaker_id": "u1",
    "target_message": "그래? 그랬구나?",
    "history": [
        {"speaker_id": "u2", "text": "나 우울해서 빵샀어"},
    ],
}


def main() -> None:
    with httpx.Client(timeout=30) as client:
        h = client.get(f"{BASE}/health")
        print("[health]", h.status_code, h.json())
        assert h.status_code == 200

        r = client.post(f"{BASE}/v1/messages/suggest", json=PAYLOAD)
        print("[suggest]", r.status_code)
        print(json.dumps(r.json(), ensure_ascii=False, indent=2))
        assert r.status_code == 200

        body = r.json()
        assert body["blocked"] is False, f"차단됨: {body.get('block_reason')}"
        assert len(body["suggestions"]) == 3, "3개 스타일이 다 안 옴!"

        styles = {s["style"] for s in body["suggestions"]}
        assert styles == {"logical", "empathetic", "gentle"}, f"스타일 누락: {styles}"

        print(f"\n모델: {body.get('model')} | 프롬프트버전: {body.get('prompt_version')} | 지연: {body.get('latency_ms')}ms")
        print("✅ 문구 추천 스모크 테스트 통과")

        # 짧은 메시지는 실제 서버에서도 차단되는지 (LLM 호출 없이 즉시 응답)
        short = client.post(f"{BASE}/v1/messages/suggest", json={
            "speaker_id": "u1", "target_message": "ㅇ",
        })
        print("[짧은 메시지 차단]", short.status_code, short.json().get("block_reason"), "(too_short 기대)")
        assert short.status_code == 200
        assert short.json()["blocked"] is True
        assert short.json()["block_reason"] == "too_short"

        print("✅ 차단 로직도 실서버에서 정상 동작")


if __name__ == "__main__":
    main()