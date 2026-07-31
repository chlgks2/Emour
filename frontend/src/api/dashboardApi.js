// 대시보드 API — 백엔드 DashboardController(/dashboards) 실연동.
//
//   GET /dashboards/daily             ?roomId&date              -> 메시지/이미지/공감/북마크 개수
//   GET /dashboards/main-emotions     ?roomId&period&date       -> 감정 15종 집계 + 대표 감정
//   GET /dashboards/frequent-words    ?roomId&date&limit        -> 자주 쓴 단어
//   GET /dashboards/conversation-flow ?roomId&period&date       -> 활발한 시간대 / 평균 응답 시간
//
// ⚠️ 이 컨트롤러만 ApiResponse 래퍼 없이 DTO를 그대로 반환한다.
//    (다른 컨트롤러는 { data: ... } 로 감싼다) 양쪽 모두 받도록 unwrap() 을 거친다.
//
// ── 집계 기준: "오늘의 대화 기록" 카드는 커플 합산이다 ──────────────────
//   /dashboards/daily 는 "로그인한 사용자 본인"의 개수만 세므로 메시지·사진에는 쓰지 않는다.
//   커플 전체가 필요한 값은 아래 소스를 쓴다.
//     · 메시지         : /dashboards/conversation-flow 의 totalMessageCount (커플 전체)
//     · 가장 활발한 시간 : 같은 응답의 busiestHour        (커플 전체)
//     · 평균 답장 시간   : 같은 응답의 averageResponseSeconds (커플 전체)
//     · 사진 / 자주 쓴 말 : 커플 합산 엔드포인트가 없어 오늘 대화 원본에서 직접 계산
//   ⚠️ 북마크만 예외로 "내" 개수다. ChatBookmarkRepository 의 조회가 전부
//      roomId + userId 로 묶여 있어 커플 합산이 구조적으로 불가능하다.
//      그래서 화면 라벨도 '내 북마크' 로 표기한다.
//
// 아직 백엔드에 없는 것: couple_schedule(오늘 일정) — calendarApi 목업을 그대로 쓴다.
import { apiRequest } from "./httpClient.js";
import { getAlbumPhotos } from "./albumApi.js";
import { getChatBookmarks, getChatMessages } from "./chatApi.js";
import { getMyCoupleRoom } from "./coupleApi.js";
import { getRelationshipStartDate, getTodaySchedules } from "./calendarApi.js";
import { getCurrentCoupleRoom } from "../utils/pendingCoupleRoom.js";

const RECENT_PHOTO_LIMIT = 5;
const FREQUENT_WORD_LIMIT = 10;
const CONVERSATION_PAGE_SIZE = 100;

function unwrap(response) {
  // ApiResponse 래퍼가 있으면 벗기고, 없으면 응답 본문을 그대로 쓴다.
  // 프록시 설정이 빠져 index.html(문자열)이 돌아오는 경우도 있어 객체인지 먼저 확인한다.
  if (!response || typeof response !== "object") return null;
  if ("data" in response) return response.data;
  return response;
}

function formatLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getResponseDateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

/**
 * 대시보드 위젯 하나가 실패해도 화면 전체를 비우지 않는다.
 * (감정 분석이 아직 안 돌았거나 방금 커플 연결한 계정이면 일부 응답이 404/500 일 수 있다)
 */
async function safe(promise, fallback = null) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

/** GET /dashboards/daily */
export async function getDailyCounts(roomId, date) {
  const response = await apiRequest(`/dashboards/daily?${buildQuery({ roomId, date })}`);
  return unwrap(response);
}

/** GET /dashboards/main-emotions — period: 'DAY' | 'MONTH' | 'YEAR' */
export async function getMainEmotions(roomId, date, period = "DAY") {
  const response = await apiRequest(
    `/dashboards/main-emotions?${buildQuery({ roomId, period, date })}`
  );
  return unwrap(response);
}

/** GET /dashboards/frequent-words */
export async function getFrequentWords(roomId, date, limit = FREQUENT_WORD_LIMIT) {
  const response = await apiRequest(
    `/dashboards/frequent-words?${buildQuery({ roomId, date, limit })}`
  );
  return unwrap(response);
}

/** GET /dashboards/conversation-flow */
export async function getConversationFlow(roomId, date, period = "DAY") {
  const response = await apiRequest(
    `/dashboards/conversation-flow?${buildQuery({ roomId, period, date })}`
  );
  return unwrap(response);
}

/** GET /dashboards/emotion-flow — 2시간 단위 12구간 */
export async function getEmotionFlow(roomId, date) {
  const response = await apiRequest(`/dashboards/emotion-flow?${buildQuery({ roomId, date })}`);
  return unwrap(response);
}

