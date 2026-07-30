// ─────────────────────────────────────────────────────────
// 북마크 목업 API (chat_bookmark 테이블 기준)
// 지금은 백엔드가 없어서 localStorage로 데이터를 흉내내지만,
// 함수 시그니처와 필드명은 실제 서버 연동을 염두에 두고 ERD에 맞춰 설계했습니다.
// 각 함수 위 TODO 주석에 나중에 붙일 실제 엔드포인트를 적어뒀습니다.
//
// 목록 아이템 형태 (chat_bookmark + chat_message 조인 결과 가정):
//   { bookmarkId, roomId, userId, messageId, content, senderId, sentAt, createdAt }
//   - content / senderId / sentAt : chat_message 쪽 값
//   - createdAt : 북마크를 누른 시각
//
// ⚠️ 북마크는 "나만 보이는" 개인 데이터입니다.
//    (상대방이 내가 북마크했는지 알 수 없어야 함)
//    실제 서버에서는 로그인한 사용자(user_id) 기준으로 필터링해서 내려줘야 합니다.
// ─────────────────────────────────────────────────────────

import { MOCK_ROOM_ID, MY_USER_ID } from "./mock/db";

const STORAGE_KEY = "mock_bookmarks_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 최신순: 북마크를 누른 시각(created_at) 기준
function sortByLatest(list) {
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function nextBookmarkId(list) {
  return list.reduce((max, b) => Math.max(max, b.bookmarkId ?? 0), 0) + 1;
}

/**
 * 북마크 전체 목록 조회 (최신순, 커서 기반 페이지네이션 - 북마크 페이지 무한스크롤용)
 * @param {{ cursorBookmarkId: number|null, size: number }} params
 * TODO: 백엔드 연동 시 -> GET /api/bookmarks?cursorBookmarkId={bookmarkId}&size={size}
 */
export async function fetchBookmarks({ cursorBookmarkId = null, size = 20 } = {}) {
  await delay();
  const all = sortByLatest(readAll());
  const startIndex = cursorBookmarkId
    ? all.findIndex((b) => b.bookmarkId === cursorBookmarkId) + 1
    : 0;
  const page = all.slice(startIndex, startIndex + size);
  const hasNext = startIndex + size < all.length;
  return {
    bookmarks: page,
    nextCursorBookmarkId: hasNext ? page[page.length - 1]?.bookmarkId ?? null : null,
  };
}

/**
 * 대시보드 미리보기용 최신 N개 (기본 3개)
 * TODO: 백엔드 연동 시 -> GET /api/bookmarks/recent?size={size}
 */
export async function fetchRecentBookmarks(size = 3) {
  await delay();
  return sortByLatest(readAll()).slice(0, size);
}

/**
 * 채팅방 진입 시, 내가 북마크한 messageId 목록을 Set으로 조회
 * (메시지 하나하나 북마크 여부를 물어보지 않고 한 번에 받아와 MessageBubble에 매핑하기 위함)
 * TODO: 백엔드 연동 시 -> GET /api/bookmarks/message-ids
 *       (또는 메시지 목록 응답에 bookmarked 필드 포함)
 */
export async function fetchBookmarkedMessageIds() {
  await delay(50);
  return new Set(readAll().map((b) => b.messageId));
}

/**
 * 북마크 추가
 * @param {{ messageId: number, content: string, sentAt: string, senderId: number }} message
 * TODO: 백엔드 연동 시 -> POST /api/bookmarks { messageId }
 */
export async function addBookmark(message) {
  await delay();
  const all = readAll();
  if (all.some((b) => b.messageId === message.messageId)) {
    return { bookmarked: true };
  }
  all.push({
    bookmarkId: nextBookmarkId(all),
    roomId: message.roomId ?? MOCK_ROOM_ID,
    userId: MY_USER_ID,
    messageId: message.messageId,
    content: message.content,
    senderId: message.senderId,
    sentAt: message.sentAt,
    createdAt: new Date().toISOString(),
  });
  writeAll(all);
  return { bookmarked: true };
}

/**
 * 북마크 해제
 * TODO: 백엔드 연동 시 -> DELETE /api/bookmarks/messages/{messageId}
 */
export async function removeBookmark(messageId) {
  await delay();
  writeAll(readAll().filter((b) => b.messageId !== messageId));
  return { bookmarked: false };
}

/**
 * 북마크 토글 (액션시트에서 버튼 하나로 추가/해제 전환할 때 사용)
 */
export async function toggleBookmark(message, isCurrentlyBookmarked) {
  if (isCurrentlyBookmarked) {
    return removeBookmark(message.messageId);
  }
  return addBookmark(message);
}
