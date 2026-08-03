// 기분(mood) API — 백엔드 MoodController(/moods) 연동.
//
//   GET   /moods            -> 방 전체(두 사람) 기분 기록. moodDatetime DESC
//                              MoodResponse { moodId, roomId, userId, moodDatetime, moodType, createdAt, updatedAt }
//   POST  /moods            -> { moodType }        현재 시간대 슬롯에 등록 (슬롯은 서버가 결정)
//   PATCH /moods/{moodId}   -> { moodType }        기존 기록 수정
//
// ── 하루 1건 → 시간대(슬롯) 단위로 바뀐 점 ────────────────────────────
//   mood 는 이제 mood_datetime 을 가지며 하루에 여러 건이 쌓인다.
//   슬롯 경계는 사용자의 알림 설정(start_time ~ end_time, interval_hours)에서 나온다.
//   그래서 이 모듈은 날짜별로 "슬롯 배열"을 돌려주고, 화면이 필요에 따라
//   최신 1건(대시보드 미리보기)이나 전체(캘린더 상세)를 골라 쓴다.
//
// ── 백엔드에 아직 없는 것 ──────────────────────────────────────────
//   ⚠️ reason(사유) 컬럼이 mood 테이블에 없다. MoodResponse 에도 없다.
//      화면에는 사유 입력이 이미 있으므로, 서버에 컬럼이 생기기 전까지
//      moodId 를 키로 localStorage 에 함께 보관한다. (REASON_KEY)
//      백엔드에 reason 이 추가되면 readReasons/writeReason 만 지우면 된다.
//   POST /moods 의 슬롯 판정은 서버의 알림 설정과 현재 시각을 단일 기준으로 사용한다.
//   프론트는 별도의 60분 판정이나 로컬 무드 폴백을 두지 않는다.
import { apiRequest } from "./httpClient.js";
import { getCurrentUser } from "./authApi.js";

const REASON_KEY = "emour_mood_reasons_v1";
// 로그인 정보가 없을 때 쓰는 임시 사용자 id. 조회/저장이 같은 값을 써야 한다.
const DEFAULT_LOCAL_USER_ID = 1;

/* ---------------------------------------------------------------- */
/* 사유(reason) — 백엔드 컬럼이 생기기 전까지의 로컬 보관소            */
/* ---------------------------------------------------------------- */

