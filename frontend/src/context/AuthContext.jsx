import { useCallback, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
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

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
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
