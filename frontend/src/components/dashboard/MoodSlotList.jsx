import { Pencil, Plus } from "lucide-react";
import { getMoodColor, getMoodLabel } from "../../utils/moodEmotion";
import { formatSlotTime } from "../../utils/moodSlotFormat";
import { buildDaySlotGrid } from "../../utils/moodSlotGrid";
import styles from "./MoodSlotList.module.css";

/**
 * 하루의 시간대별 기분.
 *
 * 기록이 있는 슬롯만 나열하면 지나간 시간대에 기분을 새로 넣을 방법이 없어서,
 * 알림 설정으로 만든 하루치 슬롯을 전부 깔고 각 칸을 따로 등록/수정하게 한다.
 * 대시보드(선택한 날짜)와 캘린더가 같은 컴포넌트를 쓰므로 동작이 어디서나 같다.
 *
 * @param {Array}  mySlots      moodApi 슬롯 (내 기록)
 * @param {Array}  partnerSlots 상대 기록
 * @param {object} window       알림 설정 { startTime, endTime, intervalHours }
 * @param {number|null} nowMinutes 오늘이면 현재 시각(분). 지난 날짜면 null
 * @param {(payload:{slot, minutesOfDay}) => void} onEditSlot
 *   slot 이 있으면 수정, 없으면 그 시간대에 새로 등록
 */
export default function MoodSlotList({
  mySlots = [],
  partnerSlots = [],
  window,
  nowMinutes = null,
  onEditSlot,
}) {
  const grid = buildDaySlotGrid({ mySlots, partnerSlots, window, nowMinutes });

  if (grid.length === 0) {
    return <p className={styles.emptyText}>표시할 시간대가 없어요.</p>;
  }

  return (
    <ul className={styles.list}>
      {grid.map((row) => (
        <li
          key={row.minutesOfDay}
          className={`${styles.row} ${row.isFuture ? styles.rowFuture : ""}`}
        >
          <span className={styles.time}>{formatSlotTime(row.minutesOfDay)}</span>

          <div className={styles.pair}>
            <SlotCell
              label="나"
              slot={row.mine}
              // 아직 오지 않은 시간대는 기록할 수 없다.
              onEdit={
                row.isFuture
                  ? undefined
                  : () => onEditSlot?.({ slot: row.mine, minutesOfDay: row.minutesOfDay })
              }
            />
            <SlotCell label="상대방" slot={row.partner} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SlotCell({ label, slot, onEdit }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>

      {slot ? (
        <>
          <span className={styles.badge} style={{ background: getMoodColor(slot.moodType) }}>
            {getMoodLabel(slot.moodType)}
          </span>

          {slot.reason ? (
            <p className={styles.reason}>{slot.reason}</p>
          ) : (
            <p className={styles.reasonMuted}>사유 없음</p>
          )}

          {onEdit && (
            <button type="button" className={styles.editBtn} onClick={onEdit}>
              <Pencil size={11} aria-hidden="true" />
              수정
            </button>
          )}
        </>
      ) : onEdit ? (
        <button type="button" className={styles.addBtn} onClick={onEdit}>
          <Plus size={11} aria-hidden="true" />
          기록하기
        </button>
      ) : (
        <span className={styles.none}>기록 없음</span>
      )}
    </div>
  );
}
