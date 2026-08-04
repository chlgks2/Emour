/**
 * 기분 리포트(무드트래커 기준) **데이터 어댑터**.
 *
 * 이 앱에는 감정의 출처가 둘 있고, 둘은 섞이면 안 된다.
 *   · 기분(mood)  — 두 사람이 시간대마다 직접 고른 5단계. GET /moods
 *   · 감정(emotion) — 채팅 내용을 AI 가 분석한 15종. GET /dashboards/*
 * 이 파일은 앞의 것만 다룬다. 뒤의 것은 utils/emotions.js 와 dashboardApi 가 맡는다.
 *
 * 기분 기록은 이미 프론트가 통째로 받아 두고 있어서(moodApi.fetchMoodSlots)
 * 일간·주간·월간을 서버에 다시 묻지 않고 여기서 잘라 쓴다.
 * 감정 리포트 기간 API와는 별개로 무드 기록 배열에서 필요한 기간만 잘라 쓴다.
 */
import {
  MOOD_TYPES,
  addDays,
  formatDateKey,
  getMoodLabel,
  getWeekStart,
  parseDateKey,
} from "./moodEmotion";

/** 감정 리포트와 무드 리포트가 함께 사용하는 기간 탭. */
export const MOOD_REPORT_PERIODS = [
  ["DAY", "일간"],
  ["WEEK", "주간"],
  ["MONTH", "월간"],
  ["YEAR", "연간"],
  ["ALL", "전체"],
];

const MOOD_LEVEL_BY_TYPE = Object.fromEntries(
  MOOD_TYPES.map((mood) => [mood.moodType, mood.level]),
);

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 기분 축: 1(나쁨) ~ 5(좋음). 무드트래커 5단계를 그대로 쓴다. */
const MOOD_SCALE = {
  min: 1,
  max: MOOD_TYPES.length,
  minLabel: "나쁨",
  maxLabel: "좋음",
};

/**
 * 기간에 들어가는 날짜 키 목록. 오래된 날 -> 최근 날 순.
 * moodRecords 의 키('YYYY-MM-DD')와 같은 형식이라 그대로 조회에 쓸 수 있다.
 */
export function buildPeriodDateKeys(period, date) {
  if (period === "WEEK") {
    const start = getWeekStart(date);
    return Array.from({ length: 7 }, (_, index) =>
      formatDateKey(addDays(start, index)),
    );
  }

  if (period === "MONTH") {
    const year = date.getFullYear();
    const month = date.getMonth();
    // 0일 = 다음 달의 전날 = 이번 달 마지막 날
    const lastDate = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDate }, (_, index) =>
      formatDateKey(new Date(year, month, index + 1)),
    );
  }

  if (period === "YEAR") {
    const year = date.getFullYear();
    const lastDate = new Date(year, 11, 31);
    const days = Math.round((lastDate - new Date(year, 0, 1)) / 86400000) + 1;
    return Array.from({ length: days }, (_, index) =>
      formatDateKey(new Date(year, 0, index + 1)),
    );
  }

  return [formatDateKey(date)];
}

/**
 * 기분 비율 도넛용 구간. **한 사람 몫**이다.
 *
 * 무드트래커는 두 사람이 각자 자기 기분을 고른 기록이라 합산하면 뜻이 흐려진다.
 * 한쪽이 계속 '좋음'이고 다른 쪽이 계속 '안 좋음'이어도, 더하면 반반짜리 도넛이
 * 되어 두 사람 다 보통이었던 것처럼 보인다. 그래서 나/상대를 따로 그린다.
 * (반대로 채팅 감정은 둘이 함께 만든 대화 한 덩어리라 합산이 맞다)
 *
 * 정렬은 개수 순이 아니라 '매우 좋음 -> 매우 안 좋음' 순서를 지킨다.
 * 5단계는 순서가 있는 척도라, 많은 것부터 늘어놓으면 도넛에서 좋음과 나쁨이
 * 뒤섞여 한눈에 기울기가 보이지 않는다.
 *
 * @param {'mySlots'|'partnerSlots'} slotsKey 누구의 기록인지
 * @returns {Array<{key, label, count, ratio, color}>} 기록이 없으면 빈 배열
 */
