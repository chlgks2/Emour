import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import Skeleton from "../../common/Skeleton/Skeleton";
import styles from "./ChatHeader.module.css";

/**
 * @param {object|null} partner - { userId, nickname, statusMessage, profileImageUrl }
 *   (user + couple_member 조합)
 * @param {() => void} [onBack] - 뒤로가기 동작. 넘기지 않으면 브라우저 히스토리를 되돌린다.
 * @param {() => void} [onSearchClick]
 * @param {boolean} [searchEnabled] - 메시지 검색 기능이 구현되면 true 로 넘긴다.
 */
export default function ChatHeader({ partner, onBack, onSearchClick, searchEnabled = false }) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={onBack ?? (() => navigate(-1))}
        aria-label="뒤로가기"
      >
        <ChevronLeft size={22} />
      </button>

      <div className={styles.info}>
        {partner ? (
          <>
            <p className={styles.name}>{partner.nickname}</p>
            {partner.statusMessage && <p className={styles.status}>{partner.statusMessage}</p>}
          </>
        ) : (
          // 상대 정보 로딩 중 헤더가 비어 보이지 않게 자리만 잡아둔다
          <div className={styles.infoSkeleton}>
            <Skeleton width="72px" height="14px" />
            <Skeleton width="110px" height="10px" />
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.iconBtn}
        onClick={searchEnabled ? onSearchClick : undefined}
        aria-label="메시지 검색"
        title="메시지 검색"
        disabled={!searchEnabled}
      >
        <Search size={20} />
      </button>
    </header>
  );
}
