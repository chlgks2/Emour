import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import { SESSION_EXPIRED_EVENT } from "../api/httpClient";
import { getMyProfile } from "../api/memberApi";
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

  // 저장소에 토큰 문자열이 있다는 사실만으로 로그인 완료로 판단하지 않는다.
  // 새로고침 때 서버가 토큰(필요하면 refresh token까지)을 검증하는 동안
  // 보호된 화면의 라우팅을 잠시 보류한다.
  const [initializing, setInitializing] = useState(() =>
    authApi.isAuthenticated()
  );

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

  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      return undefined;
    }

    let cancelled = false;

    const restoreSession = async () => {
      try {
        // apiRequest가 401을 받으면 refresh를 한 번 시도한다. refresh도 만료된
        // 경우 토큰을 모두 지우고 SESSION_EXPIRED_EVENT를 발생시킨다.
        const profile = await getMyProfile();

        if (!cancelled && profile) {
          const restoredUser = authApi.updateCurrentUserCache(profile);
          setUser(restoredUser);
        }
      } catch {
        // 인증 실패라면 httpClient가 이미 저장소와 AuthContext를 정리한다.
        // 일시적인 네트워크/서버 오류에는 정상 세션을 임의로 로그아웃시키지 않는다.
        if (!cancelled && !authApi.isAuthenticated()) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (payload) => {
    const loggedInUser = await authApi.login(payload);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  // provider: social_login.provider 값 (지금은 'GOOGLE' 하나 — constants/enums.js)
  const loginWithSocial = useCallback(async (provider, idToken) => {
    const loggedInUser = await authApi.loginWithSocial(provider, idToken);
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
