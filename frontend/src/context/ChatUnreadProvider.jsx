import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

import { getUnreadChatCount } from '../api/chatApi.js'
import { connectChatSocket } from '../api/chatSocket.js'
import { resolveRoomId } from '../api/coupleRoomContext.js'
import { useAuth } from '../hooks/useAuth.js'
import { ChatUnreadContext } from '../hooks/useChatUnread.js'

const REFRESH_INTERVAL_MS = 30000
const REALTIME_REFRESH_DELAY_MS = 250

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

    if (!isAuthenticated || !user?.userId) {
      return undefined
    }

    resolveRoomId()
      .then((resolvedRoomId) => {
        if (!cancelled) setRoomId(resolvedRoomId)
      })
      .catch(() => {
        if (!cancelled) setRoomId(null)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.userId])

  const refreshUnreadCount = useCallback(async () => {
    if (!roomId || !isAuthenticated) {
      setUnreadCount(0)
      return
    }

    try {
      const response = await getUnreadChatCount(roomId)
      const unreadData = response?.data ?? response
      setUnreadCount(
        Math.max(0, Number(unreadData?.unreadCount) || 0),
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
      onMessage: () => {
        if (pathnameRef.current === '/chat') {
          setUnreadCount(0)
          return
        }

        // 실시간 메시지 본문의 형태와 관계없이 서버가 계산한 실제
        // 미읽음 개수를 다시 조회한다. 본인이 보낸 메시지는 서버 집계에서
        // 제외되므로 별도의 발신자 판별도 필요하지 않다.
        // 메시지 브로드캐스트가 DB 트랜잭션 커밋보다 먼저 도착할 수 있어
        // 아주 짧게 기다린 뒤 미읽음 수를 조회한다.
        window.clearTimeout(realtimeRefreshTimerRef.current)
        realtimeRefreshTimerRef.current = window.setTimeout(
          refreshUnreadCount,
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
  }, [isAuthenticated, refreshUnreadCount, roomId])

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
