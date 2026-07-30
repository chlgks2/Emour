import { useId } from "react";
import { useModalA11y } from "../../hooks/useModalA11y";
import styles from "./ConfirmDialog.module.css";

/**
 * 범용 확인 다이얼로그 (예: "북마크를 해제할까요?")
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string} [description]
 * @param {string} [confirmLabel]
 * @param {string} [cancelLabel]
 * @param {boolean} [destructive] - true 면 확인 버튼을 위험(빨강) 스타일로
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalA11y(open, onCancel);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <p id={titleId} className={styles.title}>
            {title}
          </p>
        )}
        {description && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={[styles.confirmBtn, destructive ? styles.destructive : ""].join(" ")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
