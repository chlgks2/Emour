import { useNavigate } from "react-router-dom";
import { Hammer } from "lucide-react";
import BottomNav from "../../components/layout/BottomNav/BottomNav";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import styles from "./ComingSoonPage.module.css";

/**
 * 아직 구현되지 않은 탭(캘린더/앨범/마이) 자리.
 * 기존에는 /dashboard 로 조용히 리다이렉트해서 "탭을 눌렀는데 아무 일도 안 나는" 것처럼 보였다.
 * 준비 중임을 명확히 알려주는 편이 덜 혼란스럽다.
 */
export default function ComingSoonPage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className={styles.header}>
        <p className={styles.headerTitle}>{title}</p>
      </header>

      <div className={styles.body}>
        <EmptyState
          icon={<Hammer size={22} />}
          title={`${title} 화면은 준비 중이에요`}
          description="다음 업데이트에서 만나요. 그동안 홈에서 오늘의 감정을 기록해보세요!"
          actionLabel="홈으로 가기"
          onAction={() => navigate("/dashboard")}
        />
      </div>

      <BottomNav />
    </div>
  );
}
