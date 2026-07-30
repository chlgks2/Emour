import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastProvider";
import ErrorBoundary from "../components/common/ErrorBoundary";
import ProtectedRoute from "./ProtectedRoute";
import SignUpPage from "../pages/SignUpPage";
import LoginPage from "../pages/LoginPage";
import HomeDashboardScreen from "../pages/HomeDashboardScreen";
import ChatRoomPage from "../pages/ChatRoomPage";
import BookmarkListPage from "../pages/BookmarkListPage";
import ComingSoonPage from "../pages/ComingSoonPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <HomeDashboardScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatRoomPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookmarks"
                element={
                  <ProtectedRoute>
                    <BookmarkListPage />
                  </ProtectedRoute>
                }
              />
              {/* 캘린더/앨범/마이 페이지는 다음 단계에서 구현 예정.
                  조용히 리다이렉트하면 "탭이 안 눌리는" 것처럼 보이므로 준비 중 화면을 보여준다. */}
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <ComingSoonPage title="캘린더" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/album"
                element={
                  <ProtectedRoute>
                    <ComingSoonPage title="앨범" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my"
                element={
                  <ProtectedRoute>
                    <ComingSoonPage title="마이" />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
