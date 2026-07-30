import { useId, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import DayMoodDetail from "./DayMoodDetail";
import {
  addMonths,
  buildDayGradient,
  formatDateKey,
  getMonthMatrix,
  getMoodLabel,
} from "../../utils/moodEmotion";
import { useModalA11y } from "../../hooks/useModalA11y";
import styles from "./MonthCalendarModal.module.css";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {Date} cursorDate 현재 보여줄 월
 * @param {(nextCursor: Date) => void} onChangeMonth 이전/다음 달 이동 시 호출 (부모가 데이터 로드)
 * @param {Record<string, {myMood, partnerMood}>} moodRecords - key 는 mood.mood_date ('YYYY-MM-DD')
 * @param {(moodDate: string) => void} onEditMyMood
 */
export default function MonthCalendarModal({
  open,
  onClose,
  cursorDate,
  onChangeMonth,
  moodRecords,
  onEditMyMood,
}) {
  const [expandedMoodDate, setExpandedMoodDate] = useState(null);
  const titleId = useId();
  const sheetRef = useModalA11y(open, onClose);

  const weeks = useMemo(() => getMonthMatrix(cursorDate), [cursorDate]);
  const currentMonth = cursorDate.getMonth();

  if (!open) return null;

  // 닫을 때 펼쳐둔 날짜를 초기화해서, 다시 열었을 때 이전 선택이 남아있지 않도록 한다.
  const handleClose = () => {
    setExpandedMoodDate(null);
    onClose();
  };

  const handleSelectDay = (moodDate) => {
    setExpandedMoodDate((cur) => (cur === moodDate ? null : moodDate));
  };

  const handlePrevMonth = () => {
    setExpandedMoodDate(null);
    onChangeMonth(addMonths(cursorDate, -1));
  };

  const handleNextMonth = () => {
    setExpandedMoodDate(null);
    onChangeMonth(addMonths(cursorDate, 1));
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          <button type="button" aria-label="이전 달" className={styles.navBtn} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span id={titleId} className={styles.title} aria-live="polite">
            {cursorDate.getFullYear()}년 {cursorDate.getMonth() + 1}월
          </span>
          <button type="button" aria-label="다음 달" className={styles.navBtn} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
          <button type="button" aria-label="닫기" className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className={styles.weekdayLabel}>
              {label}
            </span>
          ))}
        </div>

        <div className={styles.grid}>
          {weeks.map((week, wi) => {
            const expandedInThisWeek = week.find((d) => formatDateKey(d) === expandedMoodDate);
            return (
              <div key={wi} className={styles.weekBlock}>
                <div className={styles.weekRow}>
                  {week.map((d) => {
                    const moodDate = formatDateKey(d);
                    const record = moodRecords[moodDate];
                    const isOtherMonth = d.getMonth() !== currentMonth;
                    const isSelected = moodDate === expandedMoodDate;
                    // 원의 그라데이션만으로는 스크린 리더가 아무 정보를 못 얻으므로 라벨로 보강
                    const moodSummary = [
                      record?.myMood && `나 ${getMoodLabel(record.myMood.moodType)}`,
                      record?.partnerMood &&
                        `상대방 ${getMoodLabel(record.partnerMood.moodType)}`,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <button
                        type="button"
                        key={moodDate}
                        className={styles.dayItem}
                        aria-pressed={isSelected}
                        aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일${
                          moodSummary ? ` · ${moodSummary}` : " · 기록 없음"
                        }`}
                        onClick={() => handleSelectDay(moodDate)}
                      >
                        <span
                          className={`${styles.moodCircle} ${isSelected ? styles.moodCircleSelected : ""} ${
                            isOtherMonth ? styles.moodCircleFaded : ""
                          }`}
                          style={{ background: buildDayGradient(record?.myMood, record?.partnerMood) }}
                        />
                        <span className={`${styles.dayNumber} ${isOtherMonth ? styles.dayNumberFaded : ""}`}>
                          {d.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {expandedInThisWeek && (
                  <DayMoodDetail
                    dateLabel={`${cursorDate.getMonth() + 1}월 ${expandedInThisWeek.getDate()}일`}
                    myMood={moodRecords[expandedMoodDate]?.myMood ?? null}
                    partnerMood={moodRecords[expandedMoodDate]?.partnerMood ?? null}
                    onEditMyMood={() => onEditMyMood(expandedMoodDate)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
