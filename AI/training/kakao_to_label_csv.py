# -*- coding: utf-8 -*-
"""
카카오톡 대화 내보내기(.txt) → 맥락 라벨링용 CSV. (파일마다 CSV 1개)

연인 롤플레이 대화(카톡 export)를 사람이 감정 15라벨로 라벨링하기 좋은 CSV로 바꾼다.
출력 형식은 팀의 DB export(export_training_data.py) / 추론(app/local_model.py) 과 '똑같다':
    context = "발화자: 내용" 줄들을 시간 오름차순으로 \\n 으로 이어붙인 문자열 (발화자 = A/B)
    text    = 이번에 감정을 매길 '대상' 메시지 원문 (발화자 접두어 없음)
    label   = 사람이 15라벨 중 하나로 채운다 (빈칸은 train_context.py 가 자동 제외)

■ 지원하는 카톡 export 형식 2종 (섞여 있어도 자동 인식)
  (1) 대괄호형(모바일 공유):   [최 한] [오후 3:11] 밥먹었어?
      → 날짜는 구분선('--------- 2026년 8월 4일 화요일 ---------')에서 읽는다.
  (2) 날짜쉼표형(PC 저장):     2026년 8월 1일 오후 10:35, 하영 누나 : 밥 먹었어?
      → 줄마다 날짜가 들어있다.
  헤더('... 님과 카카오톡 대화', '저장한 날짜 : ...'), '메시지가 삭제되었습니다.' 등 시스템 줄은 skip.
  패턴에 안 맞는 줄은 '직전 메시지의 여러 줄 연장'으로 보고 이어붙인다(멀티라인 메시지 대비).

■ 발화자 → A/B
  한 파일(=한 방) 안에서 '먼저 등장한 사람'을 A, 다른 사람을 B 로 고정.
  (팀 규칙 '작은 sender_id=A' 를 파일 단위로 근사. 방 안에서 일관되면 학습엔 문제 없음.)

■ 맥락 범위
  대상 앞의 같은 방 메시지를 최대 MAX_CONTEXT 줄, 단 실제 시각 간격이 MAX_GAP_MIN 분을 넘으면
  '다른 대화'로 보고 끊는다(날짜가 다르면 자연히 끊김). export_training_data.py 와 같은 기본값.

■ 출력: 파일마다 따로 (3명이 나눠 라벨링하기 좋게)
  <out_dir>/to_label_<방이름>.csv  로 입력 파일당 1개씩 생성.

■ ⚠️ 개인정보
  실제(롤플레이) 대화다. 결과 CSV 는 git/외부에 올리지 말 것. (training/.gitignore 가 *.csv, data/ 무시)

usage:
  python kakao_to_label_csv.py <out_dir> <in1.txt> [in2.txt ...]
예:
  python kakao_to_label_csv.py data \\
      "C:/Users/SSAFY/Downloads/KakaoTalk_..._1주일.txt" \\
      "C:/Users/SSAFY/Downloads/KakaoTalk_..._2년차.txt"
"""
import os, sys, csv, re
from datetime import datetime

MAX_CONTEXT = int(os.environ.get("KAKAO_MAX_CONTEXT", "6"))   # 대상 앞에 붙일 최대 맥락 줄 수
MAX_GAP_MIN = int(os.environ.get("KAKAO_MAX_GAP_MIN", "30"))  # 이 분(min)을 넘으면 다른 대화로 보고 끊음

# (1) 대괄호형: [이름] [오후 3:11] 내용
BRACKET_RE = re.compile(
    r"^\[(?P<name>.+?)\]\s*\[(?P<ap>오전|오후)\s*(?P<h>\d{1,2}):(?P<m>\d{2})\]\s?(?P<text>.*)$")
