/**
 * 화면 이동에만 쓰이는 상수 (DB ENUM 이 아니므로 enums.js 와 분리해둔다).
 */

/**
 * /dashboard 는 홈 + 대시보드가 스크롤 스냅으로 이어진 한 화면이다(HomeDashboardScreen).
 * 기본은 맨 위(홈)에서 시작하지만, 아래처럼 어느 섹션에서 시작할지 지정할 수 있다.
 *
 *   navigate("/dashboard", { state: { section: HOME_SECTION.DASHBOARD } })
 */
export const HOME_SECTION = {
  HOME: "home",
  DASHBOARD: "dashboard",
};