export function buildMoodDistribution(moodRecords, dateKeys, slotsKey) {
  const counts = new Map();

  dateKeys.forEach((dateKey) => {
    (moodRecords?.[dateKey]?.[slotsKey] ?? []).forEach((slot) => {
      if (!slot?.moodType) return;
      counts.set(slot.moodType, (counts.get(slot.moodType) ?? 0) + 1);
    });
  });

  // MOOD_TYPES 는 나쁨 -> 좋음 순이라 뒤집어서 좋은 기분이 도넛 12시부터 오게 한다.
  const segments = [...MOOD_TYPES]
    .reverse()
    .map((mood) => ({
      key: mood.moodType,
      label: mood.label,
      color: mood.color,
      count: counts.get(mood.moodType) ?? 0,
    }))
    .filter((segment) => segment.count > 0);

  if (segments.length === 0) return [];

  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  const report = segments.map((segment) => ({
    ...segment,
    ratio: Math.round((segment.count / total) * 100),
  }));

  // 반올림 오차는 가장 큰 조각이 흡수한다. (합을 100%로 맞춘다)
  const diff = 100 - report.reduce((sum, segment) => sum + segment.ratio, 0);
  if (diff !== 0) {
    const largest = report.reduce(
      (best, segment) => (segment.count > best.count ? segment : best),
      report[0],
    );
    largest.ratio += diff;
  }

  return report;
}

/**
 * 기분 흐름 꺾은선 + X축 설정.
 *
 * 기간에 따라 X축의 단위가 바뀐다. 축을 바꾸지 않으면 주간·월간에서도
 * '16시' 같은 하루 안의 시각이 그대로 남아 무엇의 축인지 알 수 없다.
 *   · 일간 — 하루 안의 시각 (0시 ~ 24시). 그날 기록한 슬롯을 그대로 잇는다.
 *   · 주간 — 요일 (일 ~ 토). 하루를 대표 기분 한 점으로 줄인다.
 *   · 월간 — 날짜 (1일부터 7일 간격). 같은 방식으로 하루당 한 점.
 *
 * 축의 범위는 데이터가 아니라 기간이 정한다. 기록이 이틀치뿐이어도 주간 축은
 * 일요일부터 토요일까지 그대로 있어야 "이 주에 이틀만 기록했다"가 보인다.
 *
 * @returns {{series: Array, axis: object}} MoodTrendChart 에 그대로 넘긴다
 */
export function buildMoodReportTrend(moodRecords, dateKeys, period) {
  if (period === "DAY") {
    const day = moodRecords?.[dateKeys[0]];
    return {
      series: [
        makeSeries("mine", "나", "var(--color-primary)", false, toSlotPoints(day?.mySlots)),
        makeSeries(
          "partner",
          "상대방",
          "var(--emotion-surprise)",
          true,
          toSlotPoints(day?.partnerSlots),
        ),
      ],
      axis: {
        ...MOOD_SCALE,
        domain: [0, 24 * 60],
        ticks: [0, 6, 12, 18, 24].map((hour) => ({
          x: hour * 60,
          label: `${hour}시`,
        })),
        formatX: (minutes) => `${Math.floor(minutes / 60)}시`,
      },
    };
  }

  if (period === "YEAR" || period === "ALL") {
    const buckets = buildLongPeriodBuckets(dateKeys, period);
    return {
      series: [
        makeSeries("mine", "나", "var(--color-primary)", false,
          toBucketPoints(moodRecords, buckets, "mySlots")),
        makeSeries("partner", "상대방", "var(--emotion-surprise)", true,
          toBucketPoints(moodRecords, buckets, "partnerSlots")),
      ],
      axis: {
        ...MOOD_SCALE,
        domain: buckets.length === 1 ? [0, 0] : [0, Math.max(buckets.length - 1, 1)],
        ticks: buckets.map((bucket, index) => ({ x: index, label: bucket.label })),
        formatX: (index) => buckets[Math.round(index)]?.detailLabel ?? "",
      },
    };
  }

  const lastIndex = Math.max(dateKeys.length - 1, 1);

  return {
    series: [
      makeSeries(
        "mine",
        "나",
        "var(--color-primary)",
        false,
        toDailyPoints(moodRecords, dateKeys, "myMood"),
      ),
      makeSeries(
        "partner",
        "상대방",
        "var(--emotion-surprise)",
        true,
        toDailyPoints(moodRecords, dateKeys, "partnerMood"),
      ),
    ],
    axis: {
      ...MOOD_SCALE,
      domain: [0, lastIndex],
      ticks:
        period === "WEEK"
          ? dateKeys.map((dateKey, index) => ({
              x: index,
              label: WEEKDAY_LABELS[parseDateKey(dateKey).getDay()],
            }))
          : buildLongPeriodTicks(dateKeys, period),
      formatX: (index) => formatDayIndex(dateKeys, index, period),
    },
  };
}

function buildLongPeriodBuckets(dateKeys, period) {
  if (period === "YEAR") {
    const year = parseDateKey(dateKeys[0] ?? formatDateKey(new Date())).getFullYear();
    return Array.from({ length: 12 }, (_, month) => ({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: `${month + 1}월`,
      detailLabel: `${year}년 ${month + 1}월`,
      dateKeys: dateKeys.filter((dateKey) => dateKey.startsWith(
        `${year}-${String(month + 1).padStart(2, "0")}`,
      )),
      targetPeriod: "MONTH",
      targetDate: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    }));
  }

  const years = [...new Set(dateKeys.map((dateKey) => dateKey.slice(0, 4)))].sort();
  return years.map((year) => ({
    key: year,
    label: `${year}년`,
    detailLabel: `${year}년`,
    dateKeys: dateKeys.filter((dateKey) => dateKey.startsWith(`${year}-`)),
    targetPeriod: "YEAR",
    targetDate: `${year}-01-01`,
  }));
}

