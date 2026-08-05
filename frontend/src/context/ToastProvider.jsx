import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "../hooks/useToast";
import styles from "./ToastProvider.module.css";

const DEFAULT_DURATION = 2200;

/**
 * 화면 하단에 잠깐 떴다 사라지는 알림(토스트).
 * alert() 처럼 흐름을 끊지 않고 "방금 뭐가 됐는지"만 알려주는 용도.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, { tone = "info", duration = DEFAULT_DURATION } = {}) => {
      idRef.current += 1;
      const id = idRef.current;
      // 화면을 덮지 않도록 최근 2개만 유지
      setToasts((prev) => [...prev.slice(-1), { id, message, tone }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), duration)
      );
      return id;
    },
    [dismiss]
  );

  // 언마운트 시 남은 타이머 정리
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live 영역: 스크린 리더도 토스트 내용을 읽어준다 */}
      <div className={styles.viewport} role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={[styles.toast, styles[toast.tone]].join(" ")}
            onClick={() => dismiss(toast.id)}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
