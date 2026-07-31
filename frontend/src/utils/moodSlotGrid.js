/**
 * 하루의 무드 슬롯 격자.
 *
 * 기록이 있는 슬롯만 보여주면 "지나간 시간대에 기분을 새로 넣는" 동선이 없다.
 * 그래서 알림 설정(시작~종료, 간격)으로 하루의 슬롯을 전부 만들어 두고,
 * 기록이 있으면 얹고 없으면 빈 슬롯으로 남겨서 각각 따로 등록할 수 있게 한다.
 */

/** 알림 설정을 못 불러왔을 때 쓰는 기본값 (백엔드 mood_notification 기본과 동일) */
export const DEFAULT_MOOD_WINDOW = {
  startTime: "09:00:00",
  endTime: "21:00:00",
  intervalHours: 3,
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
 * @returns {Array<{minutesOfDay, mine, partner, isFuture}>} 이른 시간 -> 늦은 시간
 */
export function buildDaySlotGrid({
  mySlots = [],
  partnerSlots = [],
  window = DEFAULT_MOOD_WINDOW,
  nowMinutes = null,
}) {
  const byMine = new Map(mySlots.map((s) => [s.minutesOfDay, s]));
  const byPartner = new Map(partnerSlots.map((s) => [s.minutesOfDay, s]));

  // 설정에서 나온 슬롯 + 실제 기록에만 있는 시각(설정을 바꾸기 전 기록 등)을 합집합으로
  const minutes = new Set(buildSlotMinutes(window));
  mySlots.forEach((s) => minutes.add(s.minutesOfDay));
  partnerSlots.forEach((s) => minutes.add(s.minutesOfDay));

  return [...minutes]
    .sort((a, b) => a - b)
    .map((minutesOfDay) => ({
      minutesOfDay,
      mine: byMine.get(minutesOfDay) ?? null,
      partner: byPartner.get(minutesOfDay) ?? null,
      // 아직 오지 않은 시간대는 기록할 수 없다.
      isFuture: nowMinutes !== null && minutesOfDay > nowMinutes,
    }));
}
