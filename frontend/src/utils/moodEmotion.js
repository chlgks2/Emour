import { MOOD_TYPE } from "../constants/enums";

// 기록이 없는 날의 색 (CI 배경 계열의 중립 톤)
export const EMPTY_MOOD_COLOR = "#ECE5E3";

/**
 * mood.mood_type ENUM('VERY_HAPPY','HAPPY','NEUTRAL','SAD','VERY_SAD') 과 1:1 대응.
 * - moodType: 서버와 주고받는 값 (이것이 진짜 데이터)
 * - level: 감정 등록 모달의 5단계 슬라이더를 그리기 위한 화면 전용 순서값 (서버로 보내지 않음)
 * 배열 순서 = 슬라이더 왼쪽(안 좋음) → 오른쪽(좋음)
 */
/*
 * 색상은 CI 가이드의 "감정 요소" 5색을 그대로 쓴다.
 * 팔레트 색 수와 무드 단계 수가 같아 1:1로 대응시켰고,
 * 왼쪽(차갑고 가라앉음) → 오른쪽(따뜻하고 밝음) 순으로 배열했다.
 */
export const MOOD_TYPES = [
  { moodType: MOOD_TYPE.VERY_SAD, level: 1, label: "매우 안 좋음", color: "#B1A6D6" },
  { moodType: MOOD_TYPE.SAD, level: 2, label: "안 좋음", color: "#9ECCE6" },
  { moodType: MOOD_TYPE.NEUTRAL, level: 3, label: "보통", color: "#BED399" },
  { moodType: MOOD_TYPE.HAPPY, level: 4, label: "좋음", color: "#F6E192" },
  { moodType: MOOD_TYPE.VERY_HAPPY, level: 5, label: "매우 좋음", color: "#F7C291" },
];

export function getMoodMeta(moodType) {
  return MOOD_TYPES.find((m) => m.moodType === moodType) ?? null;
}

// 슬라이더 위치(1~5) -> moodType 메타. 화면 전용 헬퍼.
export function getMoodMetaByLevel(level) {
  return MOOD_TYPES.find((m) => m.level === level) ?? null;
}

export function getMoodColor(moodType) {
  return getMoodMeta(moodType)?.color ?? EMPTY_MOOD_COLOR;
}

export function getMoodLabel(moodType) {
  return getMoodMeta(moodType)?.label ?? "";
}

// 두 사람의 감정을 좌상단(나) / 우하단(상대방) 대각선으로 채우는 원형 그라데이션
// 한쪽만 등록된 경우 나머지 영역은 흰색으로 채움, 둘 다 없으면 연회색
export function buildDayGradient(myMood, partnerMood) {
  const myColor = myMood ? getMoodColor(myMood.moodType) : null;
  const partnerColor = partnerMood ? getMoodColor(partnerMood.moodType) : null;

  if (!myColor && !partnerColor) return EMPTY_MOOD_COLOR;

  const topLeft = myColor ?? "#FFFFFF";
  const bottomRight = partnerColor ?? "#FFFFFF";

  return `linear-gradient(135deg in oklch, ${topLeft} 0%, ${bottomRight} 100%)`;
}

// DATE 컬럼(mood_date, summary_date, schedule_date ...)과 동일한 'YYYY-MM-DD' 문자열 생성
export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 'YYYY-MM-DD' 문자열을 로컬 자정 Date 로 파싱.
 * new Date("2026-07-30") 은 UTC 자정으로 해석되어 UTC-오프셋이 음수인 지역에서는
 * 하루 밀린다. formatDateKey 가 로컬 기준이므로 파싱도 로컬로 맞춘다.
 */
export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getWeekStart(date, weekStartsOn = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date, amount) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
}

// 모달용 월간 캘린더 매트릭스 (이전/다음 달 날짜 포함, 6주 고정)
export function getMonthMatrix(cursorDate, weekStartsOn = 0) {
  const firstOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const start = getWeekStart(firstOfMonth, weekStartsOn);
  const weeks = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function buildScaleGradient() {
  const stops = MOOD_TYPES.map(
    (m, i) => `${m.color} ${(i / (MOOD_TYPES.length - 1)) * 100}%`
  ).join(", ");
  return `linear-gradient(to right in oklch, ${stops})`;
}