function toBucketPoints(moodRecords, buckets, slotsKey) {
  return buckets.map((bucket, index) => {
    const records = bucket.dateKeys.flatMap((dateKey) =>
      (moodRecords?.[dateKey]?.[slotsKey] ?? []).map((slot) => ({ slot, dateKey })),
    );
    const representative = pickRepresentativeMood(records);
    if (!representative) return null;
    return {
      x: index,
      y: MOOD_LEVEL_BY_TYPE[representative],
      label: getMoodLabel(representative),
      targetPeriod: bucket.targetPeriod,
      targetDate: bucket.targetDate,
    };
  }).filter(Boolean);
}

function pickRepresentativeMood(records) {
  const counted = new Map();
  records.forEach(({ slot, dateKey }) => {
    if (!slot?.moodType) return;
    const previous = counted.get(slot.moodType) ?? { count: 0, latest: "" };
    const latest = `${dateKey}-${String(slot.minutesOfDay ?? 0).padStart(4, "0")}`;
    counted.set(slot.moodType, {
      count: previous.count + 1,
      latest: latest > previous.latest ? latest : previous.latest,
    });
  });
  return [...counted.entries()].sort(([, first], [, second]) =>
    second.count - first.count || second.latest.localeCompare(first.latest),
  )[0]?.[0] ?? null;
}

/**
 * 월간 X축 눈금 — 7일 간격.
 * 하루마다 붙이면 30개가 겹쳐 뭉개지고, 양 끝에만 붙이면 가운데 점이 며칠인지
 * 셀 수가 없다. 7일 간격이면 눈금이 곧 주 경계라 자리를 짐작하기도 쉽다.
 */
function buildLongPeriodTicks(dateKeys, period) {
  if (period === "YEAR") {
    return dateKeys
      .map((dateKey, index) => ({ date: parseDateKey(dateKey), index }))
      .filter(({ date }) => date.getDate() === 1)
      .map(({ date, index }) => ({ x: index, label: `${date.getMonth() + 1}월` }));
  }

  if (period === "ALL") {
    const step = Math.max(1, Math.ceil(dateKeys.length / 5));
    return dateKeys
      .filter((_, index) => index % step === 0 || index === dateKeys.length - 1)
      .map((dateKey) => ({
        x: dateKeys.indexOf(dateKey),
        label: `${parseDateKey(dateKey).getFullYear()}년`,
      }));
  }

  const ticks = [];
  for (let index = 0; index < dateKeys.length; index += 7) {
    ticks.push({ x: index, label: `${index + 1}일` });
  }
  return ticks;
}

function formatDayIndex(dateKeys, index, period) {
  const dateKey = dateKeys[Math.round(index)];
  if (!dateKey) return "";

  const date = parseDateKey(dateKey);
  if (period === "WEEK") {
    return `${date.getMonth() + 1}월 ${date.getDate()}일(${WEEKDAY_LABELS[date.getDay()]})`;
  }
  if (period === "YEAR" || period === "ALL") {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }
  return `${date.getDate()}일`;
}

function makeSeries(key, label, color, dashed, points) {
  return { key, label, color, dashed, points };
}

/** 하루 안의 슬롯 -> 시각(분) 축 위의 점 */
function toSlotPoints(slots) {
  return (slots ?? [])
    .map((slot) => {
      const level = MOOD_LEVEL_BY_TYPE[slot?.moodType];
      if (!level) return null;
      return {
        x: slot.minutesOfDay,
        y: level,
        label: getMoodLabel(slot.moodType),
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.x - second.x);
}

/**
 * 하루 -> 점 하나.
 *
 * 그날의 대표 기분(moodApi.getRepresentativeSlot 이 미리 얹어 둔 myMood/partnerMood)을
 * 쓴다. 평균을 내지 않는 이유는 캘린더 셀·감정 원이 이미 같은 대표값으로 그 날을
 * 칠하고 있어서다. 같은 날이 그래프에서만 다른 값이면 어느 쪽이 맞는지 헷갈린다.
 */
function toDailyPoints(moodRecords, dateKeys, summaryKey) {
  return dateKeys
    .map((dateKey, index) => {
      const mood = moodRecords?.[dateKey]?.[summaryKey];
      const level = MOOD_LEVEL_BY_TYPE[mood?.moodType];
      if (!level) return null;
      return { x: index, y: level, label: getMoodLabel(mood.moodType) };
    })
    .filter(Boolean);
}
