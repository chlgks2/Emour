"""
스모크 테스트 — 서버가 실제로 도는지 확인하는 최소 검사.

⚠️ 실제 LLM을 호출하므로 소액 비용이 발생합니다.
   로직 검증은 test_service.py(무료)로 하고, 이건 연동 확인용입니다.

사용법:
  터미널 1)  uvicorn app.main:app --port 8000
  터미널 2)  python tests/test_request.py
"""

import json

import httpx

BASE = "http://localhost:8000"

PAYLOAD = {
    "context": [
        {"speaker": "A", "text": "오늘 저녁에 회사 사람들이랑 술 한잔할 수도 있어"},
        {"speaker": "B", "text": "그래? 갑자기?"},
    ],
    "target": [
        {"message_id": 101, "speaker": "B", "text": "또 회식이야?"},
        {"message_id": 102, "speaker": "A", "text": "미안 갑자기 잡혔어"},
        {"message_id": 103, "speaker": "B", "text": "알겠어 재밌게 놀다와"},
    ],
}


def main() -> None:
    with httpx.Client(timeout=60) as client:
        h = client.get(f"{BASE}/health")
        print("[health]", h.status_code, h.json())
        assert h.status_code == 200

        l = client.get(f"{BASE}/labels")
        print("[labels]", len(l.json()["labels"]), "개")
        assert len(l.json()["labels"]) == 15

        r = client.post(f"{BASE}/analyze", json=PAYLOAD)
        print("[analyze]", r.status_code)
        print(json.dumps(r.json(), ensure_ascii=False, indent=2))
        assert r.status_code == 200

        body = r.json()
        assert len(body) == len(PAYLOAD["target"]), "N:N 위반!"
        for m in PAYLOAD["target"]:
            assert str(m["message_id"]) in body, f"{m['message_id']} 누락"

        print("\n✅ 스모크 테스트 통과")

        # 빈 target 은 422 로 거부되어야 함
        bad = client.post(f"{BASE}/analyze", json={"context": [], "target": []})
        print("[빈 target 거부]", bad.status_code, "(422 기대)")
        assert bad.status_code == 422

        # target 11개는 422 로 거부되어야 함 (상한 10)
        over = {
            "context": [],
            "target": [
                {"message_id": i, "speaker": "A", "text": "x"} for i in range(11)
            ],
        }
        o = client.post(f"{BASE}/analyze", json=over)
        print("[target 11개 거부]", o.status_code, "(422 기대)")
        assert o.status_code == 422


if __name__ == "__main__":
    main()
