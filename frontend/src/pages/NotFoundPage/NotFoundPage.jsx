import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import styles from "./NotFoundPage.module.css";

/**
 * 없는 주소로 들어온 경우.
 * 기존에는 로그인 화면으로 리다이렉트해서, 로그인된 사용자가 갑자기 로그아웃된 것처럼 보였다.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className={`app-shell ${styles.wrap}`}>
      <EmptyState
        icon={<Compass size={22} />}
        title="페이지를 찾을 수 없어요"
        description="주소가 바뀌었거나 삭제된 화면일 수 있어요."
        actionLabel={isAuthenticated ? "홈으로 가기" : "로그인 화면으로"}
        onAction={() => navigate(isAuthenticated ? "/dashboard" : "/login", { replace: true })}
      />
    </div>
  );
}
