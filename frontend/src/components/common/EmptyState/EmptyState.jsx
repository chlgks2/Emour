import styles from "./EmptyState.module.css";

/**
 * 빈 목록 / 실패 상태를 한 컴포넌트로 통일.
 * "아직 없어요"로 끝내지 않고 다음 행동(action)을 같이 제시한다.
 *
 * @param {React.ReactNode} [icon]
 * @param {string} title
 * @param {string} [description]
 * @param {string} [actionLabel]
 * @param {() => void} [onAction]
 * @param {"empty"|"error"} [tone]
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "empty",
}) {
  return (
    <div
      className={[styles.wrap, tone === "error" ? styles.error : ""].join(" ")}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className={styles.actionBtn} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
