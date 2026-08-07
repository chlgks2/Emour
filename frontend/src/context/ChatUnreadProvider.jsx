import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

import {
  getUnreadChatCount,
  normalizeChatMessage,
} from '../api/chatApi.js'
import { connectChatSocket } from '../api/chatSocket.js'
import { resolveRoomId } from '../api/coupleRoomContext.js'
import { useAuth } from '../hooks/useAuth.js'
import { ChatUnreadContext } from '../hooks/useChatUnread.js'

const REFRESH_INTERVAL_MS = 30000
const REALTIME_REFRESH_DELAY_MS = 1200
const ROOM_RESOLVE_RETRY_MS = 5000

export function ChatUnreadProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [roomId, setRoomId] = useState(null)
  const pathnameRef = useRef(location.pathname)
  const realtimeRefreshTimerRef = useRef(null)

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    let retryTimerId = null

    if (!isAuthenticated || !user?.userId) {
      return undefined
    }

    const loadRoomId = async () => {
      try {
        const resolvedRoomId = await resolveRoomId()
        if (cancelled) return

        setRoomId(resolvedRoomId)

        // 로그인 직후 방 조회가 아직 준비되지 않았거나 일시적으로 실패해도
        // Provider가 다시 마운트될 때까지 기다리지 않고 재조회한다.
        if (!resolvedRoomId) {
          retryTimerId = window.setTimeout(
            loadRoomId,
            ROOM_RESOLVE_RETRY_MS,
          )
        }
      } catch {
        if (cancelled) return

        setRoomId(null)
        retryTimerId = window.setTimeout(
          loadRoomId,
          ROOM_RESOLVE_RETRY_MS,
        )
      }
    }

    loadRoomId()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimerId)
    }
  }, [isAuthenticated, user?.userId])

  const refreshUnreadCount = useCallback(async (preserveHigher = false) => {
    if (!roomId || !isAuthenticated) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await getUnreadChatCount(roomId)
      const unreadData = response?.data ?? response
      const serverUnreadCount = Math.max(
        0,
        Number(unreadData?.unreadCount) || 0,
      )
      setUnreadCount((previous) =>
        preserveHigher
          ? Math.max(previous, serverUnreadCount)
          : serverUnreadCount,
      )
    } catch {
      // 일시적인 조회 실패에는 기존 배지를 유지한다.
    }
  }, [isAuthenticated, roomId])

  useEffect(() => {
    if (!roomId) return undefined

    if (location.pathname !== '/chat') {
      const timerId = window.setTimeout(refreshUnreadCount, 0)
      return () => window.clearTimeout(timerId)
    }

    return undefined
  }, [location.pathname, refreshUnreadCount, roomId])

  useEffect(() => {
    if (!roomId || !isAuthenticated) return undefined

    const socket = connectChatSocket({
      roomId,
      onMessage: (payload) => {
        if (pathnameRef.current === '/chat') {
          setUnreadCount(0)
          return
        }

        const message = normalizeChatMessage(payload)
        if (
          message?.senderId != null &&
          Number(message.senderId) === Number(user?.userId)
        ) {
          return
        }

        // 배포 환경에서는 메시지 이벤트가 DB 커밋보다 먼저 도착할 수 있다.
        // 우선 배지를 즉시 올리고, 커밋이 끝난 뒤 서버 집계값으로 보정한다.
        setUnreadCount((previous) => previous + 1)

        // 실시간 메시지 본문의 형태와 관계없이 마지막에는 서버가 계산한
        // 실제 미읽음 개수로 맞춘다.
        // 메시지 브로드캐스트가 DB 트랜잭션 커밋보다 먼저 도착할 수 있어
        // 아주 짧게 기다린 뒤 미읽음 수를 조회한다.
        window.clearTimeout(realtimeRefreshTimerRef.current)
        realtimeRefreshTimerRef.current = window.setTimeout(
          () => refreshUnreadCount(true),
          REALTIME_REFRESH_DELAY_MS,
        )
      },
      onRead: () => {
        if (pathnameRef.current === '/chat') {
          setUnreadCount(0)
          return
        }

        refreshUnreadCount()
      },
      onConnect: refreshUnreadCount,
      onError: () => {},
    })

    const intervalId = window.setInterval(
      refreshUnreadCount,
      REFRESH_INTERVAL_MS,
    )
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(realtimeRefreshTimerRef.current)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      socket?.disconnect()
    }
  }, [isAuthenticated, refreshUnreadCount, roomId, user?.userId])

  const visibleUnreadCount =
    isAuthenticated && location.pathname !== '/chat'
      ? unreadCount
      : 0
  const value = useMemo(
    () => ({ unreadCount: visibleUnreadCount, refreshUnreadCount }),
    [refreshUnreadCount, visibleUnreadCount],
  )

  return (
    <ChatUnreadContext.Provider value={value}>
      {children}
    </ChatUnreadContext.Provider>
  )
}