# (2) 날짜쉼표형: 2026년 8월 1일 오후 10:35, 이름 : 내용
DATE_RE = re.compile(
    r"^(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s+(?P<ap>오전|오후)\s*"
    r"(?P<h>\d{1,2}):(?P<m>\d{2}),\s*(?P<name>.+?)\s*:\s?(?P<text>.*)$")
# 날짜 구분선(대괄호형 파일에서 날짜 획득): --------------- 2026년 8월 4일 화요일 ---------------
DIVIDER_DATE_RE = re.compile(r"-{3,}\s*(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일")
DATE_DIVIDER_RE = re.compile(r"^-{3,}.*-{3,}$")

# 내용이 없거나 감정 라벨링 대상이 아닌 시스템/미디어 줄 → 통째로 skip
SKIP_TEXTS = {
    "메시지가 삭제되었습니다.", "삭제된 메시지입니다.",
    "사진", "동영상", "이모티콘",
}

# 대괄호형에 날짜 구분선이 하나도 없을 때 쓰는 기준 날짜(같은 날 가정, 시각차만 사용)
BASE_YEAR, BASE_MONTH, BASE_DAY = 2000, 1, 1


def make_dt(y, mo, d, ap, h, m):
    """오전/오후 12시간제 → datetime. 날짜 없으면 기준 날짜 사용."""
    h = int(h)
    if ap == "오전":
        if h == 12:
            h = 0
    else:  # 오후
        if h != 12:
            h += 12
    return datetime(int(y), int(mo), int(d), h, int(m))


def parse_file(path):
    """카톡 txt 한 개 → 메시지 리스트 [{name, time, dt, text}] (등장 순서)."""
    msgs = []
    cur_y, cur_mo, cur_d = BASE_YEAR, BASE_MONTH, BASE_DAY  # 대괄호형용 현재 날짜
    with open(path, encoding="utf-8-sig") as f:  # utf-8-sig: 파일 앞 BOM 제거(첫 메시지 누락 방지)
        for raw in f:
            line = raw.rstrip("\n")
            s = line.strip()
            if not s:
                continue

            # 날짜 구분선이면 현재 날짜만 갱신하고 넘어감
            if DATE_DIVIDER_RE.match(s):
                dm = DIVIDER_DATE_RE.search(s)
                if dm:
                    cur_y, cur_mo, cur_d = dm.group("y"), dm.group("mo"), dm.group("d")
                continue

            m2 = DATE_RE.match(line)   # (2) 날짜쉼표형 우선 시도(자체 날짜 보유)
            m1 = BRACKET_RE.match(line) if not m2 else None  # (1) 대괄호형

            mo = m2 or m1
            if mo:
                text = mo.group("text").strip()
                if not text or text in SKIP_TEXTS:
                    continue
                if m2:
                    y, mon, d = mo.group("y"), mo.group("mo"), mo.group("d")
                else:
                    y, mon, d = cur_y, cur_mo, cur_d
                msgs.append({
                    "name": mo.group("name").strip(),
                    "time": f"{y}-{int(mon):02d}-{int(d):02d} {mo.group('ap')} {int(mo.group('h'))}:{mo.group('m')}",
                    "dt": make_dt(y, mon, d, mo.group("ap"), mo.group("h"), mo.group("m")),
                    "text": text,
                })
            else:
                # 패턴 불일치: 시스템 줄이면 skip, 아니면 직전 메시지의 다음 줄로 이어붙임
                if s in SKIP_TEXTS:
                    continue
                if msgs:
                    msgs[-1]["text"] += "\n" + s
    return msgs


def room_name(path):
    """방 이름: 파일 첫 줄 'X 님과 카카오톡 대화' 의 X, 없으면 파일명(확장자 제거)."""
    try:
        with open(path, encoding="utf-8-sig") as f:
            first = f.readline().strip()
        m = re.match(r"^(.*?)\s*님과 카카오톡 대화$", first)
        if m and m.group(1):
            return m.group(1)
    except OSError:
        pass
    stem = os.path.splitext(os.path.basename(path))[0]
    return re.sub(r"^\[[^\]]*\]\s*", "", stem)  # 앞의 '[데이터 태그]' 는 방 이름에서 제거


