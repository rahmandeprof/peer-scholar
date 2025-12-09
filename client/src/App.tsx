import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { AcademicControlCenter } from './components/AcademicControlCenter';
import DepartmentView from './components/DepartmentView';
import { Chatbot } from './components/Chatbot';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { GoogleCallback } from './components/GoogleCallback';
import { CourseView } from './components/CourseView';
import { MaterialView } from './components/MaterialView';
import { StudyPartner } from './components/StudyPartner';
import { TargetGPCalculator } from './components/TargetGPCalculator';
import CompleteProfile from './components/CompleteProfile';
import { QuizArena } from './components/QuizArena';
import { VerifyEmail } from './components/VerifyEmail';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
      </div>
    );
  }

  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to='/' state={{ from: location }} replace />;
  }

  // Check for academic profile completion
  // We allow access to /complete-profile even if incomplete (obviously)
  // But we block everything else if incomplete
  const isProfileComplete =
    user?.department && user?.faculty && user?.yearOfStudy;

  if (!isProfileComplete && location.pathname !== '/complete-profile') {
    return <Navigate to='/complete-profile' replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen text-gray-900 dark:text-gray-100'>
      <Routes>
        <Route path='/auth/callback' element={<GoogleCallback />} />
        <Route path='/verify-email' element={<VerifyEmail />} />
        <Route
          path='/forgot-password'
          element={
            <div className='min-h-screen flex items-center justify-center px-4 py-12'>
              <ForgotPassword />
            </div>
          }
        />
        <Route
          path='/reset-password'
          element={
            <div className='min-h-screen flex items-center justify-center px-4 py-12'>
              <ResetPassword />
            </div>
          }
        />

        <Route
          path='/complete-profile'
          element={
            <ProtectedRoute>
              <CompleteProfile />
            </ProtectedRoute>
          }
        />

        {/* Protected Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path='/dashboard' element={<AcademicControlCenter />} />
          <Route path='/department' element={<DepartmentView />} />
          <Route path='/study-partner' element={<StudyPartner />} />
          <Route
            path='/partner'
            element={<Navigate to='/study-partner' replace />}
          />
          <Route path='/chat' element={<Chatbot />} />
          <Route path='/chat/:id' element={<Chatbot />} />
          <Route path='/courses/:courseId' element={<CourseView />} />
          <Route path='/materials/:id' element={<MaterialView />} />
          <Route path='/tools/gp-calculator' element={<TargetGPCalculator />} />
          <Route path='/arena/:challengeId' element={<QuizArena />} />
        </Route>

        <Route
          path='/'
          element={
            <div className='min-h-screen flex items-center justify-center px-4 py-12'>
              {isAuthenticated ? (
                <Navigate
                  to={location.state?.from?.pathname || '/dashboard'}
                  replace
                />
              ) : isLogin ? (
                <Login onSwitch={() => setIsLogin(false)} />
              ) : (
                <Signup onSwitch={() => setIsLogin(true)} />
              )}
            </div>
          }
        />

        {/* Catch all redirect */}
        <Route path='*' element={<Navigate to='/' replace />} />
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
            <NetworkProvider>
              <AppContent />
            </NetworkProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
