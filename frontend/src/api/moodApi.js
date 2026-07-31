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
//   ⚠️ POST /moods 는 body 가 moodType 뿐이라 "현재 슬롯"에만 기록된다.
//      지난 시간대에 새로 추가하는 것은 API 로 불가능하다. (수정은 moodId 로 언제든 가능)
import { apiRequest } from "./httpClient.js";
import { getCurrentUser } from "./authApi.js";
import { formatDateKey } from "../utils/moodEmotion";

const REASON_KEY = "emour_mood_reasons_v1";
const LOCAL_MOODS_KEY = "emour_mood_local_v1";
// 서버가 만든 moodId 와 충돌하지 않도록 로컬 전용 id 는 이 위에서 발급한다.
const LOCAL_ID_BASE = 1_000_000;
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
/* 로컬 폴백 — 백엔드가 없을 때도 화면이 동작하도록                    */
/* ---------------------------------------------------------------- */

function readLocalMoods() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_MOODS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeLocalMoods(moods) {
  localStorage.setItem(LOCAL_MOODS_KEY, JSON.stringify(moods));
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
 * 날짜 묶음에 대표값(그날의 색을 정할 기준)을 얹는다.
 * 캘린더 셀/스트립은 하루를 한 칸으로 그리므로 최신 슬롯을 그날의 대표로 쓴다.
 */
function withDaySummary(byDate) {
  const result = {};
  Object.entries(byDate).forEach(([dateKey, day]) => {
    result[dateKey] = {
      ...day,
      myMood: getLatestSlot(day.mySlots),
      partnerMood: getLatestSlot(day.partnerSlots),
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

  let serverMoods;
  try {
    serverMoods = unwrap(await apiRequest("/moods"));
  } catch {
    serverMoods = null;
  }

  /*
   * 서버 응답이 있어도 로컬 기록을 버리면 안 된다.
   * 지난 시간대는 POST /moods 로 만들 수 없어 로컬에만 남는데,
   * 예전에는 서버가 빈 배열만 돌려줘도 로컬을 덮어써서
   * "기록하기를 눌러도 화면에 반영되지 않는" 문제가 있었다.
   */
  const moods = mergeMoods(
    Array.isArray(serverMoods) ? serverMoods : [],
    readLocalMoods()
  );

  return withDaySummary(groupByDate(moods, myUserId));
}

/** 로그인 정보가 없을 때도 createLocalMood 와 같은 값을 쓴다. (안 맞으면 내 기록이 상대 쪽으로 간다) */
function currentUserId() {
  return getCurrentUser()?.userId ?? DEFAULT_LOCAL_USER_ID;
}

/**
 * 서버 기록 + 로컬 기록 합치기.
 * 같은 사람의 같은 슬롯이 양쪽에 있으면 서버 값을 남긴다.
 */
function mergeMoods(serverMoods, localMoods) {
  const keyOf = (mood) => `${mood.userId}@${mood.moodDatetime}`;
  const seen = new Set(serverMoods.map(keyOf));

  return [...serverMoods, ...localMoods.filter((mood) => !seen.has(keyOf(mood)))];
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
 * ⚠️ POST /moods 는 body 가 { moodType } 뿐이고 슬롯 시각을 서버(MoodSlotCalculator)가
 *    "현재 시각" 기준으로 정한다. 그래서 지나간 시간대는 서버에 만들 수 없다.
 *    지난 슬롯은 로컬에 저장해 화면에서는 각 시간대를 따로 기록할 수 있게 하고,
 *    백엔드가 moodDatetime 을 받게 되면 아래 분기만 지우면 된다.
 *
 * @param {string} [dateKey]        'YYYY-MM-DD'  (없으면 오늘)
 * @param {number} [minutesOfDay]   대상 슬롯의 하루 내 분 위치 (없으면 현재 슬롯)
 */
export async function createMyMood({ moodType, reason = "", dateKey, minutesOfDay }) {
  if (isCurrentSlot(dateKey, minutesOfDay)) {
    try {
      const created = unwrap(await apiRequest("/moods", { method: "POST", body: { moodType } }));
      if (created?.moodId != null) {
        writeReason(created.moodId, reason);
        return created;
      }
    } catch (error) {
      // 서버가 없을 때만 로컬에 남긴다. 검증 실패(400 등)는 그대로 알려야 한다.
      if (error?.status && error.status < 500) throw error;
    }
  }

  return createLocalMood({ moodType, reason, dateKey, minutesOfDay });
}

/** 대상 슬롯이 "지금" 인지. 지금이면 서버에 만들 수 있다. */
function isCurrentSlot(dateKey, minutesOfDay) {
  if (!dateKey || minutesOfDay === undefined || minutesOfDay === null) return true;

  const now = new Date();
  if (dateKey !== formatDateKey(now)) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // 슬롯 간격을 모르므로 "이미 시작했고 아직 다음 정시 전"이면 현재 슬롯으로 본다.
  return minutesOfDay <= nowMinutes && nowMinutes - minutesOfDay < 60;
}

/** 기존 기록 수정. moodId 만 있으면 지난 시간대도 수정할 수 있다. */
export async function updateMyMood(moodId, { moodType, reason = "" }) {
  // 로컬에서 만든 기록은 서버에 없으므로 바로 로컬을 고친다.
  if (Number(moodId) > LOCAL_ID_BASE) {
    return updateLocalMood(moodId, { moodType, reason });
  }

  try {
    const updated = unwrap(
      await apiRequest(`/moods/${moodId}`, { method: "PATCH", body: { moodType } })
    );
    if (updated?.moodId != null) {
      writeReason(updated.moodId, reason);
      return updated;
    }
  } catch (error) {
    if (error?.status && error.status < 500) throw error;
  }

  return updateLocalMood(moodId, { moodType, reason });
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

/* ---------------------------------------------------------------- */
/* 로컬 폴백 구현                                                     */
/* ---------------------------------------------------------------- */

/** 대상 슬롯의 moodDatetime 문자열. 지정이 없으면 지금 정시. */
function slotDatetime(dateKey, minutesOfDay) {
  const now = new Date();
  const day = dateKey ?? formatDateKey(now);
  const minutes = minutesOfDay ?? now.getHours() * 60;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${day}T${hour}:${minute}:00`;
}

function createLocalMood({ moodType, reason, dateKey, minutesOfDay }) {
  const moods = readLocalMoods();
  // 서버 id 와 겹치지 않도록 로컬 id 는 큰 수에서 시작한다.
  const moodId =
    Math.max(
      LOCAL_ID_BASE,
      moods.reduce((max, m) => Math.max(max, Number(m.moodId) || 0), 0)
    ) + 1;
  const moodDatetime = slotDatetime(dateKey, minutesOfDay);
  const myUserId = currentUserId();

  // 같은 슬롯에 이미 기록이 있으면 새로 만들지 않고 갱신한다.
  const existing = moods.find(
    (m) => m.moodDatetime === moodDatetime && String(m.userId) === String(myUserId)
  );

  if (existing) {
    existing.moodType = moodType;
    writeLocalMoods(moods);
    writeReason(existing.moodId, reason);
    return existing;
  }

  const created = { moodId, userId: myUserId, moodDatetime, moodType };
  moods.push(created);
  writeLocalMoods(moods);
  writeReason(moodId, reason);
  return created;
}

function updateLocalMood(moodId, { moodType, reason }) {
  const moods = readLocalMoods();
  const target = moods.find((m) => String(m.moodId) === String(moodId));

  if (target) {
    target.moodType = moodType;
    writeLocalMoods(moods);
  }

  writeReason(moodId, reason);
  return target ?? null;
}
