import { useCallback, useEffect, useRef } from "react";

/**
 * 스크롤 컨테이너 맨 위에 있는 sentinel(감시용 엘리먼트)이 화면에 보이면
 * onLoadMore를 호출하는 훅. 채팅방처럼 "위로 스크롤하면 과거 메시지를 불러오는"
 * 패턴에 사용한다.
 *
 * @param {Function} onLoadMore - 더 불러올 데이터가 있을 때 호출할 콜백 (Promise 반환 가능)
 * @param {boolean} hasMore - 더 불러올 데이터가 있는지 여부
 * @param {boolean} loading - 현재 로딩 중인지 여부 (중복 호출 방지)
 * @returns {{ containerRef, sentinelRef }}
 */
export function useInfiniteScroll({ onLoadMore, hasMore, loading }) {
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading) {
          // 새 메시지가 위에 붙은 뒤 스크롤 위치를 유지하기 위해 현재 높이를 기억해둔다.
          prevScrollHeightRef.current = container.scrollHeight;
          onLoadMore();
        }
      },
      { root: container, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  // 데이터(loading=false로 전환된 직후) 로드가 끝나면 스크롤 위치를 보정해서
  // 화면이 위로 튀지 않고 방금 보고 있던 메시지 위치를 유지하도록 한다.
  const restoreScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const newScrollHeight = container.scrollHeight;
    const diff = newScrollHeight - prevScrollHeightRef.current;
    if (diff > 0) {
      container.scrollTop += diff;
    }
  }, []);

  return { containerRef, sentinelRef, restoreScrollPosition };
}
