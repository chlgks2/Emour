# 맥락 감정모델 직접 학습하기 (Anaconda Prompt)

터미널에서 직접 돌리면 **진행률(%)·속도·에폭별 점수**가 실시간으로 보입니다.

---

## 0) 준비 — Anaconda Prompt 열기
시작메뉴에서 **Anaconda Prompt** 실행. (PowerShell 아님)

## 1) 아래를 한 줄씩 붙여넣기

```bat
chcp 65001
conda activate emotion
cd /d C:\Users\SSAFY\dev\backend\S15P11B208\AI\training
set PYTHONUTF8=1
```
- `chcp 65001` : 콘솔을 UTF-8로 (한글·기호 안 깨짐)
- `conda activate emotion` : 학습 라이브러리 있는 환경

## 2) 데이터 병합·분할 (실데이터=평가, 합성·대조쌍=학습)

```bat
set REAL_UPWEIGHT=4
set CONTRASTIVE_UPWEIGHT=2
python merge_and_split.py
```
→ `data/`에 train / valid / test / context_test.csv 생성.
   출력 맨 아래 `train … / valid … / test …` 줄에서 개수·분포를 볼 수 있어요.

## 3) 학습 시작 (warm-start 권장)

```bat
set EPOCHS=8
python train_context_split.py out_mytrain --from warm
```

### 학습 중 화면에서 보이는 것
- **진행률 막대**: `45%|████▍ | 180/396 [00:22<00:27, 7.9it/s]` ← 몇 %·남은시간
- **에폭마다 점수**: `{'eval_loss': .., 'eval_macro_f1': 0.398, 'epoch': 4.0}` ← valid 점수
- **끝나면 최종 리포트**:
  - `[TEST · 실데이터]` 감정별 precision/recall/f1
  - `test macro-F1 (실데이터): 0.4076` ← **진짜 성능 지표**
  - `[맥락 진단]` 같은 문장이 맥락따라 다른 예측이 되는지

모델은 `data/out_mytrain/` 에 저장되고, 점수 요약은 `data/out_mytrain/eval_report.txt` 에도 남습니다.

---

## 실험(비교) 해보기 — 값만 바꿔 다시 3)만 실행

| 바꿀 것 | 명령 | 의미 |
|---|---|---|
| 그냥 base에서 | `python train_context_split.py out_base --from base` | 감정 사전학습 없이 → 보통 낮음 |
| 에폭 늘리기 | `set EPOCHS=10` 후 재실행 | valid 점수 계속 오르면 유효 |
| 실데이터 더 강조 | `set REAL_UPWEIGHT=6` 후 **2)부터** 다시 | 실채팅에 더 맞춤 |
| 대조쌍 강조 | `set CONTRASTIVE_UPWEIGHT=4` 후 **2)부터** 다시 | 맥락 진단↑, 실성능은 트레이드오프 |

> ⚠️ REAL_UPWEIGHT / CONTRASTIVE_UPWEIGHT 를 바꿨으면 **2)(merge_and_split)부터** 다시 돌려야 반영됩니다.
> EPOCHS만 바꿨으면 3)만 다시 돌리면 됩니다.
> 비교하려면 `out_mytrain` 대신 `out_test2` 처럼 **폴더명을 다르게** 주세요.

## 참고: 지금까지 최고 기록
- warm-start + REAL_UPWEIGHT=4 + CONTRASTIVE_UPWEIGHT=2 + EPOCHS=8(최적 4에폭 자동선택)
- **실데이터 test macro-F1 = 0.41 / 정확도 0.52**

## 배포 (원할 때)
`.env` 에:
```
LLM_PROVIDER=local
LOCAL_MODEL_PATH=C:\Users\SSAFY\dev\backend\S15P11B208\AI\training\data\out_mytrain
LOCAL_USE_CONTEXT=true
```
`LOCAL_USE_CONTEXT=true` 는 맥락 모델일 때만 켭니다(단문 모델엔 끄기).
