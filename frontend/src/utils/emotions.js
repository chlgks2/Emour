/**
 * 감정 표기는 백엔드 chat.entity.EmotionType 열거형과 1:1로 맞춘다.
 *
 * 1) chat_analysis.emotion_type      : 메시지 말풍선 위 감정 태그
 * 2) GET /dashboards/main-emotions   : { emotionType, label, count } 배열
 * 3) GET /dashboards/emotion-flow    : 2시간 단위 positive/negative/neutral 개수
 *
 * label(한글)은 백엔드가 함께 내려주지만, 응답에 없을 때를 대비해 아래 표에도 같은 값을 둔다.
 * 색/아이콘은 화면 전용이라 프론트에서만 관리한다.
 */
import {
  CircleAlert,
  CircleHelp,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  Flame,
  HandHeart,
  HeartCrack,
  HeartHandshake,
  HeartPulse,
  Leaf,
  Meh,
  Smile,
  Waves,
  Zap,
} from "lucide-react";

/** EmotionType.polarity 와 동일 */
export const EMOTION_POLARITY = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
};

/**
 * 백엔드 EmotionType 15종.
 * color 는 tokens.css 의 --emotion-* 토큰을 참조하고, Icon 은 lucide 라인 아이콘이다.
 */
export const EMOTION_TYPES = [
  { code: "JOY", label: "기쁨", polarity: "POSITIVE", color: "var(--emotion-joy)", Icon: Smile },
  { code: "EXCITEMENT", label: "설렘", polarity: "POSITIVE", color: "var(--emotion-excitement)", Icon: HeartPulse },
  { code: "COMFORT", label: "편안함", polarity: "POSITIVE", color: "var(--emotion-comfort)", Icon: Leaf },
  { code: "GRATITUDE", label: "감사", polarity: "POSITIVE", color: "var(--emotion-gratitude)", Icon: HandHeart },

  { code: "WORRY", label: "걱정", polarity: "NEUTRAL", color: "var(--emotion-worry)", Icon: CloudDrizzle },
  { code: "SURPRISE", label: "놀람", polarity: "NEUTRAL", color: "var(--emotion-surprise)", Icon: Zap },
  { code: "NEUTRAL", label: "평범", polarity: "NEUTRAL", color: "var(--emotion-plain)", Icon: Meh },
  { code: "SHYNESS", label: "부끄러움", polarity: "NEUTRAL", color: "var(--emotion-shyness)", Icon: Waves },
  { code: "CURIOSITY", label: "궁금함", polarity: "NEUTRAL", color: "var(--emotion-curiosity)", Icon: CircleHelp },
  { code: "APOLOGY", label: "사과", polarity: "NEUTRAL", color: "var(--emotion-apology)", Icon: HeartHandshake },

  { code: "SADNESS", label: "슬픔", polarity: "NEGATIVE", color: "var(--emotion-sadness)", Icon: CloudRain },
  { code: "ANGER", label: "화남", polarity: "NEGATIVE", color: "var(--emotion-anger)", Icon: Flame },
  { code: "EMBARRASSMENT", label: "당황", polarity: "NEGATIVE", color: "var(--emotion-embarrassment)", Icon: CircleAlert },
  { code: "DISTRESS", label: "괴로움", polarity: "NEGATIVE", color: "var(--emotion-distress)", Icon: CloudLightning },
  { code: "HURT", label: "상처", polarity: "NEGATIVE", color: "var(--emotion-hurt)", Icon: HeartCrack },
];

const EMOTION_BY_CODE = Object.fromEntries(EMOTION_TYPES.map((e) => [e.code, e]));
const EMOTION_BY_LABEL = Object.fromEntries(EMOTION_TYPES.map((e) => [e.label, e]));

const FALLBACK_EMOTION = EMOTION_BY_CODE.NEUTRAL;

// 코드로 오든 한글 라벨로 오든 같은 항목을 찾는다. (분석 결과가 한글로 저장된 이력이 있다)
function findEmotion(emotion) {
  if (!emotion) return null;
  const key = String(emotion).trim();
  // 백엔드가 제거한 레거시 CONFUSION/혼란 값은 당황으로 호환 표시한다.
  if (key.toUpperCase() === "CONFUSION" || key === "혼란") {
    return EMOTION_BY_CODE.EMBARRASSMENT;
  }
  return EMOTION_BY_CODE[key.toUpperCase()] ?? EMOTION_BY_LABEL[key] ?? null;
}

export function toEmotionLabel(emotion) {
  if (!emotion) return "";
  return findEmotion(emotion)?.label ?? String(emotion);
}

export function getEmotionStyle(emotion) {
  return findEmotion(emotion) ?? FALLBACK_EMOTION;
}

export function getEmotionPolarity(emotion) {
  return findEmotion(emotion)?.polarity ?? EMOTION_POLARITY.NEUTRAL;
}

/**
 * 감정 집계를 도넛 차트/범례용 배열로 변환한다. 개수 내림차순, ratio 는 정수 %(합계 100 보정).
 *
 * 두 가지 입력을 모두 받는다.
 *  - GET /dashboards/main-emotions 의 emotions 배열: [{ emotionType, label, count }]
 *  - 레거시 JSON 맵: { "JOY": 3, "NEUTRAL": 5 }
 *
 * @returns {Array<{emotionCode:string, label:string, count:number, ratio:number, color:string}>}
 */
export function buildEmotionReport(emotionSummary) {
  const entries = normalizeEmotionEntries(emotionSummary).filter((item) => item.count > 0);
  if (entries.length === 0) return [];

  const total = entries.reduce((sum, item) => sum + item.count, 0);
  const sorted = entries.sort((a, b) => b.count - a.count);

  const report = sorted.map(({ emotionCode, label, count }) => {
    const style = getEmotionStyle(emotionCode);
    return {
      emotionCode,
      label: label || style.label,
      count,
      ratio: Math.round((count / total) * 100),
      color: style.color,
    };
  });

  // 반올림 오차를 가장 큰 항목에서 흡수해 합계를 100%로 맞춘다.
  const diff = 100 - report.reduce((sum, item) => sum + item.ratio, 0);
  if (diff !== 0) report[0].ratio += diff;

  return report;
}

function normalizeEmotionEntries(emotionSummary) {
  if (Array.isArray(emotionSummary)) {
    return emotionSummary.map((item) => ({
      emotionCode: item.emotionType ?? item.emotionCode ?? item.code,
      label: item.label,
      count: Number(item.count) || 0,
    }));
  }

  return Object.entries(emotionSummary ?? {}).map(([emotionCode, count]) => ({
    emotionCode,
    label: "",
    count: Number(count) || 0,
  }));
}

// DATETIME(6) 컬럼(sent_at, created_at ...)의 ISO 문자열을 "오후 7:30" 형태로
export function formatTime(dateTime) {
  const date = new Date(dateTime);
  if (!Number.isFinite(date.getTime())) return "";
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${minutes}`;
}

export function formatDate(dateTime) {
  const date = new Date(dateTime);
  if (!Number.isFinite(date.getTime())) return "";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
}

export function isSameDay(dateTimeA, dateTimeB) {
  const a = new Date(dateTimeA);
  const b = new Date(dateTimeB);
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) {
    return false;
  }
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
