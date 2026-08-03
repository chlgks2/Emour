import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AppViewport from './layouts/AppViewport/AppViewport.jsx'
import BottomNavigation from './components/common/BottomNavigation/BottomNavigation.jsx'
import MoodNotificationPrompt from './components/mood/MoodNotificationPrompt.jsx'
import CoupleRouteGuard from './components/routing/CoupleRouteGuard.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastProvider.jsx'
import { useAuth } from './hooks/useAuth.js'

import AlbumPage from './pages/AlbumPage/AlbumPage.jsx'
import BookmarkListPage from './pages/BookmarkListPage.jsx'
import CalendarPage from './pages/CalendarPage/CalendarPage.jsx'
import ChatRoomPage from './pages/ChatRoomPage.jsx'
import CoupleConnectPage from './pages/CoupleConnectPage/CoupleConnectPage.jsx'
import HomeDashboardScreen from './pages/HomeDashboardScreen.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyPagePage from './pages/MyPagePage/MyPagePage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import ProfileEditPage from './pages/ProfileEditPage/ProfileEditPage.jsx'
import NotificationSettingPage from './pages/NotificationSettingPage/NotificationSettingPage.jsx'
import PasswordChangePage from './pages/PasswordChangePage/PasswordChangePage.jsx'

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

function AuthenticatedMoodNotification() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user?.userId) {
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
          element={<CoupleConnectPage />}
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
          element={<MyPagePage />}
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
          element={<ProfileEditPage />}
        />
        <Route
          path="/mypage/notification-settings"
          element={<NotificationSettingPage />}
        />
        <Route
          path="/mypage/password-change"
          element={<PasswordChangePage />}
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
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
