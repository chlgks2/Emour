/**
 * 감정 표기는 백엔드에서 두 가지 형태로 내려온다.
 *
 * 1) chat_analysis.emotion_type : VARCHAR(50) — ERD 주석에 "한국어 감정으로 전달될 것"
 *    -> 메시지 말풍선 위 감정 태그에 쓰인다. (예: "따뜻함")
 * 2) dashboard.emotion_summary / dashboard.emotion_flow : JSON — 키가 대문자 영문 코드
 *    -> ERD 주석 예시가 '{"JOY":3,"NEUTRAL":5}' 이므로 코드 → 한글 라벨 매핑이 필요하다.
 *
 * ⚠️ 확인 필요: ERD 주석에 예시로 나온 코드는 JOY / NEUTRAL 뿐이라 아래 EMOTION_CODE_LABEL 의
 *    나머지 코드는 목업 라벨을 기준으로 추정한 값이다. AI/백엔드에서 쓰는 실제 코드 목록을
 *    받는 즉시 이 표만 고치면 화면 전체에 반영된다.
 */
import { Frown, Heart, HeartPulse, Leaf, Meh, Smile, Sun } from "lucide-react";

// 한글 감정 라벨 -> 색/아이콘
// Icon 은 lucide 라인 아이콘 컴포넌트다. (OS 기본 이모지는 윈도우/맥/안드로이드에서
// 제각각 렌더링돼 톤이 깨지므로 쓰지 않는다)
export const EMOTION_STYLE = {
  행복: { color: "var(--emotion-happy)", Icon: Smile },
  설렘: { color: "var(--emotion-love)", Icon: HeartPulse },
  애정: { color: "var(--emotion-love)", Icon: Heart },
  편안함: { color: "var(--emotion-calm)", Icon: Leaf },
  따뜻함: { color: "var(--emotion-warm)", Icon: Sun },
  서운함: { color: "var(--emotion-sad)", Icon: Frown },
  중립: { color: "var(--emotion-neutral)", Icon: Meh },
};

// dashboard JSON 키(대문자 코드) -> 한글 라벨
export const EMOTION_CODE_LABEL = {
  JOY: "행복",
  LOVE: "설렘",
  AFFECTION: "애정",
  CALM: "편안함",
  WARMTH: "따뜻함",
  SADNESS: "서운함",
  NEUTRAL: "중립",
};

// 대문자 코드로 오든 한글 라벨로 오든 동일하게 한글 라벨로 정규화
export function toEmotionLabel(emotion) {
  if (!emotion) return "";
  return EMOTION_CODE_LABEL[emotion] ?? emotion;
}

export function getEmotionStyle(emotion) {
  const label = toEmotionLabel(emotion);
  return EMOTION_STYLE[label] || { color: "var(--color-text-placeholder)", Icon: Meh };
}

/**
 * dashboard.emotion_summary({ "JOY": 3, "NEUTRAL": 5 })를
 * 도넛 차트/범례용 배열로 변환한다. 개수 내림차순, ratio 는 정수 %(합계 100 보정).
 * @returns {Array<{emotionCode:string, label:string, count:number, ratio:number, color:string}>}
 */
export function buildEmotionReport(emotionSummary) {
  const entries = Object.entries(emotionSummary ?? {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return [];

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  const report = sorted.map(([emotionCode, count]) => {
    const label = toEmotionLabel(emotionCode);
    return {
      emotionCode,
      label,
      count,
      ratio: Math.round((count / total) * 100),
      color: getEmotionStyle(label).color,
    };
  });

  // 반올림 오차를 가장 큰 항목에서 흡수해 합계를 100%로 맞춘다.
  const diff = 100 - report.reduce((sum, item) => sum + item.ratio, 0);
  if (diff !== 0) report[0].ratio += diff;

  return report;
}

// DATETIME(6) 컬럼(sent_at, created_at ...)의 ISO 문자열을 "오후 7:30" 형태로
export function formatTime(dateTime) {
  const date = new Date(dateTime);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${minutes}`;
}

export function formatDate(dateTime) {
  const date = new Date(dateTime);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
}

export function isSameDay(dateTimeA, dateTimeB) {
  const a = new Date(dateTimeA);
  const b = new Date(dateTimeB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
