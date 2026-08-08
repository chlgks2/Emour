import { Pencil, Plus } from "lucide-react";
import { getMoodColor, getMoodLabel } from "../../../utils/moodEmotion";
import { formatSlotTime } from "../../../utils/moodSlotFormat";
import { buildDaySlotGrid } from "../../../utils/moodSlotGrid";
import styles from "./MoodSlotList.module.css";

/**
 * 하루의 시간대별 기분.
 *
 * 알림 설정으로 만든 하루치 슬롯을 전부 깔아 그날의 흐름을 시간 순서대로 보여준다.
 * 등록·수정 버튼은 진행 중인 슬롯 한 칸에만 붙고, 지난 시간대는 보기 전용이다.
 * 대시보드(선택한 날짜)와 캘린더가 같은 컴포넌트를 쓰므로 동작이 어디서나 같다.
 *
 * @param {Array}  mySlots      moodApi 슬롯 (내 기록)
 * @param {Array}  partnerSlots 상대 기록
 * @param {object} window       알림 설정 { startTime, endTime, intervalHours }
 * @param {number|null} nowMinutes 오늘이면 현재 시각(분). 지난 날짜면 null
 * @param {(payload:{slot, minutesOfDay}) => void} onEditSlot
 *   현재 진행 중인 슬롯에서만 수정 또는 등록
 */
export default function MoodSlotList({
  mySlots = [],
  partnerSlots = [],
  window,
  nowMinutes = null,
  onEditSlot,
  canEdit = true,
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
  const hasEditableSlot = canEdit && grid.some((row) => row.isEditable);

  return (
    <>
      {!hasEditableSlot && nowMinutes !== null && (
        <p className={`empty-note ${styles.emptyText}`}>
          {canEdit
            ? "지금은 기록할 수 있는 시간대가 아니에요."
            : "연결된 상대방이 없어 기록을 수정할 수 없어요."}
        </p>
      )}

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
                onEdit={
                  canEdit && row.isEditable
                    ? () =>
                        onEditSlot?.({
                          slot: row.mine,
                          minutesOfDay: row.minutesOfDay,
                        })
                    : undefined
                }
              />
              <SlotCell label="상대방" slot={row.partner} />
            </div>
          </li>
        ))}
      </ul>
    </>
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
