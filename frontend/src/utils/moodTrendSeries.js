/**
 * 감정 흐름 꺾은선의 **데이터 어댑터**.
 *
 * 차트 컴포넌트(MoodTrendChart)는 아래 공통 형태만 알고, 어떤 소스에서 왔는지는 모른다.
 * 그래서 소스를 바꿀 때 이 파일의 어댑터 하나만 갈아끼우면 된다.
 *
 *   Series = {
 *     key: string,          // 'mine' | 'partner' ...
 *     label: string,        // 범례에 쓸 이름
 *     color: string,        // CSS 색 (토큰 var() 가능)
 *     dashed?: boolean,     // 점선 여부
 *     points: Array<{ x: number, y: number, label?: string }>
 *   }
 *
 *   AxisConfig = { min, max, minLabel, maxLabel, formatX }
 *
 * ── 현재: 무드트래커 기반 ─────────────────────────────────────────
 *   buildMoodTrendSeries() — mood 슬롯(내/상대)의 5단계 기분을 Y축에 놓는다.
 *
 * ── 예정: 대화 감정 기반 ──────────────────────────────────────────
 *   buildConversationTrendSeries() — GET /dashboards/emotion-flow 의
 *   2시간 단위 positive/negative/neutral 개수를 -1~+1 감정 점수로 환산한다.
 *   대시보드에서 호출부 한 줄만 바꾸면 전환된다. (DashboardPage 주석 참고)
 */
import { MOOD_TYPES, getMoodLabel } from "./moodEmotion";

const MIN_LEVEL = 1;
const MAX_LEVEL = MOOD_TYPES.length; // 5

/** 무드트래커 축: 1(나쁨) ~ 5(좋음) */
export const MOOD_AXIS = {
  min: MIN_LEVEL,
  max: MAX_LEVEL,
  minLabel: "나쁨",
  maxLabel: "좋음",
  formatX: formatMinutesAsHour,
};

/** 대화 감정 축: -1(부정) ~ +1(긍정) */
export const CONVERSATION_AXIS = {
  min: -1,
  max: 1,
  minLabel: "부정",
  maxLabel: "긍정",
  formatX: formatMinutesAsHour,
};

/**
 * 무드트래커 슬롯 -> 시리즈 2개(나/상대방).
 *
 * 기록이 없는 시간대는 점 자체를 만들지 않는다. 차트는 있는 점만 이으므로
 * 빈 구간은 자연히 건너뛰고 다음 기록과 연결된다.
 *
 * @param {Array} mySlots      moodApi 슬롯 (minutesOfDay, moodType)
 * @param {Array} partnerSlots
 */
export function buildMoodTrendSeries(mySlots = [], partnerSlots = []) {
  return [
    {
      key: "mine",
      label: "나",
      color: "var(--color-primary)",
      points: toMoodPoints(mySlots),
    },
    {
      key: "partner",
      label: "상대방",
      color: "var(--emotion-surprise)",
      dashed: true,
      points: toMoodPoints(partnerSlots),
    },
  ];
}

function toMoodPoints(slots) {
  return (slots ?? [])
    .map((slot) => {
      const level = MOOD_TYPES.find((m) => m.moodType === slot.moodType)?.level;
      if (!level) return null;
      return {
        x: slot.minutesOfDay,
        y: level,
        label: getMoodLabel(slot.moodType),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);
}

/**
 * 대화 감정 흐름 -> 시리즈 1개.
 *
 * dashboardApi 의 dashboard.emotionFlow (GET /dashboards/emotion-flow) 를 받는다.
 * 분석된 메시지가 없는 구간(합계 0)은 점을 만들지 않아 그래프가 0으로 꺾이지 않는다.
 *
 * ⚠️ 이 엔드포인트는 "로그인한 사용자 본인"의 메시지만 집계하므로 상대방 선은 만들 수 없다.
 *    두 사람을 나란히 그리려면 백엔드에 상대/커플 기준 응답이 추가돼야 한다.
 *
 * @param {Array<{startHour, endHour, positiveCount, negativeCount, neutralCount}>} emotionFlow
 */
export function buildConversationTrendSeries(emotionFlow = []) {
  const points = (emotionFlow ?? [])
    .map((slot) => {
      const positive = Number(slot.positiveCount) || 0;
      const negative = Number(slot.negativeCount) || 0;
      const neutral = Number(slot.neutralCount) || 0;
      const total = positive + negative + neutral;

      if (total === 0) return null; // 분석된 대화가 없는 구간은 건너뛴다

      return {
        x: Number(slot.startHour) * 60,
        // 긍정 비율 - 부정 비율. 중립은 0 쪽으로 끌어당기는 효과를 낸다.
        y: (positive - negative) / total,
        label: `${slot.startHour}~${slot.endHour}시`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);

  return [
    {
      key: "conversation",
      label: "대화 감정",
      color: "var(--color-primary)",
      points,
    },
  ];
}

function formatMinutesAsHour(minutesOfDay) {
  return `${String(Math.floor(minutesOfDay / 60)).padStart(2, "0")}시`;
}
