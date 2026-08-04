import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getCoupleStatus } from '../../api/coupleApi.js'
import { useAuth } from '../../hooks/useAuth.js'
import FullScreenLoader from '../common/FullScreenLoader/FullScreenLoader.jsx'

const ACCESSIBLE_ROOM_STATUSES = new Set([
  'ACTIVE',
  'INACTIVE',
])

export default function CoupleRouteGuard({ children }) {
  const location = useLocation()
  const { isAuthenticated, initializing } = useAuth()
  const [roomStatus, setRoomStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined
    }

    let cancelled = false

    getCoupleStatus()
      .then((couple) => {
        if (!cancelled) {
          setRoomStatus(couple?.status ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoomStatus(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, location.pathname])

  if (initializing) {
    return <FullScreenLoader label="로그인 상태를 확인하는 중" />
  }

  // 토큰 만료로 방 상태 조회가 401이 된 경우에는 방 생성 화면이 아니라
  // 로그인 화면으로 돌아가야 한다.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (loading) {
    return <FullScreenLoader label="커플방 상태를 확인하는 중" />
  }

  if (roomStatus === 'WAITING') {
    return <Navigate to="/mypage" replace />
  }

  if (!ACCESSIBLE_ROOM_STATUSES.has(roomStatus)) {
    return <Navigate to="/couple/connect" replace />
  }

  return children
}
