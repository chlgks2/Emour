import {
  addChatBookmark,
  getChatBookmarks,
  removeChatBookmark,
} from './chatApi.js'
import {
  resolveRoomId,
} from './coupleRoomContext.js'

/*
 * 예전에는 localStorage 에 저장된 방만 봤다. 그래서 저장된 값이 없거나
 * 서버 쪽 방이 바뀐 뒤에는 북마크를 통째로 못 불러왔다.
 */
async function getRoomId(roomId) {
  return roomId ?? (await resolveRoomId())
}

function mapBookmark(bookmark) {
  const message = bookmark.message ?? {}

  return {
    bookmarkId: bookmark.bookmarkId,
    roomId: message.roomId,
    messageId: message.messageId,
    content: message.content,
    senderId: message.senderId,
    sentAt: message.sentAt,
    createdAt: bookmark.bookmarkedAt,
  }
}

export async function fetchBookmarks({
  cursorBookmarkId = null,
  size = 20,
  roomId,
} = {}) {
  const currentRoomId = await getRoomId(roomId)

  if (!currentRoomId) {
    return {
      bookmarks: [],
      nextCursorBookmarkId: null,
    }
  }

  const response = await getChatBookmarks({
    roomId: currentRoomId,
    beforeBookmarkId:
      cursorBookmarkId,
    size,
  })

  return {
    bookmarks:
      response?.bookmarks?.map(
        mapBookmark,
      ) ?? [],
    nextCursorBookmarkId:
      response?.hasNext
        ? response.nextCursor
        : null,
  }
}

export async function fetchRecentBookmarks(
  size = 3,
) {
  const result = await fetchBookmarks({
    size,
  })

  return result.bookmarks
}

export async function fetchBookmarkedMessageIds(
  roomId,
) {
  const result = await fetchBookmarks({
    roomId,
    size: 100,
  })

  return new Set(
    result.bookmarks.map(
      (bookmark) => bookmark.messageId,
    ),
  )
}

export async function addBookmark(message) {
  await addChatBookmark(message.messageId)
  return { bookmarked: true }
}

export async function removeBookmark(
  messageId,
) {
  await removeChatBookmark(messageId)
  return { bookmarked: false }
}

export async function toggleBookmark(
  message,
  isCurrentlyBookmarked,
) {
  return isCurrentlyBookmarked
    ? removeBookmark(message.messageId)
    : addBookmark(message)
}
