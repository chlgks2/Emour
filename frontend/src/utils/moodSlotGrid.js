/**
 * 하루의 무드 슬롯 격자.
 *
 * 알림 설정(시작~종료, 간격)으로 하루의 슬롯을 전부 만들어 두고, 기록이 있으면 얹고
 * 없으면 빈 슬롯으로 남긴다. 그래야 그날의 흐름을 시간 순서대로 읽을 수 있다.
 *
 * 등록·수정은 진행 중인 슬롯에서만 된다(isEditable). 지난 시간대는 보기 전용이다.
 * 서버도 같은 규칙이라(MoodService 가 MoodSlotCalculator.currentSlot 과 대조한다)
 * 여기서 열어줘도 요청이 거절된다.
 */

/** 알림 설정을 못 불러왔을 때 쓰는 기본값 (백엔드 mood_notification 기본과 동일) */
export const DEFAULT_MOOD_WINDOW = {
  startTime: "09:00:00",
  endTime: "21:00:00",
  intervalHours: 2,
};

function toMinutes(timeString) {
  const [hour, minute] = String(timeString ?? "")
    .split(":")
    .map(Number);
  if (!Number.isFinite(hour)) return null;
  return hour * 60 + (Number.isFinite(minute) ? minute : 0);
}

/**
 * 하루에 존재하는 슬롯 시각 목록(분 단위).
 * 종료가 시작보다 빠르면(자정을 넘기는 설정) 다음날로 넘어가므로 그날 안쪽까지만 만든다.
 */
export function buildSlotMinutes(window = DEFAULT_MOOD_WINDOW) {
  const start = toMinutes(window.startTime) ?? toMinutes(DEFAULT_MOOD_WINDOW.startTime);
  const rawEnd = toMinutes(window.endTime) ?? toMinutes(DEFAULT_MOOD_WINDOW.endTime);
  const intervalHours = Number(window.intervalHours) || DEFAULT_MOOD_WINDOW.intervalHours;
  const step = Math.max(1, intervalHours) * 60;

  const end = rawEnd > start ? rawEnd : 24 * 60;

  const minutes = [];
  for (let m = start; m < end; m += step) {
    minutes.push(m);
  }
  return minutes;
}

/**
 * 슬롯 격자 + 기존 기록을 합친다.
 *
 * @param {Array} mySlots       moodApi 슬롯 (내 기록)
 * @param {Array} partnerSlots  상대 기록
 * @param {object} window       알림 설정 { startTime, endTime, intervalHours }
 * @param {number|null} nowMinutes 오늘이면 현재 시각(분). 미래 슬롯을 잠그는 데 쓴다. 과거 날짜면 null
 * @returns {Array<{minutesOfDay, mine, partner, isFuture, isEditable}>} 이른 시간 -> 늦은 시간
 */
export function buildDaySlotGrid({
  mySlots = [],
  partnerSlots = [],
  window = DEFAULT_MOOD_WINDOW,
  nowMinutes = null,
}) {
  const byMine = new Map(mySlots.map((s) => [s.minutesOfDay, s]));
  const byPartner = new Map(partnerSlots.map((s) => [s.minutesOfDay, s]));
  const rawEnd =
    toMinutes(window?.endTime) ??
    toMinutes(DEFAULT_MOOD_WINDOW.endTime);
  const rawStart =
    toMinutes(window?.startTime) ??
    toMinutes(DEFAULT_MOOD_WINDOW.startTime);
  const intervalHours =
    Number(window?.intervalHours) ||
    DEFAULT_MOOD_WINDOW.intervalHours;
  const intervalMinutes =
    Math.max(1, intervalHours) * 60;
  const windowEnd =
    rawEnd > rawStart
      ? rawEnd
      : 24 * 60;

  // 설정에서 나온 슬롯 + 실제 기록에만 있는 시각(설정을 바꾸기 전 기록 등)을 합집합으로
  const minutes = new Set(buildSlotMinutes(window));
  mySlots.forEach((s) => minutes.add(s.minutesOfDay));
  partnerSlots.forEach((s) => minutes.add(s.minutesOfDay));

  return [...minutes]
    .sort((a, b) => a - b)
    .map((minutesOfDay) => {
      const slotEnd = Math.min(
        minutesOfDay + intervalMinutes,
        windowEnd,
      );

      return {
        minutesOfDay,
        mine: byMine.get(minutesOfDay) ?? null,
        partner: byPartner.get(minutesOfDay) ?? null,
        // 아직 오지 않은 시간대는 기록할 수 없다.
        isFuture:
          nowMinutes !== null &&
          minutesOfDay > nowMinutes,
        // 백엔드와 동일하게 현재 진행 중인 알림 슬롯만 등록·수정할 수 있다.
        isEditable:
          nowMinutes !== null &&
          nowMinutes >= minutesOfDay &&
          nowMinutes < slotEnd,
      };
    });
}
