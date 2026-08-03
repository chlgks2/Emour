import Skeleton from "../../common/Skeleton/Skeleton";
import styles from "./DashboardSkeleton.module.css";

/**
 * 대시보드 로딩 자리 표시.
 * "불러오는 중..." 한 줄보다 실제 레이아웃을 미리 보여줘 화면이 덜 튄다.
 */
export default function DashboardSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className="sr-only">대시보드를 불러오는 중입니다</span>

      <div className={styles.topBar}>
        <Skeleton width="80px" height="11px" />
        <Skeleton width="160px" height="18px" />
      </div>

      <div className={styles.card}>
        <Skeleton width="40px" height="14px" />
        <div className={styles.circleRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width="40px" height="40px" circle />
          ))}
        </div>
        <Skeleton height="36px" radius="var(--radius-pill)" />
      </div>

      <div className={styles.gridRow}>
        <div className={styles.card}>
          <Skeleton width="70%" height="13px" />
          <Skeleton height="12px" />
          <Skeleton width="80%" height="12px" />
        </div>
        <div className={styles.card}>
          <Skeleton width="70%" height="13px" />
          <Skeleton width="86px" height="86px" circle className={styles.donut} />
        </div>
      </div>

      <div className={styles.card}>
        <Skeleton width="50%" height="13px" />
        <Skeleton height="180px" radius="var(--radius-md)" />
      </div>
    </div>
  );
}
