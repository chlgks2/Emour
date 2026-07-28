import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import MobileLayout from './layouts/MobileLayout/MobileLayout'
import AlbumPage from './pages/AlbumPage/AlbumPage'
import CalendarPage from './pages/CalendarPage/CalendarPage'

function App() {
  return (
    <MobileLayout>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/calendar" replace />}
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
          path="*"
          element={<Navigate to="/calendar" replace />}
        />
      </Routes>
    </MobileLayout>
  )
}

export default App