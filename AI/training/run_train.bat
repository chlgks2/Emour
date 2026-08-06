@echo off
REM 맥락 감정모델 학습 원클릭 실행 (Anaconda Prompt 또는 더블클릭)
REM 진행률/점수가 이 창에 실시간으로 표시됩니다.
chcp 65001 >nul
cd /d "%~dp0"

REM emotion 환경의 파이썬을 '전체 경로'로 호출 → conda activate 없이도 동작
set "PY=C:\Users\SSAFY\miniconda3\envs\emotion\python.exe"
set PYTHONUTF8=1

REM ── 데이터 비중 (원하면 값만 바꾸세요) ──
set REAL_UPWEIGHT=4
set CONTRASTIVE_UPWEIGHT=2
set EPOCHS=8

echo ============================================
echo [1/2] 데이터 병합/분할 (실데이터=평가, 합성/대조쌍=학습)
echo ============================================
"%PY%" merge_and_split.py
if errorlevel 1 goto :err

echo.
echo ============================================
echo [2/2] 학습 시작 (warm-start, EPOCHS=%EPOCHS%)
echo   진행률 막대와 에폭별 eval_macro_f1 를 보세요.
echo ============================================
"%PY%" train_context_split.py out_mytrain --from warm
if errorlevel 1 goto :err

echo.
echo ============================================
echo 완료! 점수 요약: data\out_mytrain\eval_report.txt
echo 모델 폴더:      data\out_mytrain\
echo ============================================
goto :end

:err
echo.
echo [오류] 위 메시지를 확인하세요. (환경/경로 문제일 수 있음)

:end
pause
