import { apiRequest } from './httpClient.js'
import {
  getPartnerNickname,
  getPartnerProfileImage,
} from './memberApi.js'

const CHAT_ENDPOINTS = {
  messages: '/chats',
  unreadCount: '/chats/unread-count',
  readStatus: '/chats/read-status',
  search: '/chats/search',
  newerMessages: '/chats/after',
  messageContext: (messageId) =>
    `/chats/${messageId}/context`,
  bookmarks: '/chats/bookmarks',
  images: '/chats/images',
  image: (imageId) =>
    `/chats/images/${imageId}`,
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

export async function uploadChatImages({
  roomId,
  files,
}) {
  if (!roomId || !files?.length) {
    throw new Error('업로드할 사진이 없습니다.')
  }

  if (files.length > 10) {
    throw new Error('사진은 한 번에 최대 10장까지 보낼 수 있습니다.')
  }

  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await apiRequest(
    `${CHAT_ENDPOINTS.images}?roomId=${encodeURIComponent(roomId)}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  return response?.imageUrls ?? []
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
  payload,
) {
  const message =
    payload?.data?.message ??
    payload?.data ??
    payload?.message ??
    payload

  if (!message || typeof message !== 'object') {
    return null
  }

  const sentAt = message.sentAt ?? message.sent_at
  const sentTime = new Date(sentAt).getTime()
  const messageId = message.messageId ?? message.message_id ?? null
  const clientMessageId =
    message.clientMessageId ?? message.client_message_id ?? null
  const senderId = message.senderId ?? message.sender_id ?? null
  const images = Array.isArray(message.images) ? message.images : []
  const content = typeof message.content === 'string' ? message.content : ''

  if (
    (!messageId && !clientMessageId) ||
    senderId == null ||
    !Number.isFinite(sentTime) ||
    (!content.trim() && images.length === 0)
  ) {
    return null
  }

  return {
    ...message,
    messageId,
    clientMessageId,
    senderId,
    sentAt,
    content,
    images,
    emotionType:
      message.emotionType ??
      message.emotion ??
      null,
    analysisStatus:
      message.analysisStatus ?? null,
  }
}

export function dedupeChatMessages(messages) {
  const seenMessageIds = new Set()
  const seenClientIds = new Set()

  return messages.filter((message) => {
    if (!message) return false

    const messageKey = message.messageId == null
      ? null
      : String(message.messageId)
    const clientKey = message.clientMessageId || null

    if (
      (messageKey && seenMessageIds.has(messageKey)) ||
      (clientKey && seenClientIds.has(clientKey))
    ) {
      return false
    }

    if (messageKey) seenMessageIds.add(messageKey)
    if (clientKey) seenClientIds.add(clientKey)
    return true
  })
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

export async function getChatMessageContext({
  messageId,
  beforeSize = 30,
  afterSize = 30,
}) {
  const query = createQuery({ beforeSize, afterSize })

  return apiRequest(
    `${CHAT_ENDPOINTS.messageContext(messageId)}?${query}`,
  )
}

export async function getNewerChatMessages({
  roomId,
  afterMessageId,
  size = 50,
}) {
  const query = createQuery({ roomId, afterMessageId, size })

  return apiRequest(
    `${CHAT_ENDPOINTS.newerMessages}?${query}`,
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
  period,
  date,
}) {
  const query = createQuery({
    roomId,
    beforeBookmarkId,
    size,
    period,
    date: period === 'ALL' ? null : date,
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

export async function deleteChatImage(imageId) {
  if (!imageId) {
    throw new Error('삭제할 채팅 사진 정보가 없습니다.')
  }

  return apiRequest(
    CHAT_ENDPOINTS.image(imageId),
    { method: 'DELETE' },
  )
}

/*
 * feature/frontend-minhee의 채팅 화면이 사용하는 호환 API입니다.
 * 기존 Spring 연동 함수는 위에 그대로 유지합니다.
 */
/**
 * 채팅 헤더에 쓰는 상대방 정보.
 *
 * 프로필 사진은 GET /users/partner/profile-img,
 * 상대방 닉네임은 GET /users/partner-nickname 에서 각각 받아온다.
 * 한 요청이 실패해도 채팅방 전체를 막지 않고 가능한 정보만 표시한다.
 */
export async function fetchChatPartner() {
  const [profileResult, nicknameResult] =
    await Promise.allSettled([
      getPartnerProfileImage(),
      getPartnerNickname(),
    ])

  const partner =
    profileResult.status === 'fulfilled'
      ? profileResult.value
      : null
  const nickname =
    nicknameResult.status === 'fulfilled'
      ? nicknameResult.value?.partnerNickname
      : null

  return {
    userId: partner?.userId ?? null,
    nickname:
      nickname?.trim() || '연인',
    statusMessage: '',
    profileImageUrl: partner?.profileImageUrl ?? null,
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
    messages: dedupeChatMessages(
      (response?.messages ?? [])
        .map(normalizeChatMessage)
        .filter(Boolean),
    ),
    nextBeforeMessageId:
      response?.nextCursor ?? null,
  }
}

export async function sendMessage({
  roomId,
  content,
  messageType = 'TEXT',
  imageUrls = [],
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
    messageType,
    imageUrls,
    clientMessageId,
  })

  return normalizeChatMessage(message)
}

export async function fetchSuggestions({ targetMessage }) {
  const content = targetMessage?.trim()

  if (!content) {
    throw new Error('교정할 문구를 입력해주세요.')
  }

  const response = await apiRequest(
    '/chats/suggest',
    {
      method: 'POST',
      body: {
        targetMessage: content,
      },
    },
  )
  const result = response?.data ?? response

  if (result?.blocked) {
    const blockReason =
      result.block_reason ?? result.blockReason
    const guideMessage =
      result.guide_message ?? result.guideMessage
    const fallbackGuideByReason = {
      too_short:
        '메시지가 너무 짧아 추천을 만들지 못했어요.',
      safety:
        '민감한 내용이 감지되어 추천을 만들지 못했어요.',
      llm_failure:
        '일시적인 오류로 추천을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
    }

    throw new Error(
      guideMessage ||
        fallbackGuideByReason[blockReason] ||
        '추천을 만들지 못했어요.',
    )
  }

  return (result?.suggestions ?? []).filter(
    (suggestion) => suggestion?.text,
  )
}
