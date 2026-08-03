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
// ── 기록할 수 있는 건 "지금 진행 중인 시간대" 뿐이다 ──────────────────
//   지난 시간대 등록·수정은 지원하지 않기로 한 기능이다. 서버가 그렇게 막고 있고
//   (MoodService.create/update 가 둘 다 MoodSlotCalculator.currentSlot 과 대조한다)
//   화면도 같은 규칙을 따른다. (moodSlotGrid.isEditable)
//
//   한동안은 지난 시간대를 localStorage 에 따로 저장했는데, 그 기록은
//     · 상대방에게 보이지 않고
//     · 다른 기기·다른 브라우저에서도 보이지 않고
//     · 그런데 화면에는 저장된 것처럼 보여서
//   같은 커플방인데 창마다 다른 기분이 보이는 원인이 됐다. 지금은 만들지 않는다.
//   기분 기록의 출처는 서버 하나뿐이다.
//
// ── 아직 백엔드에 없는 것 ─────────────────────────────────────────
//   ⚠️ reason(사유) 컬럼이 mood 테이블에 없다. MoodResponse 에도 없다.
//      화면에는 사유 입력이 이미 있으므로, 서버에 컬럼이 생기기 전까지만
//      moodId 를 키로 localStorage 에 보관한다. (이것도 이 기기에서만 보인다)
//      백엔드에 reason 이 추가되면 readReasons/writeReason 만 지우면 된다.
import { apiRequest } from "./httpClient.js";
import { getCurrentUser } from "./authApi.js";
import { formatDateKey } from "../utils/moodEmotion";

// 사용자별 키는 여기에 ':userId' 를 붙여 만든다.
// 접미사 없는 원래 키는 사용자 구분이 없던 시절의 값이라 정리 대상이다.
const REASON_KEY = "emour_mood_reasons_v1";
const LEGACY_LOCAL_MOODS_KEY = "emour_mood_local_v1";

/** 로그인한 사용자 id. 없으면 null */
function currentUserId() {
  return getCurrentUser()?.userId ?? null;
}

/** 사유 저장소 키는 사용자별로 나눈다. (한 브라우저를 두 계정이 쓸 수 있다) */
function reasonStorageKey(userId) {
  return `${REASON_KEY}:${userId}`;
}

/*
 * 예전 저장소 정리.
 *   · 기분 기록(emour_mood_local_v1): 서버에 없는 사본이라 버린다.
 *   · 사유: moodId 가 키라서 그대로 옮겨도 어긋나지 않는다. 사용자별 키로 옮긴다.
 */
function migrateLegacyStorage(userId) {
  localStorage.removeItem(LEGACY_LOCAL_MOODS_KEY);
  localStorage.removeItem(`${LEGACY_LOCAL_MOODS_KEY}:${userId}`);

  const legacyReasons = localStorage.getItem(REASON_KEY);
  if (legacyReasons === null) return;

  if (localStorage.getItem(reasonStorageKey(userId)) === null) {
    localStorage.setItem(reasonStorageKey(userId), legacyReasons);
  }
  localStorage.removeItem(REASON_KEY);
}

/* ---------------------------------------------------------------- */
/* 사유(reason) — 백엔드 컬럼이 생기기 전까지의 로컬 보관소            */
/* ---------------------------------------------------------------- */

function readReasons(userId = currentUserId()) {
  if (userId == null) return {};
  migrateLegacyStorage(userId);

  try {
    return JSON.parse(localStorage.getItem(reasonStorageKey(userId))) ?? {};
  } catch {
    return {};
  }
}

function writeReason(moodId, reason) {
  const userId = currentUserId();
  if (userId == null || moodId === null || moodId === undefined) return;

  const all = readReasons(userId);
  if (reason) all[String(moodId)] = reason;
  else delete all[String(moodId)];

  localStorage.setItem(reasonStorageKey(userId), JSON.stringify(all));
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
  const reasons = readReasons(myUserId);
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
 *
 * 서버가 유일한 출처다. 조회에 실패하면 빈 값을 돌려주고, 화면은
 * "기록 없음"을 보여준다. 예전 로컬 사본으로 채워 넣지 않는다.
 * (그렇게 하면 지워진 기록이 되살아나 상대 화면과 어긋난다)
 *
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

  return withDaySummary(
    groupByDate(Array.isArray(serverMoods) ? serverMoods : [], myUserId)
  );
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
 * 기록 시각은 서버가 정한다. POST /moods 의 body 는 { moodType } 뿐이고,
 * 슬롯은 MoodSlotCalculator 가 "현재 시각"으로 계산한다.
 * 모달을 열어둔 채 시간대가 넘어갔다면 다시 불러올 때 실제 시각에 나타난다.
 *
 * dateKey 는 지난 날짜를 고른 채로 등록이 호출되는 사고를 막는 안전장치다.
 * 그대로 두면 오늘 지금 시각에 엉뚱하게 기록된다.
 *
 * @param {string} [dateKey] 'YYYY-MM-DD' (없으면 오늘)
 */
export async function createMyMood({ moodType, reason = "", dateKey }) {
  if (dateKey && dateKey !== formatDateKey(new Date())) {
    throw new Error("지난 날짜의 기분은 아직 등록할 수 없어요.");
  }

  const created = unwrap(
    await apiRequest("/moods", { method: "POST", body: { moodType } })
  );

  if (created?.moodId == null) {
    throw new Error("기분을 저장하지 못했습니다.");
  }

  writeReason(created.moodId, reason);
  return created;
}

/**
 * 기존 기록 수정.
 *
 * 진행 중인 시간대의 기록만 고칠 수 있다. 지난 시간대를 보내면 서버가
 * MOOD_UPDATE_NOT_ALLOWED 로 거절한다. 화면도 그 슬롯에는 수정 버튼을 달지 않는다.
 */
export async function updateMyMood(moodId, { moodType, reason = "" }) {
  const updated = unwrap(
    await apiRequest(`/moods/${moodId}`, { method: "PATCH", body: { moodType } })
  );

  if (updated?.moodId == null) {
    throw new Error("기분을 수정하지 못했습니다.");
  }

  writeReason(updated.moodId, reason);
  return updated;
}

/**
 * 슬롯이 이미 있으면 수정, 없으면 새로 등록.
 * 화면에서는 "저장" 하나로 처리할 수 있게 이 함수를 쓴다.
 */
export async function saveMyMood({ moodId, moodType, reason = "", dateKey }) {
  return moodId != null
    ? updateMyMood(moodId, { moodType, reason })
    : createMyMood({ moodType, reason, dateKey });
}
