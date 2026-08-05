import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./ImageViewer.module.css";

const SWIPE_CLOSE_DISTANCE = 90; // px. 이만큼 끌어내리면 닫는다
const SWIPE_NEXT_DISTANCE = 60; // px. 좌우로 이만큼 끌면 넘긴다

/**
 * 사진 전체 화면 뷰어.
 *
 * 여러 앱이 공통으로 쓰는 동작만 담았다.
 *   · 배경은 어둡게, 사진 외의 것은 최소로
 *   · 아래로 끌어내려 닫기 (끄는 만큼 배경이 옅어져 닫히는 중임을 보여준다)
 *   · 좌우로 끌어 다음/이전 사진 (여러 장일 때만)
 *   · 배경을 눌러도 닫기, ESC 로도 닫기
 *   · 여러 장이면 상단에 'n / m'
 *
 * 핀치 확대는 넣지 않았다. 브라우저 기본 확대와 충돌해서 직접 구현하면
 * 오히려 어색해지고, 이 화면에서는 원본 크기로 보는 것으로 충분하다.
 *
 * @param {string[]} images
 * @param {number} startIndex
 * @param {() => void} onClose
 */
export default function ImageViewer({ images = [], startIndex = 0, onClose }) {
  const total = images.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0))
  );
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });

  const goTo = useCallback(
    (next) => {
      if (total === 0) return;
      setIndex((next + total) % total);
    },
    [total]
  );

  // 키보드로도 같은 동작을 할 수 있어야 한다.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, goTo, onClose]);

  if (total === 0) return null;

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ x: 0, y: 0, active: true, startX: event.clientX, startY: event.clientY });
  };

  const handlePointerMove = (event) => {
    if (!drag.active) return;
    setDrag((previous) => ({
      ...previous,
      x: event.clientX - previous.startX,
      y: event.clientY - previous.startY,
    }));
  };

  const handlePointerUp = () => {
    if (!drag.active) return;

    const { x, y } = drag;
    const isVertical = Math.abs(y) > Math.abs(x);

    if (isVertical && y > SWIPE_CLOSE_DISTANCE) {
      onClose();
      return;
    }

    if (!isVertical && Math.abs(x) > SWIPE_NEXT_DISTANCE) {
      goTo(x < 0 ? index + 1 : index - 1);
    }

    setDrag({ x: 0, y: 0, active: false });
  };

  // 끌어내린 만큼 배경을 옅게 해서 "놓으면 닫힌다"를 미리 보여준다.
  const dragProgress = Math.min(Math.max(drag.y, 0) / (SWIPE_CLOSE_DISTANCE * 2), 1);

  return (
    <div
      className={styles.backdrop}
      style={{ "--viewer-dim": 1 - dragProgress * 0.6 }}
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className={styles.bar}>
        {total > 1 && (
          <span className={styles.counter}>
            {index + 1} / {total}
          </span>
        )}

        <button
          type="button"
          className={styles.closeButton}
          aria-label="닫기"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </header>

      <div
        className={styles.stage}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          className={styles.image}
          src={images[index]}
          alt={`채팅 사진 ${index + 1}`}
          style={{
            transform: `translate(${drag.x}px, ${drag.y}px)`,
            transition: drag.active ? "none" : "transform var(--duration-base) var(--ease-out)",
          }}
          draggable="false"
        />
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navPrev}`}
            aria-label="이전 사진"
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${styles.navNext}`}
            aria-label="다음 사진"
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}
