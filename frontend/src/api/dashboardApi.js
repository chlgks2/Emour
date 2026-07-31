import {
  mockCoupleRoom,
  mockDashboard,
  mockTodaySchedules,
} from "./mock/db";
import { getAlbumPhotos } from "./albumApi.js";
import {
  getChatBookmarks,
  getChatMessages,
} from "./chatApi.js";
import { getMyCoupleRoom } from "./coupleApi.js";
import {
  getRelationshipStartDate,
} from "./calendarApi.js";
import {
  getCurrentCoupleRoom,
} from "../utils/pendingCoupleRoom.js";

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const RECENT_PHOTO_LIMIT = 5;
const CONVERSATION_PAGE_SIZE = 100;

function formatLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getResponseDateKey(value) {
  return value
    ? String(value).slice(0, 10)
    : "";
}

function getTodayAlbumPhotoCount(
  albumPhotos,
  todayKey,
) {
  if (!Array.isArray(albumPhotos)) {
    return 0;
  }

  return albumPhotos.filter(
    (photo) =>
      getResponseDateKey(
        photo.createdAt,
      ) === todayKey,
  ).length;
}

async function getTodayMessageStats(
  roomId,
  todayKey,
) {
  let beforeMessageId = null;
  let messageCount = 0;
  let imageCount = 0;
  const visitedCursors = new Set();

  while (true) {
    const response = await getChatMessages({
      roomId,
      beforeMessageId,
      size: CONVERSATION_PAGE_SIZE,
    });

    const messages = response?.messages ?? [];

    messages.forEach((message) => {
      if (
        getResponseDateKey(message.sentAt) !==
        todayKey
      ) {
        return;
      }

      messageCount += 1;
      imageCount += Array.isArray(
        message.images,
      )
        ? message.images.length
        : 0;
    });

    const reachedPreviousDate =
      messages.some(
        (message) =>
          getResponseDateKey(message.sentAt) <
          todayKey,
      );

    const nextCursor =
      response?.hasNext
        ? response.nextCursor
        : null;

    if (
      reachedPreviousDate ||
      !nextCursor ||
      visitedCursors.has(nextCursor)
    ) {
      break;
    }

    visitedCursors.add(nextCursor);
    beforeMessageId = nextCursor;
  }

  return {
    messageCount,
    imageCount,
  };
}

async function getTodayBookmarkCount(
  roomId,
  todayKey,
) {
  let beforeBookmarkId = null;
  let bookmarkCount = 0;
  const visitedCursors = new Set();

  while (true) {
    const response = await getChatBookmarks({
      roomId,
      beforeBookmarkId,
      size: CONVERSATION_PAGE_SIZE,
    });

    const bookmarks =
      response?.bookmarks ?? [];

    bookmarks.forEach((bookmark) => {
      if (
        getResponseDateKey(
          bookmark.bookmarkedAt,
        ) === todayKey
      ) {
        bookmarkCount += 1;
      }
    });

    const reachedPreviousDate =
      bookmarks.some(
        (bookmark) =>
          getResponseDateKey(
            bookmark.bookmarkedAt,
          ) < todayKey,
      );

    const nextCursor =
      response?.hasNext
        ? response.nextCursor
        : null;

    if (
      reachedPreviousDate ||
      !nextCursor ||
      visitedCursors.has(nextCursor)
    ) {
      break;
    }

    visitedCursors.add(nextCursor);
    beforeBookmarkId = nextCursor;
  }

  return bookmarkCount;
}

async function getTodayConversationStats(
  roomId,
  todayKey,
) {
  if (!roomId) {
    return {
      messageCount: 0,
      imageCount: 0,
      bookmarkCount: 0,
    };
  }

  const [
    messageStats,
    bookmarkCount,
  ] = await Promise.all([
    getTodayMessageStats(
      roomId,
      todayKey,
    ),
    getTodayBookmarkCount(
      roomId,
      todayKey,
    ),
  ]);

  return {
    ...messageStats,
    bookmarkCount,
  };
}

/**
 * 사귄 날짜(couple_room.dating_start_date)로부터 D+N 계산.
 * daysTogether 는 DB 컬럼이 아니라 프론트 파생값이다.
 * (서버가 계산해서 내려주기로 하면 이 함수는 지우고 응답값을 그대로 쓰면 된다.)
 */
export function calcDaysTogether(datingStartDate, today = new Date()) {
  if (!datingStartDate) return null;
  const start = new Date(`${datingStartDate}T00:00:00`);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 만난 날을 1일로 계산
}

/**
 * 홈 대시보드 데이터 조회
 * 백엔드 연동 시: GET /api/dashboard?summaryDate={YYYY-MM-DD}
 *
 * 응답 구성(테이블별)
 * - room       : couple_room (roomId, datingStartDate, ...)
 * - dashboard  : dashboard 1행 (summaryDate, messageCount, imageCount, reactionCount,
 *                bookmarkCount, averageResponseSeconds, busiestHour,
 *                emotionSummary, emotionFlow, frequentWords)
 * - todaySchedules : couple_schedule (오늘 날짜)
 * - recentPhotos   : album_photo (최근순)
 *
 * 참고: 감정 캘린더(mood)는 moodApi 에서 따로 조회한다.
 */
export async function fetchDashboard() {
  const storedRoom =
    getCurrentCoupleRoom();

  const currentRoom =
    storedRoom?.roomId
      ? storedRoom
      : await getMyCoupleRoom();

  const roomId =
    currentRoom?.roomId ?? null;

  const todayKey =
    formatLocalDateKey();

  const [
    ,
    albumData,
    conversationStats,
    datingStartDate,
  ] = await Promise.all([
    delay(),
    getAlbumPhotos(),
    getTodayConversationStats(
      roomId,
      todayKey,
    ),
    getRelationshipStartDate(),
  ]);

  const todayAlbumPhotoCount =
    getTodayAlbumPhotoCount(
      albumData.albumPhotos,
      todayKey,
    );

  return {
    room: currentRoom ?? mockCoupleRoom,
    daysTogether: calcDaysTogether(
      datingStartDate,
    ),
    dashboard: {
      ...mockDashboard,
      summaryDate: todayKey,
      ...conversationStats,
      imageCount:
        conversationStats.imageCount +
        todayAlbumPhotoCount,
    },
    todaySchedules: mockTodaySchedules,
    recentPhotos: albumData.albumPhotos.slice(
      0,
      RECENT_PHOTO_LIMIT,
    ),
  };
}
