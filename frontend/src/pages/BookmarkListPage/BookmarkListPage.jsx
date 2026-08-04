import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, ChevronLeft, CloudOff, MessageSquareText } from "lucide-react";
import ConfirmDialog from "../../components/common/ConfirmDialog/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState/EmptyState";
import Skeleton from "../../components/common/Skeleton/Skeleton";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { fetchBookmarks, removeBookmark } from "../../api/bookmarkApi";
import { formatDate, formatTime } from "../../utils/emotions";
import { useToast } from "../../hooks/useToast";
import { useLiveSync } from "../../hooks/useLiveSync";
import styles from "./BookmarkListPage.module.css";

/**
 * 북마크 전체 목록 페이지
 * - 대시보드의 "더보기"에서 진입
 * - 채팅 내용 / 전송 일시 / 북마크 해제 버튼 노출
 * - 스크롤 시 무한 로딩(20개씩)
 */
const PAGE_SIZE = 20;

export default function BookmarkListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bookmarks, setBookmarks] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pendingRemoveMessageId, setPendingRemoveMessageId] = useState(null);

  // 커서/더보기 여부는 렌더에 직접 쓰이지 않고 "다음 요청 파라미터"로만 쓰이므로 ref 로 관리한다.
  // (state 로 두면 loadPage 가 매번 새로 만들어지면서 IntersectionObserver 가 재생성된다)
  const cursorRef = useRef(null);
  const fetchingRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async ({ reset = false } = {}) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (reset) {
        cursorRef.current = null;
        setBookmarks([]);
        setLoadError(false);
        setInitialLoading(true);
      }
      setLoadingMore(true);
      try {
        const { bookmarks: page, nextCursorBookmarkId } = await fetchBookmarks({
          cursorBookmarkId: cursorRef.current,
          size: PAGE_SIZE,
        });
        cursorRef.current = nextCursorBookmarkId;
        setBookmarks((prev) => (reset ? page : [...prev, ...page]));
        setHasMore(nextCursorBookmarkId !== null);
      } catch {
        // 실패 시 더보기를 멈춰서 무한 재시도로 도는 것을 막는다.
        setHasMore(false);
        setLoadError(true);
      } finally {
        fetchingRef.current = false;
        setLoadingMore(false);
        setInitialLoading(false);
      }
    },
    []
  );

  const { containerRef, sentinelRef } = useInfiniteScroll({
    onLoadMore: loadPage,
    hasMore,
    loading: loadingMore,
  });

  // 최초 진입 시 첫 페이지 로드.
  // effect 안에서 곧바로 setState 하면 cascading render 가 되므로 microtask 뒤로 미룬다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) loadPage();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const refreshBookmarks = useCallback(async () => {
    if (pendingRemoveMessageId !== null) return;

    try {
      const { bookmarks: latest, nextCursorBookmarkId } =
        await fetchBookmarks({
          cursorBookmarkId: null,
          size: PAGE_SIZE,
        });
      cursorRef.current = nextCursorBookmarkId;
      setBookmarks(latest);
      setHasMore(nextCursorBookmarkId !== null);
      setLoadError(false);
    } catch {
      // 백그라운드 동기화 실패는 현재 목록을 유지한다.
    }
  }, [pendingRemoveMessageId]);

  useLiveSync(refreshBookmarks);

  const handleRetry = () => {
    setHasMore(true);
    loadPage({ reset: true });
  };

  const handleRemoveConfirm = async () => {
    const targetMessageId = pendingRemoveMessageId;
    setPendingRemoveMessageId(null);
    try {
      await removeBookmark(targetMessageId);
      setBookmarks((prev) => prev.filter((b) => b.messageId !== targetMessageId));
      showToast("북마크를 해제했어요.");
    } catch {
      showToast("북마크를 해제하지 못했어요.", { tone: "error" });
    }
  };

  const showEmpty = !initialLoading && !loadError && bookmarks.length === 0;

  return (
    <div className="app-shell">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
        >
          <ChevronLeft size={22} />
        </button>
        <p className={styles.headerTitle}>북마크</p>
        <div className={styles.headerSpacer} />
      </header>

      {/* data-scroll-container: 확인 다이얼로그가 열리면 global.css 가 이 영역의 스크롤을 잠근다 */}
      <div
        className={styles.listArea}
        ref={containerRef}
        aria-busy={initialLoading}
        data-scroll-container
      >
        {initialLoading && (
          <div className={styles.skeletonList}>
            <span className="sr-only">북마크를 불러오는 중입니다</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <Skeleton height="14px" />
                <Skeleton width="55%" height="11px" />
              </div>
            ))}
          </div>
        )}

        {!initialLoading && loadError && (
          <EmptyState
            tone="error"
            icon={<CloudOff size={22} />}
            title="북마크를 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
            actionLabel="다시 시도"
            onAction={handleRetry}
          />
        )}

        {showEmpty && (
          <EmptyState
            icon={<Bookmark size={22} />}
            title="아직 북마크한 대화가 없어요"
            description="채팅방에서 메시지를 꾹 눌러 마음에 남는 대화를 저장해보세요."
            actionLabel="채팅방으로 가기"
            onAction={() => navigate("/chat")}
          />
        )}

        {bookmarks.map((bookmark) => (
          <div key={bookmark.bookmarkId} className={styles.item}>
            <div className={styles.itemBody}>
              {bookmark.content && (
                <p className={styles.itemText}>{bookmark.content}</p>
              )}
              {bookmark.images.length > 0 && (
                <div className={styles.imageGrid}>
                  {bookmark.images.map((image, index) => (
                    <img
                      key={image.imageId ?? image.imageUrl}
                      className={styles.image}
                      src={image.imageUrl}
                      alt={`북마크한 사진 ${index + 1}`}
                    />
                  ))}
                </div>
              )}
              <p className={styles.itemMeta}>
                <time dateTime={bookmark.sentAt}>
                  {formatDate(bookmark.sentAt)} {formatTime(bookmark.sentAt)}
                </time>
              </p>
            </div>
            <div className={styles.itemActions}>
              <button
                type="button"
                className={styles.moveBtn}
                onClick={() => navigate("/chat", {
                  state: { focusMessageId: bookmark.messageId },
                })}
              >
                <MessageSquareText size={12} aria-hidden="true" />
                대화로 이동
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => setPendingRemoveMessageId(bookmark.messageId)}
              >
                해제
              </button>
            </div>
          </div>
        ))}

        {hasMore && !initialLoading && (
          <div ref={sentinelRef} className={styles.sentinel}>
            {loadingMore && <span className={styles.loadingText}>더 불러오는 중...</span>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemoveMessageId !== null}
        title="북마크를 해제할까요?"
        description="목록에서 사라지며, 되돌리려면 채팅방에서 다시 북마크해야 해요."
        confirmLabel="해제"
        cancelLabel="취소"
        destructive
        onConfirm={handleRemoveConfirm}
        onCancel={() => setPendingRemoveMessageId(null)}
      />
    </div>
  );
}