def slugify(name):
    """방 이름 → 파일명에 안전한 슬러그(윈도우 금지문자 제거, 공백→_)."""
    s = re.sub(r"[\[\]<>:\"/\\|?*]", "", name)   # 대괄호·윈도우 금지문자 제거
    s = re.sub(r"\s+", "_", s.strip())
    return s or "room"


def convert_one(path, out_dir):
    """입력 txt 1개 → CSV 1개. (rows 수, 출력경로) 반환."""
    room = room_name(path)
    msgs = parse_file(path)
    if not msgs:
        print(f"[주의] 메시지 0건: {path}")
        return 0, None

    # 발화자 → A/B (먼저 등장한 사람이 A)
    spk, order = {}, []
    for m in msgs:
        if m["name"] not in spk:
            spk[m["name"]] = "A" if not order else "B"
            order.append(m["name"])
    if len(order) > 2:
        print(f"[주의] {room}: 발화자 3명 이상({order}). 첫 2명만 A/B, 나머지는 B 취급.")
        for n in order[2:]:
            spk[n] = "B"

    rows = []
    for idx, target in enumerate(msgs):
        ctx = []
        for prev in reversed(msgs[:idx]):
            if (target["dt"] - prev["dt"]).total_seconds() / 60.0 > MAX_GAP_MIN:
                break  # 실제 시각 간격이 크면(=다른 대화/다른 날) 맥락 끊음
            ctx.append(prev)
            if len(ctx) >= MAX_CONTEXT:
                break
        ctx.reverse()  # 시간 오름차순
        context_text = "\n".join(f"{spk[m['name']]}: {m['text']}" for m in ctx)

        rows.append({
            "source": room,
            "msg_no": idx + 1,
            "time": target["time"],
            "speaker": spk[target["name"]],      # A/B (context 와 일치)
            "speaker_name": target["name"],       # 실제 이름 (읽기 편하라고)
            "context": context_text,              # 학습에 쓰이는 A/B 맥락
            "text": target["text"],               # 감정 매길 대상
            "model_hint": "",                     # 신규 데이터라 예측 힌트 없음(비움)
            "label": "",                          # ← 사람이 15라벨 중 하나로 채움
        })

    out_path = os.path.join(out_dir, f"to_label_{slugify(room)}.csv")
    fields = ["source", "msg_no", "time", "speaker", "speaker_name",
              "context", "text", "model_hint", "label"]
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:  # utf-8-sig: 엑셀 한글 안깨짐
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    return len(rows), out_path


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: python kakao_to_label_csv.py <out_dir> <in1.txt> [in2.txt ...]")
    out_dir, in_paths = sys.argv[1], sys.argv[2:]
    os.makedirs(os.path.abspath(out_dir), exist_ok=True)

    total = 0
    for path in in_paths:
        if not os.path.exists(path):
            sys.exit(f"입력 파일이 없습니다: {path}")
        n, out_path = convert_one(path, out_dir)
        if out_path:
            print(f"  {n:>4}행 → {out_path}")
            total += n

    print(f"\n총 {total}행, CSV {len(in_paths)}개 생성.")
    print("다음 단계:")
    print("  1) 각 CSV 를 엑셀로 열어 label 칸을 15라벨 중 하나로 채운다(빈칸은 학습에서 자동 제외).")
    print("     기쁨 설렘 편안 걱정 놀람 평범 부끄러움 궁금 슬픔 화남 당황 힘듦 고마움 미안함 서운함")
    print("  2) 채운 CSV 들을 train_context.py 로 재학습(여러 개면 먼저 합친다).")
    print("  [주의] 개인정보 - 이 CSV 들은 git/외부에 올리지 마세요.")


if __name__ == "__main__":
    main()
