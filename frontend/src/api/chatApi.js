import { apiRequest } from './httpClient.js'

const CHAT_ENDPOINTS = {
  messages: '/chats',
  unreadCount: '/chats/unread-count',
  readStatus: '/chats/read-status',
  search: '/chats/search',
  bookmarks: '/chats/bookmarks',
  read: (messageId) =>
    `/chats/${messageId}/read`,
  bookmark: (messageId) =>
    `/chats/${messageId}/bookmark`,
  reaction: (messageId) =>
    `/chats/${messageId}/reaction`,
}

function createQuery(values) {
  const query = new URLSearchParams()

  Object.entries(values).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        query.set(key, String(value))
      }
    },
  )

  return query.toString()
}

export async function getChatMessages({
  roomId,
  beforeMessageId,
  size,
}) {
  const query = createQuery({
    roomId,
    beforeMessageId,
    size,
  })

  return apiRequest(
    `${CHAT_ENDPOINTS.messages}?${query}`,
  )
}

export async function sendChatMessage({
  roomId,
  content,
  messageType = 'TEXT',
  imageUrls = [],
  clientMessageId =
    crypto.randomUUID(),
}) {
  return apiRequest(
    CHAT_ENDPOINTS.messages,
    {
      method: 'POST',
      body: {
        roomId,
        clientMessageId,
        content,
        messageType,
        imageUrls,
      },
    },
  )
}

export async function getUnreadChatCount(
  roomId,
) {
  const query = createQuery({ roomId })

  return apiRequest(
    `${CHAT_ENDPOINTS.unreadCount}?${query}`,
  )
}

export function normalizeChatMessage(
  message,
) {
  if (!message) {
    return message
  }

  return {
    ...message,
    emotionType:
      message.emotionType ??
      message.emotion ??
      null,
    analysisStatus:
      message.analysisStatus ?? null,
  }
}

export async function getPartnerReadStatus(
  roomId,
) {
  if (!roomId) {
    return {
      roomId: null,
      partnerLastReadMessageId: null,
      partnerReadAt: null,
    }
  }

  const query = createQuery({ roomId })

  return apiRequest(
    `${CHAT_ENDPOINTS.readStatus}?${query}`,
  )
}

export async function markChatMessageAsRead(
  messageId,
) {
  return apiRequest(
    CHAT_ENDPOINTS.read(messageId),
    {
      method: 'POST',
    },
  )
}

export async function searchChatMessages({
  roomId,
  keyword,
  beforeMessageId,
  size,
}) {
  const query = createQuery({
    roomId,
    keyword,
    beforeMessageId,
    size,
  })

  return apiRequest(
    `${CHAT_ENDPOINTS.search}?${query}`,
  )
}

export async function addChatBookmark(
  messageId,
) {
  return apiRequest(
    CHAT_ENDPOINTS.bookmark(messageId),
    {
      method: 'POST',
    },
  )
}

export async function removeChatBookmark(
  messageId,
) {
  await apiRequest(
    CHAT_ENDPOINTS.bookmark(messageId),
    {
      method: 'DELETE',
    },
  )
}

export async function getChatBookmarks({
  roomId,
  beforeBookmarkId,
  size,
}) {
  const query = createQuery({
    roomId,
    beforeBookmarkId,
    size,
  })

  return apiRequest(
    `${CHAT_ENDPOINTS.bookmarks}?${query}`,
  )
}

export async function setChatReaction({
  messageId,
  reactionType,
}) {
  return apiRequest(
    CHAT_ENDPOINTS.reaction(messageId),
    {
      method: 'POST',
      body: {
        reactionType,
      },
    },
  )
}

export async function removeChatReaction(
  messageId,
) {
  await apiRequest(
    CHAT_ENDPOINTS.reaction(messageId),
    {
      method: 'DELETE',
    },
  )
}

/*
 * feature/frontend-minhee의 채팅 화면이 사용하는 호환 API입니다.
 * 기존 Spring 연동 함수는 위에 그대로 유지합니다.
 */
export async function fetchChatPartner() {
  return {
    nickname: '연인',
    statusMessage: '',
    profileImageUrl: null,
  }
}

export async function fetchPartnerReadState(
  roomId,
) {
  const readStatus =
    await getPartnerReadStatus(roomId)

  return {
    lastReadMessageId:
      readStatus?.partnerLastReadMessageId ??
      null,
    readAt:
      readStatus?.partnerReadAt ?? null,
  }
}

export async function fetchMessages({
  roomId,
  beforeMessageId = null,
  size = 20,
} = {}) {
  if (!roomId) {
    return {
      messages: [],
      nextBeforeMessageId: null,
    }
  }

  const response = await getChatMessages({
    roomId,
    beforeMessageId,
    size,
  })

  return {
    messages: (
      response?.messages ?? []
    ).map(normalizeChatMessage),
    nextBeforeMessageId:
      response?.nextCursor ?? null,
  }
}

export async function sendMessage({
  roomId,
  content,
  clientMessageId = crypto.randomUUID(),
}) {
  if (!roomId) {
    throw new Error(
      '연결된 커플방 정보가 없습니다.',
    )
  }

  const message = await sendChatMessage({
    roomId,
    content,
    clientMessageId,
  })

  return normalizeChatMessage(message)
}

export async function fetchSuggestions() {
  return []
}
