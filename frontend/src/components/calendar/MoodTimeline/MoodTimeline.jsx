import { Pencil, Plus } from "lucide-react";
import { getMoodColor, getMoodLabel } from "../../../utils/moodEmotion";
import { formatSlotTime } from "../../../utils/moodSlotFormat";
import { buildDaySlotGrid } from "../../../utils/moodSlotGrid";
import styles from "./MoodTimeline.module.css";

/**
 * 하루의 시간대별 기분 — **가운데 축 타임라인**.
 *
 * 시간이 위에서 아래로 흐르는 한 줄기가 가운데에 있고, 그 위에 두 사람의
 * 감정 원이 나란히 놓인다. 메모는 각자의 바깥쪽(나=왼쪽, 상대=오른쪽)으로 뻗는다.
 *
 * ── 왜 이 모양인가 ────────────────────────────────────────────────
 * 두 흐름을 축 하나를 두고 마주 보게 놓는 건 비교형 타임라인의 오래된 방법이고,
 * 지금도 그대로 통한다. 좌우 대칭이라 "같은 시간에 우리가 어땠나"가 한 줄로 읽힌다.
 * 이전의 2열 카드 격자는 같은 시각의 두 칸이 각자 상자를 갖고 있어서, 시간의
 * 흐름보다 칸의 경계가 먼저 보였다.
 *
 * ── 감정 이름을 지우지 않은 이유 ──────────────────────────────────
 * 색만으로 뜻을 전하면 안 된다는 건 접근성의 기본이다(색각 이상·저시력).
 * 다만 '매우 좋음'을 여덟 시간대 × 두 사람 = 열여섯 번 반복하면 화면이 시끄럽다.
 * 그래서 이름은 원 옆이 아니라 **메모 쪽 머리글**로 보낸다. 훑을 때는 원의 색이,
 * 읽을 때는 그 줄의 이름이 답한다. 원 자체에는 aria-label 로 이름이 들어간다.
 *
 * ── '나 / 상대방'을 매 줄에 쓰지 않는 이유 ────────────────────────
 * 좌우가 고정이므로 맨 위에 한 번만 밝히면 된다. 줄마다 붙이면 정작 읽어야 할
 * 감정 이름·메모와 같은 크기의 글자가 두 배로 늘어난다.
 *
 * @param {Array}  mySlots      moodApi 슬롯 (내 기록)
 * @param {Array}  partnerSlots 상대 기록
 * @param {object} window       알림 설정 { startTime, endTime, intervalHours }
 * @param {number|null} nowMinutes 오늘이면 현재 시각(분). 지난 날짜면 null
 * @param {(payload:{slot, minutesOfDay}) => void} onEditSlot
 *   현재 진행 중인 슬롯에서만 수정 또는 등록
 */
export default function MoodTimeline({
  mySlots = [],
  partnerSlots = [],
  window,
  nowMinutes = null,
  onEditSlot,
}) {
  const grid = buildDaySlotGrid({ mySlots, partnerSlots, window, nowMinutes });

  if (grid.length === 0) {
    return <p className={`empty-note ${styles.emptyText}`}>표시할 시간대가 없어요.</p>;
  }

  /*
   * 기록·수정 버튼은 지금 진행 중인 시간대에만 붙는다. (moodSlotGrid.isEditable)
   * 서버도 같은 규칙이라 지난 시간대는 등록도 수정도 거절된다.
   * 버튼이 하나도 없으면 고장 난 것처럼 보여서 이유를 적어둔다.
   */
  const hasEditableSlot = grid.some((row) => row.isEditable);

  return (
    <div className={styles.timeline}>
      <div className={styles.head}>
        <span className={styles.headMine}>나</span>
        <span className={styles.headAxis} aria-hidden="true" />
        <span className={styles.headPartner}>상대방</span>
      </div>

      {!hasEditableSlot && (
        <p className={`empty-note ${styles.emptyText}`}>
          {nowMinutes === null
            ? "지난 날짜는 볼 수만 있어요."
            : "지금은 기록할 수 있는 시간대가 아니에요."}
        </p>
      )}

      {/* 축(세로선)은 ol 의 가상 요소다. 줄마다 그으면 칸 사이에서 끊긴다. */}
      <ol className={styles.rows}>
        {grid.map((row) => (
          <li
            key={row.minutesOfDay}
            className={[
              styles.row,
              row.isFuture ? styles.rowFuture : "",
              row.isEditable ? styles.rowNow : "",
            ].join(" ")}
          >
            <div className={`${styles.side} ${styles.sideMine}`}>
              <Entry
                slot={row.mine}
                emptyLabel={row.isFuture ? "" : "기록 없음"}
                onEdit={
                  row.isEditable
                    ? () =>
                        onEditSlot?.({
                          slot: row.mine,
                          minutesOfDay: row.minutesOfDay,
                        })
                    : undefined
                }
              />
            </div>

            <div className={styles.axis}>
              <span className={styles.time}>{formatSlotTime(row.minutesOfDay)}</span>
              <span className={styles.dots}>
                <MoodDot slot={row.mine} who="나" />
                <MoodDot slot={row.partner} who="상대방" />
              </span>
            </div>

            <div className={`${styles.side} ${styles.sidePartner}`}>
              <Entry
                slot={row.partner}
                emptyLabel={row.isFuture ? "" : "기록 없음"}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * 축 위의 감정 원.
 * 기록이 없으면 점선 테두리만 남긴 빈 원으로 자리를 지킨다.
 * 아예 비우면 두 원의 간격이 무너져 어느 쪽이 비었는지 알 수 없다.
 */
function MoodDot({ slot, who }) {
  if (!slot) {
    return <span className={`${styles.dot} ${styles.dotEmpty}`} aria-label={`${who} 기록 없음`} />;
  }

  return (
    <span
      className={styles.dot}
      style={{ background: getMoodColor(slot.moodType) }}
      aria-label={`${who} ${getMoodLabel(slot.moodType)}`}
    />
  );
}

/** 축 바깥쪽 한 사람 몫 — 감정 이름 + 메모 (+ 내 줄에만 기록/수정) */
function Entry({ slot, emptyLabel, onEdit }) {
  if (!slot) {
    return (
      <>
        {emptyLabel && <p className={styles.none}>{emptyLabel}</p>}
        {onEdit && (
          <button type="button" className={styles.addBtn} onClick={onEdit}>
            <Plus size={11} aria-hidden="true" />
            기록하기
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <p className={styles.moodName}>{getMoodLabel(slot.moodType)}</p>

      {slot.reason && <p className={styles.reason}>{slot.reason}</p>}

      {onEdit && (
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          <Pencil size={11} aria-hidden="true" />
          수정
        </button>
      )}
    </>
  );
}