/* ------------------------------------------------------------------
   오늘 대화로부터 직접 계산하는 폴백
   ------------------------------------------------------------------
   /dashboards/* 는 스냅샷 배치가 돌아야 값이 채워진다. 아직 집계 전이거나
   감정 분석이 끝나지 않은 시간대에는 0/null 이 내려오는데, 그때 카드가
   통째로 비어 버리면 "채팅에 메시지가 있는데 0건"으로 보인다.
   그래서 서버 값이 비어 있을 때만 채팅 원본에서 같은 지표를 계산해 채운다.
   ------------------------------------------------------------------ */

/** 오늘 주고받은 메시지를 커서 페이지네이션으로 모두 모은다. */
async function fetchTodayMessages(roomId, todayKey) {
  const collected = [];
  const visitedCursors = new Set();
  let beforeMessageId = null;

  while (true) {
    const response = await getChatMessages({
      roomId,
      beforeMessageId,
      size: CONVERSATION_PAGE_SIZE,
    });

    const messages = response?.messages ?? [];
    collected.push(...messages.filter((m) => getResponseDateKey(m.sentAt) === todayKey));

    // 오늘보다 이전 메시지가 섞여 나오기 시작하면 더 볼 필요가 없다.
    const reachedPreviousDate = messages.some(
      (m) => getResponseDateKey(m.sentAt) < todayKey
    );
    const nextCursor = response?.hasNext ? response.nextCursor : null;

    if (reachedPreviousDate || !nextCursor || visitedCursors.has(nextCursor)) break;

    visitedCursors.add(nextCursor);
    beforeMessageId = nextCursor;
  }

  return collected;
}

async function countTodayBookmarks(roomId, todayKey) {
  const visitedCursors = new Set();
  let beforeBookmarkId = null;
  let count = 0;

  while (true) {
    const response = await getChatBookmarks({
      roomId,
      beforeBookmarkId,
      size: CONVERSATION_PAGE_SIZE,
    });

    const bookmarks = response?.bookmarks ?? [];
    count += bookmarks.filter(
      (b) => getResponseDateKey(b.bookmarkedAt) === todayKey
    ).length;

    const reachedPreviousDate = bookmarks.some(
      (b) => getResponseDateKey(b.bookmarkedAt) < todayKey
    );
    const nextCursor = response?.hasNext ? response.nextCursor : null;

    if (reachedPreviousDate || !nextCursor || visitedCursors.has(nextCursor)) break;

    visitedCursors.add(nextCursor);
    beforeBookmarkId = nextCursor;
  }

  return count;
}

/** 메시지가 가장 많았던 시각(0~23). 커플 전체 기준. */
function calcBusiestHour(messages) {
  if (messages.length === 0) return null;

  const perHour = new Array(24).fill(0);
  messages.forEach((m) => {
    const hour = new Date(m.sentAt).getHours();
    if (Number.isFinite(hour)) perHour[hour] += 1;
  });

  const max = Math.max(...perHour);
  return max > 0 ? perHour.indexOf(max) : null;
}

/** 발신자가 바뀔 때까지 걸린 평균 시간(초). */
function calcAverageResponseSeconds(messages) {
  const ordered = [...messages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

  let totalSeconds = 0;
  let turns = 0;

  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].senderId === ordered[i - 1].senderId) continue;

    const gap = (new Date(ordered[i].sentAt) - new Date(ordered[i - 1].sentAt)) / 1000;
    if (Number.isFinite(gap) && gap >= 0) {
      totalSeconds += gap;
      turns += 1;
    }
  }

  return turns > 0 ? totalSeconds / turns : null;
}

/** 내가 보낸 텍스트에서 많이 쓴 단어 순으로. (백엔드 frequent-words 와 같은 기준) */
function calcFrequentWords(messages, myUserId, limit = FREQUENT_WORD_LIMIT) {
  const counts = new Map();

  messages
    .filter((m) => myUserId == null || m.senderId === myUserId)
    .forEach((m) => {
      String(m.content ?? "")
        .split(/\s+/)
        // 앞뒤 구두점만 떼어낸다. (이모지·자모는 건드리지 않는다)
        .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
        .filter((word) => word.length >= 2)
        .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
    });

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    // 같은 횟수면 가나다·알파벳 순
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"))
    .slice(0, limit);
}

/**
 * 사귄 날짜(couple_room.dating_start_date)로부터 D+N 계산.
 * daysTogether 는 DB 컬럼이 아니라 프론트 파생값이다.
 */
export function calcDaysTogether(datingStartDate, today = new Date()) {
  if (!datingStartDate) return null;
  const start = new Date(`${datingStartDate}T00:00:00`);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 만난 날을 1일로 계산
}

/**
 * 홈 대시보드 데이터 조회.
 *
 * @returns {{
 *   room: object|null,
 *   daysTogether: number|null,
 *   dashboard: object,
 *   todaySchedules: Array,
 *   recentPhotos: Array,
 * }}
 */
