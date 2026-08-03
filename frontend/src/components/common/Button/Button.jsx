import styles from "./Button.module.css";

/**
 * 공용 버튼
 * @param {"primary"|"outline"|"text"|"chip"} variant
 * @param {"md"|"sm"} size
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = true,
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  className = "",
  style,
  ariaLabel,
}) {
  return (
    <button
      type={type}
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : "",
        className,
      ].join(" ")}
      style={style}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      {/* 로딩 중에도 버튼 폭이 튀지 않도록 기존 라벨을 자리만 남기고 숨긴다 */}
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className={styles.hiddenLabel}>{children}</span>
          <span className="sr-only">처리 중</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
