import styles from "./FullScreenLoader.module.css";

// 라우트 진입 등 화면 전체를 대기시켜야 할 때 쓰는 로더
export default function FullScreenLoader({ label = "불러오는 중" }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.pulse} aria-hidden="true">
        ♥
      </span>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
