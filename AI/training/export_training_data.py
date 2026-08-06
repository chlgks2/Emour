# -*- coding: utf-8 -*-
"""
채팅 DB → 맥락 라벨링용 CSV export.

배포 DB(chat_message + chat_analysis)에서 감정분석이 끝난 메시지를 뽑아,
'직전 대화'를 context 로 붙인 라벨링용 CSV(to_label.csv)를 만든다.
추론(AI/app/local_model.py._build_context_text)과 '같은 형식'("발화자: 내용" \n 이음)이다.

■ 왜 label 칸을 비워두나
  chat_analysis.emotion_type 은 '현재 모델의 예측'이라, 그대로 학습하면 모델이 자기 실수를
  되풀이 학습할 뿐(향상 없음). 그래서 model_hint(힌트)로만 넣고, 사람이 정답 label 을 채운다.
  특히 맥락에 따라 감정이 바뀌는 짧은 말("됐어/응/왜/그래")을 우선 검수.

■ ⚠️ 개인정보
  실제 커플 대화다. 사용자 동의 범위 안에서만, 내부에서만 사용.
  결과 CSV 는 절대 git / 외부 서비스에 올리지 말 것. (AI/training/.gitignore 가 *.csv 를 무시함)

■ DB 접속은 환경변수로 (코드에 비밀값 없음)
  EXPORT_DB_HOST, EXPORT_DB_PORT(기본 3306), EXPORT_DB_NAME(기본 emour),
  EXPORT_DB_USER, EXPORT_DB_PASSWORD

usage:
  pip install pymysql            # 없으면
  set EXPORT_DB_HOST=...  (등)
  python export_training_data.py to_label.csv
"""
import os, sys, csv
from collections import defaultdict
from datetime import timedelta

# 대상 메시지 앞에 붙일 최대 맥락 줄 수 / 대화 단절로 볼 시간 간격(분)
MAX_CONTEXT = int(os.environ.get("EXPORT_MAX_CONTEXT", "6"))
MAX_GAP_MIN = int(os.environ.get("EXPORT_MAX_GAP_MIN", "30"))

# EmotionType(영문 enum) → 모델 15 한글 라벨 (힌트용, 손실 있음).
# 주의: EMBARRASSMENT 는 '당황'과 '부끄러움'이 합쳐진 값 → 힌트는 '당황', 사람이 필요시 '부끄러움'으로.
#       CONFUSION 은 모델 15라벨에 없음 → 빈칸(사람이 채움).
HINT = {
    "JOY": "기쁨", "EXCITEMENT": "설렘", "COMFORT": "편안", "WORRY": "걱정",
    "SURPRISE": "놀람", "NEUTRAL": "평범", "EMBARRASSMENT": "당황", "CURIOSITY": "궁금",
    "SADNESS": "슬픔", "ANGER": "화남", "DISTRESS": "힘듦", "GRATITUDE": "고마움",
    "APOLOGY": "미안함", "HURT": "서운함", "CONFUSION": "",
}

SQL = """
    SELECT m.room_id, m.message_id, m.sender_id, m.content, m.sent_at, a.emotion_type
    FROM chat_message m
    JOIN chat_analysis a ON a.message_id = m.message_id
    WHERE a.analysis_status = 'COMPLETED'
      AND m.message_type = 'TEXT'
      AND m.content IS NOT NULL AND m.content <> ''
    ORDER BY m.room_id, m.sent_at, m.message_id
"""


def fetch_rows():
    try:
        import pymysql
    except ImportError:
        sys.exit("pymysql 가 필요합니다:  pip install pymysql")

    conn = pymysql.connect(
        host=os.environ["EXPORT_DB_HOST"],
        port=int(os.environ.get("EXPORT_DB_PORT", "3306")),
        user=os.environ["EXPORT_DB_USER"],
        password=os.environ["EXPORT_DB_PASSWORD"],
        database=os.environ.get("EXPORT_DB_NAME", "emour"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
            return cur.fetchall()
    finally:
        conn.close()


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "to_label.csv"
    rows = fetch_rows()
    if not rows:
        sys.exit("분석 완료된 메시지가 없습니다. (데이터가 아직 안 쌓였을 수 있어요)")

    by_room = defaultdict(list)
    for r in rows:
        by_room[r["room_id"]].append(r)

    out_rows = []
    for room_id, msgs in by_room.items():
        # 방 안에서 sender_id → A/B 고정(작은 번호부터 A). ChatAnalysisService 규칙과 동일.
        senders = sorted({m["sender_id"] for m in msgs})
        spk = {sid: ("A" if i == 0 else "B") for i, sid in enumerate(senders)}

        for idx, target in enumerate(msgs):
            ctx = []
            for prev in reversed(msgs[:idx]):
                if (target["sent_at"] - prev["sent_at"]) > timedelta(minutes=MAX_GAP_MIN):
                    break  # 너무 오래 전이면 다른 대화로 보고 중단
                ctx.append(prev)
                if len(ctx) >= MAX_CONTEXT:
                    break
            ctx.reverse()  # 시간 오름차순
            context_text = "\n".join(
                f"{spk[m['sender_id']]}: {m['content']}" for m in ctx
            )
            out_rows.append({
                "room_id": room_id,
                "message_id": target["message_id"],
                "sent_at": target["sent_at"],
                "context": context_text,
                "text": target["content"],
                "model_hint": HINT.get(target["emotion_type"], ""),
                "label": "",  # ← 사람이 15라벨 중에서 채움 (model_hint 참고해 수정)
            })

    fields = ["room_id", "message_id", "sent_at", "context", "text", "model_hint", "label"]
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(out_rows)

    print(f"{len(out_rows)}행 (방 {len(by_room)}개) → {out}")
    print("다음 단계:")
    print("  1) label 칸을 사람이 채운다(빈칸은 학습에서 자동 제외됨).")
    print("  2) python train_context.py <이 CSV> <모델출력폴더>  로 재학습.")
    print("⚠️ 개인정보 — 이 CSV 는 git/외부에 올리지 마세요.")


if __name__ == "__main__":
    main()
