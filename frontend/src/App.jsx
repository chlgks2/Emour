import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import MobileLayout from './layouts/MobileLayout/MobileLayout.jsx'

import AlbumPage from './pages/AlbumPage/AlbumPage.jsx'
import CalendarPage from './pages/CalendarPage/CalendarPage.jsx'
import MyPagePage from './pages/MyPagePage/MyPagePage.jsx'
import ProfileEditPage from './pages/ProfileEditPage/ProfileEditPage.jsx'
import NotificationSettingPage from './pages/NotificationSettingPage/NotificationSettingPage.jsx'
function App() {
  return (
    <MobileLayout>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/calendar"
              replace
            />
          }
        />

        <Route
          path="/calendar"
          element={<CalendarPage />}
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
  )
}

export default App