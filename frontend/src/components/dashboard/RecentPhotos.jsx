import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import styles from "./RecentPhotos.module.css";

const MAX_PHOTOS = 5;
const AUTO_PLAY_INTERVAL = 3500; // ms
const RESUME_DELAY = 4000; // 사용자가 조작한 뒤 자동재생 재개까지 대기 시간
const SWIPE_THRESHOLD = 40; // px

/**
 * @param {Array<{photoId:number, imageUrl:string, memo:string|null, createdAt:string}>} photos
 *   album_photo 기준
 */
export default function RecentPhotos({ photos = [] }) {
  const slides = photos.slice(0, MAX_PHOTOS);
  const total = slides.length;

  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const viewportRef = useRef(null);
  const dragStartX = useRef(0);
  const autoPlayTimer = useRef(null);
  const resumeTimer = useRef(null);

  // 뷰포트 너비 측정 (렌더 중에 ref.current를 직접 읽지 않도록 effect + state로 분리)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    setViewportWidth(el.offsetWidth);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setViewportWidth(entry.contentRect.width);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const goTo = useCallback(
    (nextIndex) => {
      if (total === 0) return;
      const wrapped = (nextIndex + total) % total;
      setIndex(wrapped);
    },
    [total]
  );

  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    if (total <= 1) return;
    autoPlayTimer.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, AUTO_PLAY_INTERVAL);
  }, [stopAutoPlay, total]);

  // 자동 재생 시작 & 언마운트 시 정리
  useEffect(() => {
    startAutoPlay();
    return () => {
      stopAutoPlay();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [startAutoPlay, stopAutoPlay]);

  // 사용자가 직접 조작했을 때: 잠시 멈췄다가 자동 재생 재개
  const pauseThenResume = useCallback(() => {
    stopAutoPlay();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      startAutoPlay();
    }, RESUME_DELAY);
  }, [startAutoPlay, stopAutoPlay]);

  const handleDotClick = (i) => {
    goTo(i);
    pauseThenResume();
  };

  // Pointer Events 하나로 마우스/터치/펜을 모두 처리한다.
  // (기존에는 onTouchStart 계열까지 같이 걸려 있어서 터치 기기에서 한 번의 스와이프가 두 번 처리됐다)
  const handlePointerDown = (e) => {
    if (total <= 1) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stopAutoPlay();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - dragStartX.current);
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset <= -SWIPE_THRESHOLD) {
      goTo(index + 1);
    } else if (dragOffset >= SWIPE_THRESHOLD) {
      goTo(index - 1);
    }
    setDragOffset(0);
    pauseThenResume();
  };

  // 사진이 없을 때 카드를 통째로 감추면 "왜 없는지" 알 수 없으므로 안내 문구를 보여준다.
  if (total === 0) {
    return (
      <section className={styles.card} aria-labelledby="recent-photos-title">
        <p id="recent-photos-title" className={styles.title}>
          <Camera size={14} aria-hidden="true" />
          최근에 찍은 사진
        </p>
        <p className={styles.emptyText}>아직 함께 올린 사진이 없어요.</p>
      </section>
    );
  }

  const trackWidthPercent = total * 100;
  const slideWidthPercent = 100 / total;
  const baseTranslate = -index * slideWidthPercent;
  const dragTranslatePercent = viewportWidth
    ? (dragOffset / viewportWidth) * slideWidthPercent
    : 0;
  const translate = baseTranslate + dragTranslatePercent;

  return (
    <section className={styles.card} aria-labelledby="recent-photos-title" aria-roledescription="캐러셀">
      <p id="recent-photos-title" className={styles.title}>
        <Camera size={14} aria-hidden="true" />
        최근에 찍은 사진
      </p>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className={styles.track}
          style={{
            width: `${trackWidthPercent}%`,
            transform: `translateX(${translate}%)`,
            transition: isDragging
              ? "none"
              : "transform var(--duration-slow) var(--ease-out)",
          }}
        >
          {slides.map((photo, i) => (
            <div
              key={photo.photoId}
              className={styles.slide}
              style={{ width: `${slideWidthPercent}%` }}
              role="group"
              aria-roledescription="슬라이드"
              aria-label={`${i + 1} / ${total}`}
              aria-hidden={i !== index}
            >
              <img
                src={photo.imageUrl}
                alt={photo.memo || "추억 사진"}
                className={styles.photo}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <div className={styles.dots}>
          {slides.map((photo, i) => (
            <button
              key={photo.photoId}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              aria-label={`${i + 1}번째 사진으로 이동`}
              aria-current={i === index}
              onClick={() => handleDotClick(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}