import { useCallback, useRef } from "react";

/**
 * 길게 누르기(long press) 감지 훅
 * 채팅 메시지 위에서 꾹 눌렀을 때 액션시트(이모지/북마크)를 띄우는 용도로 사용
 *
 * @param {() => void} onLongPress - 롱프레스 발생 시 실행할 콜백
 * @param {{ delay?: number, moveThreshold?: number }} options
 *   delay: 몇 ms 눌러야 롱프레스로 인정할지 (기본 450ms)
 *   moveThreshold: 누른 채로 이 픽셀 이상 움직이면 취소 (스크롤과 구분하기 위함)
 */
export function useLongPress(onLongPress, { delay = 450, moveThreshold = 10 } = {}) {
  const timerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(
    (x, y) => {
      startPosRef.current = { x, y };
      clearTimer();
      timerRef.current = setTimeout(() => {
        onLongPress();
        timerRef.current = null;
      }, delay);
    },
    [clearTimer, delay, onLongPress]
  );

  const move = useCallback(
    (x, y) => {
      if (!timerRef.current) return;
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) clearTimer();
    },
    [clearTimer, moveThreshold]
  );

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      if (t) start(t.clientX, t.clientY);
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    },
    onTouchEnd: clearTimer,
    onTouchCancel: clearTimer,
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onMouseUp: clearTimer,
    onMouseLeave: clearTimer,
    // 모바일 브라우저 기본 롱프레스 메뉴(복사/공유 등) 방지
    onContextMenu: (e) => e.preventDefault(),
  };
}
