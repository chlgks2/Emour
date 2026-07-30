import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import FullScreenLoader from "../components/common/FullScreenLoader";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // 지금은 세션 복원이 동기라서 이 분기를 타지 않지만,
  // 서버 토큰 검증(GET /auth/me)을 붙이면 그 대기 화면이 된다.
  if (initializing) return <FullScreenLoader label="로그인 정보를 확인하고 있어요" />;

  // 로그인 후 원래 가려던 화면으로 돌아갈 수 있도록 경로를 넘긴다.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
