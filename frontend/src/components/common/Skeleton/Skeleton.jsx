import styles from "./Skeleton.module.css";

/**
 * 로딩 중 자리 표시용 블록.
 * 스피너보다 "무엇이 들어올지" 미리 보여줘서 체감 대기시간이 짧아진다.
 *
 * @param {string} [width] - CSS 값 (기본 100%)
 * @param {string} [height] - CSS 값 (기본 14px)
 * @param {string} [radius] - CSS 값 (기본 var(--radius-sm))
 * @param {boolean} [circle]
 */
export default function Skeleton({ width, height, radius, circle = false, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].join(" ")}
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : radius,
      }}
    />
  );
}
