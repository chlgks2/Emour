# Emour AI — LLM-only 초기 서버 (v0.1.0)

Git 초기 커밋용 **최소 동작 감정 분석 서버**입니다.
KOTE 없이 LLM 하나로 전 구간이 관통해 실제로 동작합니다.

> **왜 LLM-only가 초기 커밋인가**
> 최종 목표는 하이브리드(KOTE+LLM)지만, 하이브리드가 제때 안 될 경우를 대비해
> **먼저 확실히 도는 뼈대**를 올려 CI/CD·연동을 굴립니다.
> API 계약이 하이브리드와 동일하므로, 나중에 내부만 교체하면 됩니다.

---

## 1. 핵심 계약 (백엔드와 합의됨)

### 요청 `POST /analyze`
```json
{
  "context": [{"speaker": "A", "text": "안녕"}, {"speaker": "B", "text": "안녕~"}],
  "target":  [{"message_id": 101, "speaker": "A", "text": "오늘 뭐해?"}]
}
```
- `context`: 이미 분석된 배경. 읽기전용, 시간 오름차순, 없으면 `[]`. **최대 10개**
- `target`: 분석 대상. `message_id` 필수, 시간 오름차순. **최대 10개**, 최소 1개

### 응답
```json
{"101": {"emotion": "궁금"}}
```
- 키 = `target`의 `message_id`(문자열), 값 = 감정 1개(**한국어**)
- 응답 개수는 **항상 `target` 개수와 일치** (예외 없음)

### 확정 15라벨
| 분류 | 라벨 |
|---|---|
| 긍정 | 기쁨, 설렘, 편안 |
| 중립 | 걱정, 놀람, 평범, 부끄러움, 궁금 |
| 부정 | 슬픔, 화남, 당황, 힘듦 |
| 관계신호 | 고마움, 미안함, 서운함 |

---

## 2. 폴더 구조

```
app/
├── config.py       ⭐ 라벨·정의·설정 단일 출처 (여기부터 보세요)
├── schemas.py       입출력 계약 (하이브리드와 동일)
├── interfaces.py    LLM 교체를 위한 약속
├── prompt.py       ⭐ 프롬프트 (정의+판정기준+평범규칙)
├── llm.py           OpenAI 호출 + 재시도
├── service.py      ⭐ N:N 보장 안전장치
└── main.py          FastAPI 엔드포인트
tests/
├── test_service.py  단위 테스트 (API 키 불필요, 무료)
└── test_request.py  스모크 테스트 (서버 켜고 실행)
```

---

## 3. 실행

```bash
pip install -r requirements.txt
cp .env.example .env      # .env 에 OPENAI_API_KEY 채우기
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- 문서: <http://localhost:8000/docs>
- 헬스체크: <http://localhost:8000/health>
- 라벨 확인: <http://localhost:8000/labels>

---

## 4. 안전장치 — LLM이 이상하게 답해도 안 깨진다

`service.py`의 `align_labels()`가 다음을 모두 흡수합니다.

| LLM의 사고 | 처리 |
|---|---|
| index 누락 | 폴백(`평범`)으로 채움 |
| 허용 목록에 없는 라벨 | 폴백으로 교체 |
| index를 `"0"`(문자열)로 반환 | 정수로 변환해 채택 |
| 범위 밖 index | 무시 |
| API 타임아웃·전면 실패 | 전부 폴백, **502 대신 정상 응답** |

> 핸드오프 §2-4 가 요구하는 '보장'(개수·키·라벨 일치)을 코드로 담보합니다.
> 그래서 LLM 실패 시 502를 던지지 않습니다.

---

## 5. 테스트

```bash
python tests/test_service.py       # 무료, 비용 0
pytest tests/test_service.py -v
python tests/test_request.py       # 서버 켠 상태, 실제 LLM 호출(비용 발생)
```

---

## 6. 다음 단계 — KOTE를 붙일 때

`service.py`의 `analyze()`에 확장 지점이 이미 열려 있습니다.

```python
async def analyze(req, llm, hints: Optional[Dict[int, str]] = None):
    #                       ↑ {index: "KOTE가 본 감정"} 을 넘기면 됨
```

1. `app/kote.py` 추가 (lifespan에서 1회 로드, `asyncio.to_thread`로 오프로딩)
2. `main.py`에서 `hints=await kote_predict(...)` 전달
3. `prompt.py`의 `_format_target()`에서 각 줄 뒤에 힌트 덧붙임
4. `.env`에 `USE_KOTE` 스위치 → 같은 평가셋으로 KOTE 유무 A/B 비교

스키마·응답 형식은 그대로이므로 **백엔드는 손대지 않습니다.**