export async function fetchDashboard() {
  const storedRoom = getCurrentCoupleRoom();
  const currentRoom = storedRoom?.roomId ? storedRoom : await safe(getMyCoupleRoom());
  const roomId = currentRoom?.roomId ?? null;
  const todayKey = formatLocalDateKey();

  // getFrequentWords 는 내 메시지만 대상이라 이 카드(커플 합산)에서는 호출하지 않는다.
  const [
    counts,
    mainEmotions,
    conversationFlow,
    albumData,
    datingStartDate,
    todaySchedules,
    todayMessages,
    localBookmarkCount,
  ] = await Promise.all([
    roomId ? safe(getDailyCounts(roomId, todayKey)) : null,
    roomId ? safe(getMainEmotions(roomId, todayKey, "DAY")) : null,
    roomId ? safe(getConversationFlow(roomId, todayKey, "DAY")) : null,
    safe(getAlbumPhotos(), { albumPhotos: [] }),
    safe(getRelationshipStartDate(), ""),
    safe(getTodaySchedules(todayKey), []),
    roomId ? safe(fetchTodayMessages(roomId, todayKey), []) : [],
    roomId ? safe(countTodayBookmarks(roomId, todayKey), 0) : 0,
  ]);

  const albumPhotos = albumData?.albumPhotos ?? [];
  const messages = todayMessages ?? [];

  // 오늘 올린 사진은 채팅 이미지 개수와 별개로 세어 합친다.
  const todayAlbumPhotoCount = albumPhotos.filter(
    (photo) => getResponseDateKey(photo.createdAt) === todayKey
  ).length;

  const localImageCount = messages.reduce(
    (sum, message) => sum + (Array.isArray(message.images) ? message.images.length : 0),
    0
  );

  // 서버 집계가 아직 비어 있으면 오늘 대화에서 직접 계산한 값으로 채운다.
  // 개수는 0을 "아직 집계 전"으로 보고 폴백하지만,
  // busiestHour 는 0시(자정)가 정상값이라 null 일 때만 폴백한다.
  const pick = (serverValue, localValue) =>
    serverValue !== null && serverValue !== undefined && serverValue !== 0
      ? serverValue
      : localValue;

  const pickAllowZero = (serverValue, localValue) =>
    serverValue !== null && serverValue !== undefined ? serverValue : localValue;

  // 커플 합산 메시지 수는 conversation-flow 의 totalMessageCount 를 쓴다.
  // (daily.messageCount 는 나 혼자 보낸 개수라 이 카드 기준과 맞지 않는다)
  const coupleMessageCount = pick(conversationFlow?.totalMessageCount, messages.length);

  const [
    dailyCountsResult,
    conversationFlowResult,
    frequentWordsResult,
    mainEmotionsResult,
    emotionFlowResult,
  ] = dashboardResults;

  const dailyCounts =
    getSettledValue(
      dailyCountsResult ?? {
        status: "rejected",
      },
    );

  const conversationFlow =
    getSettledValue(
      conversationFlowResult ?? {
        status: "rejected",
      },
    );

  const frequentWords =
    getSettledValue(
      frequentWordsResult ?? {
        status: "rejected",
      },
    );

  const mainEmotions =
    getSettledValue(
      mainEmotionsResult ?? {
        status: "rejected",
      },
    );

  const emotionFlow =
    getSettledValue(
      emotionFlowResult ?? {
        status: "rejected",
      },
    );

  const mappedEmotionSummary =
    mapEmotionSummary(mainEmotions);

  const mappedEmotionFlow =
    mapEmotionFlow(emotionFlow);

  return {
    room: currentRoom,
    daysTogether: calcDaysTogether(datingStartDate),
    dashboard: {
      summaryDate: todayKey,
      messageCount: coupleMessageCount,
      totalMessageCount: coupleMessageCount,
      // 커플 합산 사진 개수를 주는 엔드포인트가 없어 오늘 대화에서 직접 센다.
      imageCount: localImageCount + todayAlbumPhotoCount,
      reactionCount: counts?.reactionCount ?? 0,
      // 북마크만 "내" 개수 (백엔드 구조상 커플 합산 불가)
      bookmarkCount: pick(counts?.bookmarkCount, localBookmarkCount ?? 0),
      busiestHour: pickAllowZero(conversationFlow?.busiestHour, calcBusiestHour(messages)),
      averageResponseSeconds: pick(
        conversationFlow?.averageResponseSeconds,
        calcAverageResponseSeconds(messages)
      ),
      // EmotionReport 는 배열/맵 둘 다 받는다. (utils/emotions.js buildEmotionReport)
      emotionSummary: mainEmotions?.emotions ?? [],
      dominantEmotion: mainEmotions?.dominantEmotion ?? null,
      analyzedMessageCount: mainEmotions?.analyzedMessageCount ?? 0,
      // 두 사람이 쓴 말을 합쳐서 센다. (서버 frequent-words 는 내 메시지만 대상이라 쓰지 않는다)
      frequentWords: calcFrequentWords(messages, null),
    },
    todaySchedules: todaySchedules ?? [],
    recentPhotos: albumPhotos.slice(0, RECENT_PHOTO_LIMIT),
  };
}
