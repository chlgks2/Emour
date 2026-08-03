import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { getCoupleStatus } from '../../api/coupleApi.js'
import FullScreenLoader from '../common/FullScreenLoader/FullScreenLoader.jsx'

const ACCESSIBLE_ROOM_STATUSES = new Set([
  'ACTIVE',
  'INACTIVE',
])

export default function CoupleRouteGuard({ children }) {
  const location = useLocation()
  const [roomStatus, setRoomStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [location.pathname])

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
