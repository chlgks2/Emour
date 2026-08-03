# Emour 감정분류 모델 — 학습 파이프라인

커플 채팅 감정분류 모델(KcELECTRA 파인튜닝, 15라벨)을 **재현**하기 위한 스크립트 모음입니다.
학습된 모델은 git 이 아니라 **Hugging Face Hub** 에 올라가고, AI 서버는 거기서 다운로드해 씁니다.

## 산출물 위치 규칙
- **코드**(이 폴더) → git ✅
- **데이터·모델**(대용량) → git ❌ (`.gitignore` 처리). 데이터는 각자 받고, 모델은 HF Hub 에.

## 15라벨
`기쁨 설렘 편안 걱정 놀람 평범 부끄러움 궁금 슬픔 화남 당황 힘듦 고마움 미안함 서운함`
(백엔드 계약과 동일 — `AI/app/config.py` 의 `EMOUR_LABELS` 와 순서까지 일치)

## 환경
```bash
conda create -n emotion python=3.11 -c conda-forge --override-channels -y
conda activate emotion
pip install torch --index-url https://download.pytorch.org/whl/cu124   # GPU 학습용(로컬)
pip install transformers datasets accelerate scikit-learn pandas openpyxl huggingface_hub
```

## 데이터
- **AI Hub 감성대화 말뭉치** (aihub.or.kr, 무료). Training/Validation 의 xlsx(원천데이터)를 받아서 아래 경로에 둡니다.
- 데이터 폴더는 환경변수로 지정: `set EMOUR_DATA_DIR=경로` (기본값: 이 폴더의 `data/`)

## 실행 순서 (재현)
```bash
# 0) 데이터 폴더 지정
set EMOUR_DATA_DIR=C:\path\to\data

# 1) AI Hub xlsx → 15라벨 CSV (train / val 각각)
python convert_aihub.py "감성대화말뭉치_Training.xlsx"   aihub_train_15label.csv
python convert_aihub.py "감성대화말뭉치_Validation.xlsx" aihub_val_15label.csv

# 2) 합성 데이터 보강 → 최종 학습 CSV (평범/궁금/놀람 등 + 놀람 과잉예측 방지)
python gen_synthetic.py aihub_train_15label.csv aihub_train_final.csv

# 3) 파인튜닝 (RTX 4070 기준 ~10분)
python train.py aihub_train_final.csv emour-emotion-kcelectra

# 4) 평가 (AI Hub Validation + 커플 채팅 평가셋)
python eval.py emour-emotion-kcelectra

# 5) Hugging Face Hub 업로드
set HF_USERNAME=본인아이디
set HF_TOKEN=hf_xxx
python push_to_hf.py emour-emotion-kcelectra
```

## 서버에서 사용 (배포)
AI 서버(`AI/app/`)는 코드 수정 없이 환경변수로 이 모델을 씁니다:
```
LLM_PROVIDER=local
LOCAL_MODEL_PATH=본인아이디/emour-emotion-kcelectra   # HF repo id
```

## 현재 성능 (참고)
- AI Hub Validation(12라벨, 상담체): macro-F1 ~0.59
- 커플 채팅 평가셋(15라벨, 153문장): macro-F1 ~0.73
- 남은 과제: 맥락(context) 활용으로 "됐어/별로야" 같은 맥락 의존 감정 개선
