import { Menu } from "lucide-react";
import styles from "./DashboardTopBar.module.css";

/**
 * @param {number|null} daysTogether
 *   couple_room.dating_start_date 로부터 계산한 파생값 (DB 컬럼 아님)
 * @param {() => void} [onMenuClick]
 * @param {boolean} [menuEnabled] - 사이드 메뉴가 구현되면 true 로 넘긴다.
 */
export default function DashboardTopBar({ daysTogether, onMenuClick, menuEnabled = false }) {
  return (
    <div className={styles.topBar}>
      <div>
        <p className={styles.label}>오늘까지</p>
        <p className={styles.days}>
          우리 함께한 지{" "}
          <span>{daysTogether != null ? `${daysTogether.toLocaleString("ko-KR")}일` : "-"}</span>
        </p>
      </div>
      {/* 사이드 메뉴는 아직 미구현이라 비활성화 상태로 둔다. (구현 시 menuEnabled 전달) */}
      <button
        type="button"
        className={styles.menuBtn}
        onClick={menuEnabled ? onMenuClick : undefined}
        aria-label="메뉴 열기 (준비 중)"
        title="준비 중이에요"
        disabled={!menuEnabled}
      >
        <Menu size={22} />
      </button>
    </div>
  );
}
