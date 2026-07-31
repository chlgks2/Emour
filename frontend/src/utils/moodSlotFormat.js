/**
 * 무드 슬롯 표기 헬퍼.
 * 컴포넌트 파일에서 함수를 같이 내보내면 Fast Refresh 가 깨지므로 따로 둔다.
 */

/** 하루 안에서의 분 위치 -> '오후 3시' / '오후 3:30' */
export function formatSlotTime(minutesOfDay) {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const period = hour < 12 ? "오전" : "오후";
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return minute === 0
    ? `${period} ${display}시`
    : `${period} ${display}:${String(minute).padStart(2, "0")}`;
}
