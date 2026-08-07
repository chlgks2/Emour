# -*- coding: utf-8 -*-
"""
원클릭 모델 업그레이드: 데이터 병합 → 학습 → 이전 모델과 비교.

★ 사용법: 아래 CONFIG 값만 원하는 대로 고치고,  python run_upgrade.py  실행하면 끝.
   (set 명령·CLI 인자 필요 없음. 전부 이 파일 안에서 조절.)

각 단계에서 화면에 실시간으로:
  - 병합 결과(어느 감정이 test에 몇 개 들어왔는지)
  - 학습 진행률(%) + 에폭마다 valid 점수
  - 마지막에 '이전 모델 vs 새 모델' 비교표
"""
import os, sys

# ══════════════════ CONFIG (여기만 수정하세요) ══════════════════
# ── 데이터 비중 ──
REAL_UPWEIGHT        = 1     # 실유저 데이터 2600+로 충분 → 복제 불필요(과반복 방지)
CONTRASTIVE_UPWEIGHT = 2     # 대조쌍 복제배수
SPACING_AUG          = False # ✗ 실험결과 효과 없음(데이터에 없는 붙임표기는 증강으로 못잡음) → 끔
SPACING_DROP         = 0.5   # (SPACING_AUG=True 일 때만 의미) 공백 제거 확률

# ── 학습 ──
INIT_SOURCE  = "warm"       # "warm"=기존 emour 모델 이어학습(추천) / "base"=처음부터
EPOCHS       = 8            # ★ 1차(best) 값
LR           = 2e-5         # 학습률
BATCH        = 16           # 배치 크기 (GPU 메모리 부족하면 8)
WEIGHT_DECAY = 0.0          # ★ 1차엔 정규화 없음이 더 좋았음(희소감정 보존)
WARMUP_RATIO = 0.0          # ★ 동일
OUT_DIR      = "emour-emotion-kcelectra-context"   # 저장 폴더 이름(=나중에 HF repo 이름)

# ── 비교 (기준 = 현재 배포 단문모델) ──
# ⚠️ 이전에 학습한 맥락모델(out_context_warm_v2 등)과 비교하면 안 된다!
#    그 모델은 '다른 분할'로 학습돼, 지금 test에 그 모델의 '학습 데이터'가 섞여 들어가
#    점수가 뻥튀기된다(데이터 누수). 그래서 우리 데이터를 '전혀 안 본' 배포 단문모델을 기준으로 쓴다.
BASELINE_MODEL  = "chlgks/emour-emotion-kcelectra"   # 현재 서비스 중인 단문모델(누수 0)
BASELINE_SINGLE = True                                # 단문모델이라 맥락 없이 대상만으로 평가
FOCUS = ["놀람", "당황", "슬픔", "고마움", "서운함", "부끄러움"]  # 비교표에서 특히 볼 감정
# ═══════════════════════════════════════════════════════════════

# 콘솔 한글/기호 깨짐 방지
os.system("chcp 65001 >nul 2>&1")
try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# 하위 스크립트가 'import 시점'에 읽는 값들 → 반드시 import 전에 환경변수로 넣는다
os.environ["REAL_UPWEIGHT"]        = str(REAL_UPWEIGHT)
os.environ["CONTRASTIVE_UPWEIGHT"] = str(CONTRASTIVE_UPWEIGHT)
os.environ["SPACING_AUG"]  = "1" if SPACING_AUG else "0"
os.environ["SPACING_DROP"] = str(SPACING_DROP)
os.environ["EPOCHS"] = str(EPOCHS)
os.environ["LR"]     = str(LR)
os.environ["BATCH"]  = str(BATCH)
os.environ["WEIGHT_DECAY"] = str(WEIGHT_DECAY)
os.environ["WARMUP_RATIO"] = str(WARMUP_RATIO)

# 덮어쓰기 방지: 저장 폴더가 이미 있으면 -v2, -v3 ... 로 새로 저장
_DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
def _next_free(base):
    if not os.path.exists(os.path.join(_DATA, base)):
        return base
    i = 2
    while os.path.exists(os.path.join(_DATA, f"{base}-v{i}")):
        i += 1
    return f"{base}-v{i}"
OUT_DIR = _next_free(OUT_DIR)
print(f"[저장 폴더] data\\{OUT_DIR}  (덮어쓰기 방지 — 기존 모델 보존)")

print("="*64)
print(f"[1/3] 데이터 병합·분할  (REAL_UPWEIGHT={REAL_UPWEIGHT}, CONTRASTIVE_UPWEIGHT={CONTRASTIVE_UPWEIGHT})")
print("="*64)
import merge_and_split
merge_and_split.main()

print("\n" + "="*64)
print(f"[2/3] 학습  from={INIT_SOURCE}  EPOCHS={EPOCHS}  LR={LR}  BATCH={BATCH}  →  {OUT_DIR}")
print("="*64)
sys.argv = ["train_context_split.py", OUT_DIR, "--from", INIT_SOURCE]
import train_context_split
train_context_split.main()

print("\n" + "="*64)
print("[3/3] 배포 단문모델(기준) vs 새 맥락모델 비교 (같은 test, 둘 다 누수 0)")
print("="*64)
import eval_model
new = eval_model.evaluate(OUT_DIR)
base = None
try:
    base = eval_model.evaluate(BASELINE_MODEL, single=BASELINE_SINGLE)
except Exception as e:
    print(f"(기준 모델 '{BASELINE_MODEL}' 평가 건너뜀: {e})")


def line(name, o, n, extra=""):
    if o is None:
        print(f"  {name:<9}{'-':>10}{n:>10.3f}{'':>10}{extra}")
    else:
        print(f"  {name:<9}{o:>10.3f}{n:>10.3f}{(n-o):>+10.3f}{extra}")

print(f"\n  {'감정':<9}{'배포(단문)':>10}{'새(맥락)':>10}{'변화':>10}")
print("  " + "-"*42)
line("macro-F1", (base["macro"] if base else None), new["macro"])
present = new["per_label"]
for e in FOCUS:
    o = base["per_label"].get(e, 0.0) if base else None
    n = present.get(e, 0.0)
    sup = new["support"].get(e, 0)
    line(e, o, n, extra=f"  (test {sup}개)")
print("\n  ※ 기준(배포 단문모델)은 우리 데이터를 전혀 안 봐서 누수가 없습니다 = 정직한 비교.")
if new.get("ctx_acc") is not None:
    print(f"  [맥락 진단] 새 모델 정확도 {new['ctx_acc']:.3f} / 맥락따라 예측 바뀐 target {new['ctx_varied']}종")

print("\n" + "="*64)
print(f"완료! 새 모델: data\\{OUT_DIR}\\   (점수요약: eval_report.txt)")
print("좋아졌으면 → 배포: python push_to_hf.py " + OUT_DIR + "  후 .env 3줄(UPGRADE_HOWTO.md STEP6)")
print("="*64)
