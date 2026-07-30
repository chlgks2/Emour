import { createContext, useContext } from "react";

// Provider 컴포넌트(context/ToastProvider.jsx)와 분리 — Fast Refresh 유지 목적
export const ToastContext = createContext(null);

/**
 * @returns {{
 *   showToast: (message: string, options?: { tone?: "info"|"success"|"error", duration?: number }) => number,
 *   dismiss: (id: number) => void
 * }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 내부에서만 사용할 수 있어요.");
  return ctx;
}
