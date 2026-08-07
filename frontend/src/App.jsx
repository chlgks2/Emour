import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import AppViewport from './layouts/AppViewport/AppViewport.jsx'
import BottomNavigation from './components/common/BottomNavigation/BottomNavigation.jsx'
import MoodNotificationPrompt from './components/mood/MoodNotificationPrompt/MoodNotificationPrompt.jsx'
import CoupleRouteGuard from './components/routing/CoupleRouteGuard.jsx'
import AuthRouteGuard from './components/routing/AuthRouteGuard.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastProvider.jsx'
import { ChatUnreadProvider } from './context/ChatUnreadProvider.jsx'
import { useAuth } from './hooks/useAuth.js'

import AlbumPage from './pages/AlbumPage/AlbumPage.jsx'
import BookmarkListPage from './pages/BookmarkListPage/BookmarkListPage.jsx'
import CalendarPage from './pages/CalendarPage/CalendarPage.jsx'
import ChatRoomPage from './pages/ChatRoomPage/ChatRoomPage.jsx'
import CoupleConnectPage from './pages/CoupleConnectPage/CoupleConnectPage.jsx'
import HomeDashboardScreen from './pages/HomeDashboardScreen/HomeDashboardScreen.jsx'
import LoginPage from './pages/LoginPage/LoginPage.jsx'
import MyPagePage from './pages/MyPagePage/MyPagePage.jsx'
import SignUpPage from './pages/SignUpPage/SignUpPage.jsx'
import ProfileEditPage from './pages/ProfileEditPage/ProfileEditPage.jsx'
import NotificationSettingPage from './pages/NotificationSettingPage/NotificationSettingPage.jsx'
import PasswordChangePage from './pages/PasswordChangePage/PasswordChangePage.jsx'
import PasswordResetPage from './pages/PasswordResetPage/PasswordResetPage.jsx'

import './App.css'

function PageWithNavigation({ children }) {
  return (
    <div className="page-with-navigation">
      <div className="page-with-navigation-content">
        {children}
      </div>

      <BottomNavigation />
    </div>
  )
}

/*
 * 로그인 전에는 아예 존재하지 않는 화면들.
 * 이 경로에 있는 동안에는 로그인해서 쓰는 기능이 돌면 안 된다.
 */
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/couple/connect',
]

function AuthenticatedMoodNotification() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user?.userId) {
    return null
  }

  /*
   * 경로까지 본다.
   *
   * isAuthenticated 는 localStorage 에 accessToken 문자열이 있는지만 본다.
   * 그 토큰이 이미 만료됐어도 참이라, 서버에 튕겨 로그인 화면에 와 있는데도
   * 이 컴포넌트가 살아 있었다. 30초마다 조회를 돌리고 브라우저 알림까지
   * 띄우니, 로그인도 안 한 채로 "기분을 기록해주세요" 알림을 받게 된다.
   *
   * (토큰이 죽으면 로그아웃 상태가 되도록 httpClient/AuthContext 도 함께 고쳤지만,
   *  그건 서버에 한 번 다녀와야 알 수 있는 사실이다. 그 사이를 이 검사가 막는다)
   */
  if (PUBLIC_PATHS.includes(location.pathname)) {
    return null
  }

  return (
    <MoodNotificationPrompt
      key={user.userId}
    />
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ChatUnreadProvider>
          <AppViewport>
          <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={<SignUpPage />}
        />

        <Route
          path="/find-password"
          element={<PasswordResetPage />}
        />

        <Route
          path="/dashboard"
          element={
            <CoupleRouteGuard>
              <PageWithNavigation>
                <HomeDashboardScreen />
              </PageWithNavigation>
            </CoupleRouteGuard>
          }
        />

        <Route
          path="/chat"
          element={
            <CoupleRouteGuard>
              <PageWithNavigation>
                <ChatRoomPage />
              </PageWithNavigation>
            </CoupleRouteGuard>
          }
        />

        <Route
          path="/bookmarks"
          element={
            <CoupleRouteGuard>
              <PageWithNavigation>
                <BookmarkListPage />
              </PageWithNavigation>
            </CoupleRouteGuard>
          }
        />

        <Route
          path="/calendar"
          element={
            <CoupleRouteGuard>
              <CalendarPage />
            </CoupleRouteGuard>
          }
        />

        <Route
          path="/couple/connect"
          element={
            <AuthRouteGuard>
              <CoupleConnectPage />
            </AuthRouteGuard>
          }
        />

        <Route
          path="/album"
          element={
            <CoupleRouteGuard>
              <AlbumPage />
            </CoupleRouteGuard>
          }
        />

        <Route
          path="/mypage"
          element={
            <AuthRouteGuard>
              <MyPagePage />
            </AuthRouteGuard>
          }
        />

        <Route
          path="/my"
          element={
            <Navigate
              to="/mypage"
              replace
            />
          }
        />

        <Route
          path="/mypage/profile-edit"
          element={
            <AuthRouteGuard>
              <ProfileEditPage />
            </AuthRouteGuard>
          }
        />
        <Route
          path="/mypage/notification-settings"
          element={
            <AuthRouteGuard>
              <NotificationSettingPage />
            </AuthRouteGuard>
          }
        />
        <Route
          path="/mypage/password-change"
          element={
            <AuthRouteGuard>
              <PasswordChangePage />
            </AuthRouteGuard>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/calendar"
              replace
            />
          }
        />
          </Routes>
          <AuthenticatedMoodNotification />
          </AppViewport>
        </ChatUnreadProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