function readReasons() {
  try {
    return JSON.parse(localStorage.getItem(REASON_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeReason(moodId, reason) {
  if (moodId === null || moodId === undefined) return;
  const all = readReasons();
  if (reason) all[String(moodId)] = reason;
  else delete all[String(moodId)];
  localStorage.setItem(REASON_KEY, JSON.stringify(all));
}

/* ---------------------------------------------------------------- */
/* 정규화                                                            */
/* ---------------------------------------------------------------- */

function unwrap(response) {
  if (!response || typeof response !== "object") return null;
  if ("data" in response) return response.data;
  return response;
}

/** 'YYYY-MM-DDTHH:mm:ss' -> { dateKey, hour, minute } (타임존 영향 없이 문자열로 자른다) */
function splitMoodDatetime(moodDatetime) {
  const raw = String(moodDatetime ?? "");
  const dateKey = raw.slice(0, 10);
  const hour = Number(raw.slice(11, 13));
  const minute = Number(raw.slice(14, 16));
  return {
    dateKey,
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function toSlot(mood, reasons) {
  const { dateKey, hour, minute } = splitMoodDatetime(mood.moodDatetime);
  return {
    moodId: mood.moodId,
    userId: mood.userId,
    moodType: mood.moodType,
    moodDatetime: mood.moodDatetime,
    dateKey,
    hour,
    minute,
    // 하루 안에서의 위치(분). 그래프 X축과 정렬에 쓴다.
    minutesOfDay: hour * 60 + minute,
    reason: reasons[String(mood.moodId)] ?? "",
  };
}

/**
 * 서버 응답(평면 배열)을 날짜별 슬롯 묶음으로 바꾼다.
 * @returns {Record<string, { mySlots: Array, partnerSlots: Array }>}
 */
function groupByDate(moods, myUserId) {
  const reasons = readReasons();
  const byDate = {};

  moods.forEach((mood) => {
    const slot = toSlot(mood, reasons);
    if (!slot.dateKey) return;

    if (!byDate[slot.dateKey]) {
      byDate[slot.dateKey] = { mySlots: [], partnerSlots: [] };
    }

    const isMine = myUserId != null && String(slot.userId) === String(myUserId);
    byDate[slot.dateKey][isMine ? "mySlots" : "partnerSlots"].push(slot);
  });

  // 화면은 이른 시간 -> 늦은 시간 순으로 읽는다.
  Object.values(byDate).forEach((day) => {
    day.mySlots.sort((a, b) => a.minutesOfDay - b.minutesOfDay);
    day.partnerSlots.sort((a, b) => a.minutesOfDay - b.minutesOfDay);
  });

  return byDate;
}

/** 하루치 슬롯 중 가장 늦게 기록된 것 (대시보드 미리보기용) */
export function getLatestSlot(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  return slots[slots.length - 1];
}

/**
 * 하루 동안 가장 많이 입력된 무드를 대표값으로 선택한다.
 * 입력 횟수가 같으면 더 최근에 입력한 무드를 사용한다.
 */
export function getRepresentativeSlot(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return null;

  const moodCounts = new Map();

  slots.forEach((slot) => {
    if (!slot?.moodType) return;

    const summary = moodCounts.get(slot.moodType) ?? {
      count: 0,
      latestSlot: null,
    };

    moodCounts.set(slot.moodType, {
      count: summary.count + 1,
      latestSlot: slot,
    });
  });

  return [...moodCounts.values()].reduce((representative, candidate) => {
    if (!representative) return candidate;

    if (candidate.count !== representative.count) {
      return candidate.count > representative.count
        ? candidate
        : representative;
    }

    return candidate.latestSlot.minutesOfDay >=
      representative.latestSlot.minutesOfDay
      ? candidate
      : representative;
  }, null)?.latestSlot ?? null;
}

/**
 * 날짜 묶음에 대표값(그날의 색을 정할 기준)을 얹는다.
 * 캘린더 셀/스트립은 하루를 한 칸으로 그리므로 최빈 무드를 대표로 쓴다.
 * 최빈값이 둘 이상이면 가장 최근에 입력한 무드를 선택한다.
 */
function withDaySummary(byDate) {
  const result = {};
  Object.entries(byDate).forEach(([dateKey, day]) => {
    result[dateKey] = {
      ...day,
      myMood: getRepresentativeSlot(day.mySlots),
      partnerMood: getRepresentativeSlot(day.partnerSlots),
    };
  });
  return result;
}

/* ---------------------------------------------------------------- */
/* 조회                                                              */
/* ---------------------------------------------------------------- */

/**
 * 방 전체 기분 기록을 날짜별 슬롯 묶음으로 조회한다.
 * @returns {Promise<Record<string, {mySlots, partnerSlots, myMood, partnerMood}>>}
 */
export async function fetchMoodSlots() {
  const myUserId = currentUserId();
  const serverMoods = unwrap(
    await apiRequest("/moods"),
  );
  const moods = Array.isArray(serverMoods)
    ? serverMoods
    : [];

  return withDaySummary(groupByDate(moods, myUserId));
}

/** 로그인 정보가 없을 때 조회 결과를 분류하기 위한 폴백 사용자 id. */
function currentUserId() {
  return getCurrentUser()?.userId ?? DEFAULT_LOCAL_USER_ID;
}

/**
 * 특정 월의 기록만 골라 반환. (기존 화면들이 쓰던 시그니처 유지)
 * @param {number} year
 * @param {number} month 0-indexed
 */
export async function fetchMoodRecordsForMonth(year, month) {
  const all = await fetchMoodSlots();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  return Object.fromEntries(
    Object.entries(all).filter(([dateKey]) => dateKey.startsWith(prefix))
  );
}

/* ---------------------------------------------------------------- */
/* 등록 / 수정                                                        */
/* ---------------------------------------------------------------- */

/**
 * 내 기분을 등록한다.
 *
 * 슬롯 판정은 백엔드가 현재 시각과 알림 설정을 기준으로 결정한다.
 * 프론트에서는 등록 위치나 알림 수신 여부와 관계없이 항상 POST /moods를 호출한다.
 */
export async function createMyMood({ moodType, reason = "" }) {
  const created = unwrap(
    await apiRequest("/moods", {
      method: "POST",
      body: { moodType },
    }),
  );

  if (created?.moodId != null) {
    writeReason(created.moodId, reason);
  }

  return created;
}

/** 기존 기록 수정. moodId 만 있으면 지난 시간대도 수정할 수 있다. */
export async function updateMyMood(moodId, { moodType, reason = "" }) {
  const updated = unwrap(
    await apiRequest(`/moods/${moodId}`, {
      method: "PATCH",
      body: { moodType },
    }),
  );

  if (updated?.moodId != null) {
    writeReason(updated.moodId, reason);
  }

  return updated;
}

/**
 * 슬롯이 이미 있으면 수정, 없으면 새로 등록.
 * 화면에서는 "저장" 하나로 처리할 수 있게 이 함수를 쓴다.
 */
export async function saveMyMood({ moodId, moodType, reason = "", dateKey, minutesOfDay }) {
  return moodId != null
    ? updateMyMood(moodId, { moodType, reason })
    : createMyMood({ moodType, reason, dateKey, minutesOfDay });
}
