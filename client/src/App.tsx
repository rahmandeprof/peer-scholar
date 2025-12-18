import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

// Lazy-loaded components for code splitting
// Auth components - loaded on initial page or specific auth routes
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./components/Signup').then(m => ({ default: m.Signup })));
const GoogleCallback = lazy(() => import('./components/GoogleCallback').then(m => ({ default: m.GoogleCallback })));
const VerifyEmail = lazy(() => import('./components/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then(m => ({ default: m.ResetPassword })));
const CompleteProfile = lazy(() => import('./components/CompleteProfile'));
const VerifyPending = lazy(() => import('./components/VerifyPending'));

// Dashboard layout and main components
const DashboardLayout = lazy(() => import('./components/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const AcademicControlCenter = lazy(() => import('./components/AcademicControlCenter').then(m => ({ default: m.AcademicControlCenter })));
const DepartmentView = lazy(() => import('./components/DepartmentView'));
const Chatbot = lazy(() => import('./components/Chatbot').then(m => ({ default: m.Chatbot })));
const CourseView = lazy(() => import('./components/CourseView').then(m => ({ default: m.CourseView })));
const MaterialView = lazy(() => import('./components/MaterialView').then(m => ({ default: m.MaterialView })));
const StudyPartner = lazy(() => import('./components/StudyPartner').then(m => ({ default: m.StudyPartner })));
const TargetGPCalculator = lazy(() => import('./components/TargetGPCalculator').then(m => ({ default: m.TargetGPCalculator })));
const QuizArena = lazy(() => import('./components/QuizArena').then(m => ({ default: m.QuizArena })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminRoute = lazy(() => import('./components/AdminRoute'));
const NotFound = lazy(() => import('./components/NotFound'));

// Suspense fallback for route loading
const RouteLoadingFallback = () => (
  <div className='min-h-screen flex items-center justify-center'>
    <div className='flex flex-col items-center gap-3'>
      <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
      <p className='text-sm text-gray-500 dark:text-gray-400 animate-pulse'>Loading...</p>
    </div>
  </div>
);

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

  // Check for email verification (only for manual signup users)
  // Skip verification check for:
  // 1. Users who are already verified
  // 2. Google sign-in users (they're auto-verified)
  // 3. Allow access to verify-pending page even if not verified
  const needsVerification = !user?.isVerified && !user?.googleId && user?.verificationToken;

  if (needsVerification && location.pathname !== '/verify-pending') {
    return <Navigate to='/verify-pending' replace />;
  }

  // Check for academic profile completion
  // We allow access to /complete-profile even if incomplete (obviously)
  // But we block everything else if incomplete
  const isProfileComplete =
    user?.department && user?.faculty && user?.yearOfStudy;

  if (!isProfileComplete && location.pathname !== '/complete-profile' && location.pathname !== '/verify-pending') {
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
      <Suspense fallback={<RouteLoadingFallback />}>
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

          <Route
            path='/verify-pending'
            element={
              <ProtectedRoute>
                <VerifyPending />
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
            <Route path='/admin' element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </Suspense>
            } />
          </Route>

          <Route
            path='/'
            element={
              <div className='min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:py-12 overflow-y-auto'>
                {/* Logo header for auth page */}
                {!isAuthenticated && (
                  <div className='mb-8 flex flex-col items-center'>
                    <img
                      src='/wordmark-black.png'
                      alt='PeerToLearn'
                      className='h-16 md:h-20 object-contain dark:hidden'
                    />
                    <img
                      src='/wordmark-blue.png'
                      alt='PeerToLearn'
                      className='h-16 md:h-20 object-contain hidden dark:block'
                    />
                  </div>
                )}
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

          {/* 404 Not Found */}
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  // Lazy load InstallPrompt, OfflineIndicator, and SyncIndicator
  const InstallPrompt = lazy(() => import('./components/InstallPrompt'));
  const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));
  const SyncIndicator = lazy(() => import('./components/SyncIndicator'));

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <NetworkProvider>
              {/* Offline Status Banner */}
              <Suspense fallback={null}>
                <OfflineIndicator />
              </Suspense>
              <AppContent />
              {/* PWA Install Prompt */}
              <Suspense fallback={null}>
                <InstallPrompt />
              </Suspense>
              {/* Sync Status Indicator */}
              <Suspense fallback={null}>
                <SyncIndicator />
              </Suspense>
            </NetworkProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
