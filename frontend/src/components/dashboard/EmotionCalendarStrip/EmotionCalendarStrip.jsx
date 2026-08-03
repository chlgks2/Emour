import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MoodSlotList from "../MoodSlotList/MoodSlotList";
import { buildDayGradient, getMoodLabel } from "../../../utils/moodEmotion";
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
 * @param {string|null} selectedMoodDate 현재 확장되어 보이는 날짜
 * @param {(moodDate: string) => void} onSelectDate 원 클릭(토글) 핸들러
 * @param {{mySlots:Array, partnerSlots:Array}} detailMood 선택한 날짜의 무드 슬롯
 * @param {object} moodWindow  알림 설정 { startTime, endTime, intervalHours }
 * @param {number|null} detailNowMinutes 선택한 날짜가 오늘이면 현재 시각(분), 아니면 null
 * @param {({slot, minutesOfDay}) => void} onEditSlot 시간대별 기분 등록/수정
 */
export default function EmotionCalendarStrip({
  monthLabel,
  weekDays,
  onPrevWeek,
  onNextWeek,
  onMonthClick,
  selectedMoodDate,
  onSelectDate,
  detailMood = { mySlots: [], partnerSlots: [] },
  moodWindow,
  detailNowMinutes = null,
  onEditSlot,
}) {
  const selectedDay = weekDays.find((d) => d.moodDate === selectedMoodDate) ?? null;

  /*
   * 시간대 목록은 접은 채로 시작한다.
   * 하루 8칸(3시간 간격 기준)이 늘 펼쳐져 있으면 이 카드만 화면 절반을 먹고,
   * 정작 위의 주간 감정 원과 아래 섹션들이 밀려 내려간다.
   * 그날의 대략적인 기분은 이미 감정 원 색으로 보이므로, 자세히 볼 때만 편다.
   *
   * 펼치는 수단은 감정 원 자체다. 따로 '펼치기' 버튼을 두면 같은 일을 하는
   * 조작이 둘이 되고, 날짜를 고르는 동작과 펼치는 동작이 따로 노는 것처럼 보인다.
   *   · 다른 날짜를 누르면  -> 그 날짜로 옮기고 편다
   *   · 지금 날짜를 다시 누르면 -> 접는다
   */
  const [isSlotListOpen, setIsSlotListOpen] = useState(false);

  const handleSelectDate = (moodDate) => {
    if (moodDate === selectedMoodDate) {
      setIsSlotListOpen((previous) => !previous);
      return;
    }

    onSelectDate(moodDate);
    setIsSlotListOpen(true);
  };

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
          /*
           * 로즈 링은 "지금 펼쳐서 보고 있는 날" 표시다.
           * 선택 여부만으로 그렸더니, 접어 둔 상태에서도 링이 남아
           * 눌린 것처럼 보이는데 아래에는 아무것도 없는 상태가 됐다.
           */
          const isSelected =
            day.moodDate === selectedMoodDate && isSlotListOpen;
          return (
            <button
              type="button"
              key={day.moodDate}
              className={styles.dayItem}
              onClick={() => handleSelectDate(day.moodDate)}
              aria-expanded={isSelected}
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

      {/*
        위 감정 원이 이미 그날의 최근 기분 색을 보여주므로 '최근 기분' 요약란은 두지 않는다.
        날짜를 고르면 그날의 시간대별 기분이 이 카드 안에서 펼쳐진다.
      */}
      {selectedDay && isSlotListOpen && (
        <div className={styles.detail}>
          <p className={styles.detailLabel}>
            {monthLabel} {selectedDay.dayOfMonth}일
          </p>

          <MoodSlotList
            mySlots={detailMood.mySlots}
            partnerSlots={detailMood.partnerSlots}
            window={moodWindow}
            nowMinutes={detailNowMinutes}
            onEditSlot={onEditSlot}
          />
        </div>
      )}
    </div>
  );
}
