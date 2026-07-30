import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../common/Button";
import DayMoodDetail from "./DayMoodDetail";
import { buildDayGradient, getMoodLabel } from "../../utils/moodEmotion";
import styles from "./EmotionCalendarStrip.module.css";

// 그라데이션 원만으로는 스크린 리더가 정보를 얻을 수 없어 라벨로 보강한다.
function buildDayAriaLabel(day) {
  const moodSummary = [
    day.myMood && `나 ${getMoodLabel(day.myMood.moodType)}`,
    day.partnerMood && `상대방 ${getMoodLabel(day.partnerMood.moodType)}`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${day.dayOfMonth}일${moodSummary ? ` · ${moodSummary}` : " · 기록 없음"}`;
}

/**
 * @param {string} monthLabel 예: "7월"
 * @param {Array<{dayOfMonth:number, moodDate:string, myMood:object|null, partnerMood:object|null}>} weekDays
 *   현재 보여줄 한 주(7일). moodDate 는 mood.mood_date 와 동일한 'YYYY-MM-DD'.
 * @param {() => void} onPrevWeek 이전 주로 이동
 * @param {() => void} onNextWeek 다음 주로 이동
 * @param {() => void} onMonthClick 월 라벨 클릭 시 월간 캘린더 모달 오픈
 * @param {() => void} onRegisterClick 오늘의 감정 등록 버튼 클릭
 * @param {string|null} selectedMoodDate 현재 확장되어 보이는 날짜
 * @param {(moodDate: string) => void} onSelectDate 원 클릭(토글) 핸들러
 * @param {(moodDate: string) => void} onEditMyMood 상세 패널의 "내 감정 수정/등록" 클릭 핸들러
 */
export default function EmotionCalendarStrip({
  monthLabel,
  weekDays,
  onPrevWeek,
  onNextWeek,
  onMonthClick,
  onRegisterClick,
  selectedMoodDate,
  onSelectDate,
  onEditMyMood,
}) {
  const selectedDay = weekDays.find((d) => d.moodDate === selectedMoodDate) ?? null;

  return (
    <div className={styles.card}>
      <div className={styles.monthRow}>
        <button type="button" aria-label="이전 주" className={styles.arrowBtn} onClick={onPrevWeek}>
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={styles.monthLabel}
          onClick={onMonthClick}
          aria-label={`${monthLabel} 월간 달력 열기`}
        >
          {monthLabel}
        </button>
        <button type="button" aria-label="다음 주" className={styles.arrowBtn} onClick={onNextWeek}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.dayRow}>
        {weekDays.map((day) => {
          const isSelected = day.moodDate === selectedMoodDate;
          return (
            <button
              type="button"
              key={day.moodDate}
              className={styles.dayItem}
              onClick={() => onSelectDate(day.moodDate)}
              aria-pressed={isSelected}
              aria-label={buildDayAriaLabel(day)}
            >
              <span
                className={`${styles.moodCircle} ${isSelected ? styles.moodCircleSelected : ""}`}
                style={{ background: buildDayGradient(day.myMood, day.partnerMood) }}
              />
              <span className={styles.dayNumber}>{day.dayOfMonth}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <DayMoodDetail
          dateLabel={`${monthLabel} ${selectedDay.dayOfMonth}일`}
          myMood={selectedDay.myMood}
          partnerMood={selectedDay.partnerMood}
          onEditMyMood={() => onEditMyMood(selectedDay.moodDate)}
        />
      )}

      <Button
        variant="primary"
        size="sm"
        onClick={onRegisterClick}
        style={{ background: "var(--color-white)", color: "var(--color-primary)" }}
      >
        오늘의 감정 등록하기
      </Button>
    </div>
  );
}
