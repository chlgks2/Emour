# 모델 업그레이드 v3 — 학습 → 비교 → 배포 (Anaconda Prompt)

새 데이터(슬픔·고마움·놀람·당황 보강)를 넣고 재학습 → 이전 모델과 비교 → 서비스 배포까지.

---

## STEP 0. 파일 배치 (⚠️ 이름 규칙 중요)

라벨링 끝난 파일을 `AI\training\data\modify_data\` 에 넣어요. **파일명 앞부분이 종류를 결정**합니다:

| 파일 | 놓을 이름 | 왜 |
|---|---|---|
| `synthetic_슬픔고마움_realstyle.csv` | 그대로 (`synthetic_`로 시작) | AI 생성물 → **학습(train)에만** |
| 놀람·당황 대화 (직접 롤플레이한 **실제** 대화면) | **`to_label_놀람당황.csv`** 로 변경 | 실데이터 → **train+valid+test** |
| 놀람·당황 대화 (AI로 **생성**한 거면) | `synthetic_놀람당황.csv` 로 변경 | 생성물 → train 전용 |

> 규칙: 실데이터=`to_label_*`/`done_to_label_*`, 합성=`synthetic_*`, 대조쌍=`contrastive_*`.
> 이름이 안 맞으면 merge가 **무시하고 경고**를 띄웁니다. (`연인대화_...` 같은 이름은 그대로 두면 제외됨)

## STEP 1. 준비

```bat
chcp 65001
conda activate emotion
cd /d C:\Users\SSAFY\dev\backend\S15P11B208\AI\training
set PYTHONUTF8=1
```

## STEP 2. 데이터 병합·분할

```bat
set REAL_UPWEIGHT=4
set CONTRASTIVE_UPWEIGHT=2
python merge_and_split.py
```
- 출력에서 `test 분포` 를 보세요 — **슬픔·고마움·놀람·당황이 이제 test에 몇 개** 들어왔는지 확인 (0이면 아직 실데이터 부족).
- 무시된 파일 경고가 뜨면 STEP 0으로 돌아가 이름 고치기.

## STEP 3. 이전 모델 점수 먼저 재기 (비교 기준선)

```bat
python eval_model.py out_context_warm_v2
```
→ **바뀐 test로 이전 모델을 평가** = 공정한 비교 기준선. `test macro-F1` 과 감정별 f1을 적어두세요.
(이전 모델 폴더가 없으면 이 단계는 건너뛰고, 대신 예전 기록 0.41과 대략 비교)

## STEP 4. 새 모델 학습

```bat
set EPOCHS=8
python train_context_split.py emour-emotion-kcelectra-context --from warm
```
- 폴더명을 `emour-emotion-kcelectra-context` 로 주면 나중에 HF repo 이름이 깔끔해져요.
- **학습 중 화면**: 진행률 막대(%·ETA) + 에폭마다 `eval_macro_f1`(오르는지 보기) + 끝나면 `[TEST]` 리포트.

### 내가 조절할 수 있는 값 (원하는 대로 실험)
| 변수 | 기본 | 의미 | 언제 바꾸나 |
|---|---|---|---|
| `EPOCHS` | 8 | 학습 반복 | valid가 끝까지 오르면 ↑(10~12), 중간부터 떨어지면 그대로 |
| `REAL_UPWEIGHT` | 4 | 실데이터 복제배수 | 실채팅에 더 맞추려면 ↑(STEP2부터 다시) |
| `CONTRASTIVE_UPWEIGHT` | 2 | 대조쌍 복제배수 | 맥락진단 올리려면 ↑, 실성능 우선이면 낮게 |
| `LR` | 2e-5 | 학습률 | 보통 그대로. 불안정하면 1e-5 |
| `BATCH` | 16 | 배치크기 | GPU 메모리 부족하면 8 |
| `--from` | — | `warm`(추천) / `base` | warm=기존 감정지식 재활용 |

> `REAL_UPWEIGHT`/`CONTRASTIVE_UPWEIGHT` 바꿨으면 **STEP 2부터** 다시. `EPOCHS`/`LR`/`BATCH`만 바꿨으면 STEP 4만.

## STEP 5. 비교 (얼마나 좋아졌나)

STEP 3(이전) vs STEP 4 끝의 `[TEST]`(새 모델)를 **같은 test**에서 비교:
- **전체 test macro-F1** 이 올랐는지
- **놀람·당황·슬픔·고마움 f1이 0 → 얼마로** 올라왔는지 ← 이번 수집의 핵심 성공지표

새 모델을 다시 재보고 싶으면: `python eval_model.py emour-emotion-kcelectra-context`

---

## STEP 6. 배포 (서비스 적용)

### 6-1. Hugging Face 업로드
```bat
set HF_USERNAME=본인아이디
set HF_TOKEN=hf_xxx        (huggingface.co → Settings → Access Tokens, Write 권한)
python push_to_hf.py emour-emotion-kcelectra-context
```
→ `https://huggingface.co/본인아이디/emour-emotion-kcelectra-context` 생성(공개).

### 6-2. 인프라에게 요청할 것 (.env 3줄) — **이게 전부예요**
```
LLM_PROVIDER=local
LOCAL_MODEL_PATH=본인아이디/emour-emotion-kcelectra-context
LOCAL_USE_CONTEXT=true
```
그리고 **AI 서버 재시작**.

> ⭐ `LOCAL_USE_CONTEXT=true` 가 핵심 — 이걸 켜야 맥락 문장쌍으로 추론합니다.
> **백엔드는 손댈 것 없음**: `ChatAnalysisService`가 이미 context(최대10)+target(최대10)을 A/B로 매핑해 보냅니다.
> 라벨 15개도 그대로라 백엔드/DB(EmotionType) 변경 불필요.
