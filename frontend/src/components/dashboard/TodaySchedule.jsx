import { SCHEDULE_TYPE } from "../../constants/enums";
import styles from "./TodaySchedule.module.css";

/**
 * @param {Array} schedules - couple_schedule 기준
 *   { scheduleId, name, description, scheduleDate, scheduleTime, scheduleType, yearlyRecurring }
 *
 * ⚠️ 기존 목업의 `done`(일정 완료 여부)에 해당하는 컬럼이 ERD에 없어서,
 *    흐리게 처리하는 조건을 "scheduleTime 이 이미 지났는지"로 파생 계산한다.
 *    "완료"가 아니라 "지난 일정"이므로 취소선 대신 흐리게만 표시한다.
 *    완료 체크 기능을 실제로 쓸 거라면 couple_schedule 에 컬럼 추가가 필요하다.
 */
export default function TodaySchedule({ schedules = [] }) {
  const nowMinutes = (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  const isPast = (scheduleTime) => {
    if (!scheduleTime) return false;
    const [hour, minute] = scheduleTime.split(":").map(Number);
    if (Number.isNaN(hour)) return false;
    return hour * 60 + (minute || 0) < nowMinutes;
  };

  return (
    // 상자 없이 배경 위에 바로. 시간 순서는 왼쪽 세로선이 만들어준다.
    <section className="surface-plain" aria-labelledby="today-schedule-title">
      <header className="section-head">
        <h2 id="today-schedule-title" className="section-title">
          오늘의 주요 일정
        </h2>
        <span className="section-meta">{schedules.length}건</span>
      </header>

      {schedules.length === 0 ? (
        <p className={`empty-note ${styles.emptyText}`}>오늘은 등록된 일정이 없어요.</p>
      ) : (
        <ul className={styles.timeline}>
          {schedules.map((schedule) => (
            <li
              key={schedule.scheduleId}
              className={`${styles.item} ${isPast(schedule.scheduleTime) ? styles.past : ""}`}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.time}>
                {/* scheduleTime 은 TIME 컬럼이라 'HH:mm:ss' 로 올 수 있어 앞 5자만 사용.
                    시간 미지정(NULL) 일정은 '종일'로 표시한다. */}
                {schedule.scheduleTime ? schedule.scheduleTime.slice(0, 5) : "종일"}
              </span>
              <span className={styles.name}>{schedule.name}</span>
              {schedule.scheduleType === SCHEDULE_TYPE.ANNIVERSARY && (
                <span className={styles.badge}>기념일</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
