import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/$/, '')

const WS_BASE_URL = (
  import.meta.env.VITE_WS_BASE_URL ?? ''
).replace(/\/$/, '')

function getWebSocketUrl() {
  if (WS_BASE_URL) {
    return new URL(
      WS_BASE_URL,
      window.location.origin,
    ).toString()
  }

  if (
    API_BASE_URL &&
    /^https?:\/\//i.test(API_BASE_URL)
  ) {
    return `${API_BASE_URL}/ws`
  }

  return new URL(
    '/ws',
    window.location.origin,
  ).toString()
}

function parseFrame(frame) {
  try {
    return JSON.parse(frame.body)
  } catch {
    return null
  }
}

export function connectChatSocket({
  roomId,
  onMessage,
  onReaction,
  onImageDelete,
  onRead,
  onConnect,
  onError,
}) {
  const accessToken =
    localStorage.getItem('accessToken')

  if (!roomId || !accessToken) {
    onError?.(
      new Error(
        '채팅방 또는 로그인 정보가 없습니다.',
      ),
    )
    return null
  }

  const client = new Client({
    webSocketFactory: () =>
      new SockJS(
        getWebSocketUrl(),
      ),
    reconnectDelay: 3000,
    connectHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    debug: () => {},
  })

  client.onConnect = () => {
    client.subscribe(
      `/sub/chat/rooms/${roomId}/messages`,
      (frame) => {
        const message = parseFrame(frame)
        if (message) {
          onMessage?.(message)
        }
      },
    )

    client.subscribe(
      `/sub/chat/rooms/${roomId}/reactions`,
      (frame) => {
        const event = parseFrame(frame)
        if (event) {
          onReaction?.(event)
        }
      },
    )

    client.subscribe(
      `/sub/chat/rooms/${roomId}/images`,
      (frame) => {
        const event = parseFrame(frame)
        if (event) {
          onImageDelete?.(event)
        }
      },
    )

    client.subscribe(
      `/sub/chat/rooms/${roomId}/read`,
      (frame) => {
        const readState = parseFrame(frame)
        if (readState) {
          onRead?.(readState)
        }
      },
    )

    client.subscribe(
      '/user/queue/errors',
      (frame) => {
        onError?.(
          new Error(
            frame.body ||
              '채팅 서버 오류가 발생했습니다.',
          ),
        )
      },
    )

    onConnect?.()
  }

  client.onStompError = (frame) => {
    onError?.(
      new Error(
        frame.body ||
          frame.headers.message ||
          '채팅 연결에 실패했습니다.',
      ),
    )
  }

  client.onWebSocketError = () => {
    onError?.(
      new Error(
        '실시간 채팅 서버에 연결하지 못했습니다.',
      ),
    )
  }

  client.activate()

  return {
    disconnect() {
      return client.deactivate()
    },

    markAsRead(lastReadMessageId) {
      if (
        !client.connected ||
        !lastReadMessageId
      ) {
        return false
      }

      client.publish({
        destination:
          `/pub/chat/rooms/${roomId}/read`,
        headers: {
          'content-type':
            'application/json',
        },
        body: JSON.stringify({
          lastReadMessageId,
        }),
      })

      return true
    },
  }
}
