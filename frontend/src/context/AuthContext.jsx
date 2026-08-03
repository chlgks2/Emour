import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import { SESSION_EXPIRED_EVENT } from "../api/httpClient";
import { AuthContext } from "../hooks/useAuth";

export function AuthProvider({ children }) {
  // user: { userId, email, nickname, profileImageUrl, statusMessage, roomId, partnerNickname }
  // (user 테이블 + couple_member 조합. 컬럼명 camelCase 를 그대로 사용)
  //
  // 세션 복원은 localStorage 를 동기로 읽으므로 useEffect 대신 초기값 계산으로 처리한다.
  // (effect 안에서 setState 하면 첫 렌더가 낭비되고 로그인 화면이 한 번 깜빡인다)
  const [user, setUser] = useState(() =>
    authApi.isAuthenticated() ? authApi.getCurrentUser() : null
  );

  // 지금은 동기 복원이라 항상 false. 나중에 서버에 토큰 검증(GET /auth/me)을 붙이면
  // 그 응답을 기다리는 동안 true 로 두면 된다. (ProtectedRoute 가 이 값으로 로딩 화면을 띄운다)
  const [initializing] = useState(false);

  /*
   * 토큰이 죽으면(갱신 실패) 여기서도 로그아웃 상태가 되어야 한다.
   *
   * 세션 복원을 첫 렌더에 한 번만 하기 때문에, httpClient 가 저장소를 비워도
   * 이 상태는 그대로 남아 앱이 계속 "로그인됨" 으로 동작했다.
   * 그 사이 로그인 전용 기능들이 계속 돌아서, 로그인 화면에 있는데도
   * 무드 기록 알림이 뜨는 일이 생겼다.
   */
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const login = useCallback(async (payload) => {
    const loggedInUser = await authApi.login(payload);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  // provider: social_login.provider 값 ('KAKAO' | 'NAVER' | 'GOOGLE')
  const loginWithSocial = useCallback(async (provider) => {
    const loggedInUser = await authApi.loginWithSocial(provider);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // 서버 로그아웃 요청이 실패하더라도 로컬 인증 상태는 반드시 종료한다.
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      login,
      loginWithSocial,
      logout,
    }),
    [user, initializing, login, loginWithSocial, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
