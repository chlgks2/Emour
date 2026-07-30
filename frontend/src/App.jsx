import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import MobileLayout from './layouts/MobileLayout/MobileLayout.jsx'
import BottomNavigation from './components/common/BottomNavigation/BottomNavigation.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastProvider.jsx'

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

import './App.css'

function PageWithNavigation({
  children,
  variant = '',
}) {
  const className = [
    'page-with-navigation',
    variant
      ? `page-with-navigation-${variant}`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className="page-with-navigation-content">
        {children}
      </div>

      <BottomNavigation />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MobileLayout>
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
            <PageWithNavigation variant="home">
              <HomeDashboardScreen />
            </PageWithNavigation>
          }
        />

        <Route
          path="/chat"
          element={
            <PageWithNavigation>
              <ChatRoomPage />
            </PageWithNavigation>
          }
        />

        <Route
          path="/bookmarks"
          element={
            <PageWithNavigation>
              <BookmarkListPage />
            </PageWithNavigation>
          }
        />

        <Route
          path="/calendar"
          element={<CalendarPage />}
        />

        <Route
          path="/couple/connect"
          element={<CoupleConnectPage />}
        />

        <Route
          path="/album"
          element={<AlbumPage />}
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
          path="*"
          element={
            <Navigate
              to="/calendar"
              replace
            />
          }
        />
          </Routes>
        </MobileLayout>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
