import { SCHEDULE_TYPE } from "../../../constants/enums";
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

  /*
   * 기념일은 타임라인에서 뺀다.
   * 타임라인은 "몇 시에 무엇을" 을 시간 순으로 늘어놓는 축인데, 기념일은
   * 시각이 없는 하루 전체의 일이라 그 축 위에 점으로 찍히면 어긋난다.
   * ('종일' 로 표시되면서 자정 근처에 놓인 일정처럼 읽혔다)
   * 오늘이 무슨 날인지가 먼저 읽혀야 하므로 맨 위에 따로 둔다.
   */
  const anniversaries = schedules.filter(
    (schedule) => schedule.scheduleType === SCHEDULE_TYPE.ANNIVERSARY
  );
  const timedSchedules = schedules.filter(
    (schedule) => schedule.scheduleType !== SCHEDULE_TYPE.ANNIVERSARY
  );

  return (
    // 상자 없이 배경 위에 바로. 시간 순서는 왼쪽 세로선이 만들어준다.
    <section className="surface-plain" aria-labelledby="today-schedule-title">
      <header className="section-head section-head-inline">
        <h2 id="today-schedule-title" className="section-title">
          오늘의 주요 일정
        </h2>
        <span className="section-meta">{schedules.length}건</span>
      </header>

      {schedules.length === 0 && (
        <p className={`empty-note ${styles.emptyText}`}>오늘은 등록된 일정이 없어요.</p>
      )}

      {/*
        기념일.
        하트 아이콘과 분홍 면을 걷어냈다. 한 섹션 안에서 기념일만 색 상자를
        두르니 '오늘의 주요 일정'의 일부가 아니라 끼어든 배너처럼 보였고,
        아래 타임라인의 로즈 점과 색이 겹쳐 무엇이 강조인지 흐려졌다.
        갈라 놓는 일은 작은 소제목이 한다. 항목은 이름만 담백하게 둔다.
      */}
      {anniversaries.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>기념일</h3>
          <ul className={styles.anniversaryList}>
            {anniversaries.map((anniversary) => (
              <li key={anniversary.scheduleId} className={styles.anniversaryItem}>
                {anniversary.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {timedSchedules.length > 0 && (
        <div className={styles.group}>
          {/* 기념일이 없으면 나눌 것이 없으므로 소제목도 두지 않는다 */}
          {anniversaries.length > 0 && <h3 className={styles.groupTitle}>일정</h3>}

          <ul className={styles.timeline}>
            {timedSchedules.map((schedule) => (
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
