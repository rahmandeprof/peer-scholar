import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { GoogleCallback } from './components/GoogleCallback';
import Onboarding from './components/Onboarding';
import { CourseView } from './components/CourseView';
import { MaterialView } from './components/MaterialView';
import { StudyPartner } from './components/StudyPartner';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Routes>
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute>
              <CourseView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materials/:id"
          element={
            <ProtectedRoute>
              <MaterialView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partner"
          element={
            <ProtectedRoute>
              <div className="h-screen bg-gray-50 dark:bg-gray-950">
                <StudyPartner />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <div className="min-h-screen flex items-center justify-center px-4 py-12">
              {isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : isLogin ? (
                <Login onSwitch={() => setIsLogin(false)} />
              ) : (
                <Signup onSwitch={() => setIsLogin(true)} />
              )}
            </div>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
