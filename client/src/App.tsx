import { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BorderSpinner } from './components/Skeleton';
import { lazyWithRetry, lazyWithRetryNamed } from './lib/lazyWithRetry';

// Lazy-loaded components with retry support for chunk load failures after deploys
// Auth components - loaded on initial page or specific auth routes
const Login = lazyWithRetryNamed(() => import('./components/Login'), 'Login');
const Signup = lazyWithRetryNamed(
  () => import('./components/Signup'),
  'Signup',
);
const GoogleCallback = lazyWithRetryNamed(
  () => import('./components/GoogleCallback'),
  'GoogleCallback',
);
const VerifyEmail = lazyWithRetryNamed(
  () => import('./components/VerifyEmail'),
  'VerifyEmail',
);
const ForgotPassword = lazyWithRetryNamed(
  () => import('./components/ForgotPassword'),
  'ForgotPassword',
);
const ResetPassword = lazyWithRetryNamed(
  () => import('./components/ResetPassword'),
  'ResetPassword',
);
const CompleteProfile = lazyWithRetry(
  () => import('./components/CompleteProfile'),
);
const VerifyPending = lazyWithRetry(() => import('./components/VerifyPending'));

// Dashboard layout and main components
const DashboardLayout = lazyWithRetryNamed(
  () => import('./components/DashboardLayout'),
  'DashboardLayout',
);
const AcademicControlCenter = lazyWithRetryNamed(
  () => import('./components/AcademicControlCenter'),
  'AcademicControlCenter',
);
const DepartmentView = lazyWithRetry(
  () => import('./components/DepartmentView'),
);
const Chatbot = lazyWithRetryNamed(
  () => import('./components/Chatbot'),
  'Chatbot',
);
const CourseView = lazyWithRetryNamed(
  () => import('./components/CourseView'),
  'CourseView',
);
const MaterialView = lazyWithRetryNamed(
  () => import('./components/MaterialView'),
  'MaterialView',
);
const StudyPartner = lazyWithRetryNamed(
  () => import('./components/StudyPartner'),
  'StudyPartner',
);
const TargetGPCalculator = lazyWithRetryNamed(
  () => import('./components/TargetGPCalculator'),
  'TargetGPCalculator',
);
const QuizArena = lazyWithRetryNamed(
  () => import('./components/QuizArena'),
  'QuizArena',
);
const AdminDashboard = lazyWithRetry(
  () => import('./components/admin/AdminDashboard'),
);
const AdminRoute = lazyWithRetry(() => import('./components/AdminRoute'));
const NotFound = lazyWithRetry(() => import('./components/NotFound'));

// Public pages (no auth required)
const AboutPage = lazyWithRetryNamed(
  () => import('./components/AboutPage'),
  'AboutPage',
);
const HowToUsePage = lazyWithRetryNamed(
  () => import('./components/HowToUsePage'),
  'HowToUsePage',
);
const LandingPage = lazyWithRetry(
  () => import('./components/LandingPage'),
);

// Suspense fallback for route loading
const RouteLoadingFallback = () => (
  <div className='min-h-screen flex items-center justify-center'>
    <div className='flex flex-col items-center gap-3'>
      <BorderSpinner size='2xl' className='text-primary-600' />
      <p className='text-sm text-gray-500 dark:text-gray-400 animate-pulse'>
        Loading...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <BorderSpinner size='2xl' className='text-primary-600' />
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
  const needsVerification =
    !user?.isVerified && !user?.googleId && user?.verificationToken;

  if (needsVerification && location.pathname !== '/verify-pending') {
    return <Navigate to='/verify-pending' replace />;
  }

  // Check for academic profile completion
  // We allow access to /complete-profile even if incomplete (obviously)
  // But we block everything else if incomplete
  const isProfileComplete =
    user?.department && user?.faculty && user?.yearOfStudy;

  if (
    !isProfileComplete &&
    location.pathname !== '/complete-profile' &&
    location.pathname !== '/verify-pending'
  ) {
    return <Navigate to='/complete-profile' replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Prevent back button from going to auth pages when authenticated (PWA fix)
  useEffect(() => {
    const handlePopState = () => {
      // If user is authenticated and navigates to root, redirect to dashboard
      if (isAuthenticated && window.location.pathname === '/') {
        window.history.replaceState(null, '', '/dashboard');
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  // Immediately redirect if authenticated and at root (for PWA launch)
  useEffect(() => {
    if (!isLoading && isAuthenticated && location.pathname === '/') {
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [isAuthenticated, isLoading, location.pathname]);

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <BorderSpinner size='2xl' className='text-primary-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen text-gray-900 dark:text-gray-100'>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public marketing landing page */}
          <Route path='/' element={<LandingPage />} />

          {/* Public pages - no auth required */}
          <Route path='/about' element={<AboutPage />} />
          <Route path='/how-to-use' element={<HowToUsePage />} />

          <Route path='/auth/callback' element={<GoogleCallback />} />
          <Route path='/verify-email' element={<VerifyEmail />} />
          {/* Redirect for emails sent with /auth/verify-email path */}
          <Route path='/auth/verify-email' element={<Navigate to='/verify-email' replace />} />
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
            <Route
              path='/tools/gp-calculator'
              element={<TargetGPCalculator />}
            />
            <Route path='/arena/:challengeId' element={<QuizArena />} />
            <Route
              path='/admin'
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                </Suspense>
              }
            />
          </Route>

          {/* Auth routes */}
          <Route
            path='/login'
            element={
              isAuthenticated ? (
                <Navigate to='/dashboard' replace />
              ) : (
                <div className='min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:py-12 overflow-y-auto'>
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
                  <Login onSwitch={() => window.location.href = '/signup'} />
                </div>
              )
            }
          />
          <Route
            path='/signup'
            element={
              isAuthenticated ? (
                <Navigate to='/dashboard' replace />
              ) : (
                <div className='min-h-screen flex flex-col items-center justify-center px-4 py-6 sm:py-12 overflow-y-auto'>
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
                  <Signup onSwitch={() => window.location.href = '/login'} />
                </div>
              )
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
  // Lazy load InstallPrompt, OfflineIndicator, SyncIndicator, and UpdatePrompt
  const InstallPrompt = lazyWithRetry(
    () => import('./components/InstallPrompt'),
  );
  const OfflineIndicator = lazyWithRetry(
    () => import('./components/OfflineIndicator'),
  );
  const SyncIndicator = lazyWithRetry(
    () => import('./components/SyncIndicator'),
  );
  const UpdatePrompt = lazyWithRetryNamed(
    () => import('./components/UpdatePrompt'),
    'UpdatePrompt',
  );

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
              {/* PWA Update Prompt - shows when new version available */}
              <Suspense fallback={null}>
                <UpdatePrompt />
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
