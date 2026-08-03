import styles from "./DashboardTopBar.module.css";

/**
 * @param {number|null} daysTogether
 *   couple_room.dating_start_date 로부터 계산한 파생값 (DB 컬럼 아님)
 */
export default function DashboardTopBar({ daysTogether }) {
  return (
    <div className={styles.topBar}>
      <div>
        <p className={styles.label}>오늘까지</p>
        <p className={styles.days}>
          우리 함께한 지{" "}
          <span>{daysTogether != null ? `${daysTogether.toLocaleString("ko-KR")}일` : "-"}</span>
        </p>
      </div>
    </div>
  );
}
