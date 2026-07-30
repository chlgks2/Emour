import { createContext, useContext } from "react";

/**
 * 인증 컨텍스트의 "값" 부분과 조회 훅.
 * Provider 컴포넌트(context/AuthContext.jsx)와 파일을 분리해 둔 이유:
 *  1) 컴포넌트와 훅/상수를 같은 파일에서 export 하면 Vite Fast Refresh 가 깨진다.
 *     (eslint react-refresh/only-export-components)
 *  2) 파일명이 AuthContext.jsx 와 대소문자만 다르면 Windows(대소문자 구분 없는 FS)에서
 *     같은 파일로 해석돼 import 가 깨지므로, 이름을 확실히 다르게 둔다.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있어요.");
  return ctx;
}
