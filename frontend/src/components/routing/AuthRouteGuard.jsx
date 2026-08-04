import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth.js'
import FullScreenLoader from '../common/FullScreenLoader/FullScreenLoader.jsx'

export default function AuthRouteGuard({ children }) {
  const location = useLocation()
  const { isAuthenticated, initializing } = useAuth()

  if (initializing) {
    return <FullScreenLoader label="로그인 상태를 확인하는 중" />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return children
}
