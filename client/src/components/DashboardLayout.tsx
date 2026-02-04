import { useState, useEffect, lazy, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard as Home,
  BookOpen,
  LogOut,
  X,
  Users,
  Upload,
  Calculator,
  HelpCircle,
  Briefcase,
  Shield,
  Moon,
  Sun,
} from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { StudySessionGoals } from './StudySessionGoals';
import { BottomNav } from './BottomNav';
import { WelcomeModal } from './WelcomeModal';
import api from '../lib/api';

import { FeatureSpotlightModal } from './FeatureSpotlightModal';
import { ConfirmationModal } from './ConfirmationModal';
import { FeedbackModal } from './FeedbackModal';

// Lazy-loaded heavy modals for better code splitting
const UploadModal = lazy(() =>
  import('./UploadModal').then((m) => ({ default: m.UploadModal })),
);
const UserProfile = lazy(() =>
  import('./UserProfile').then((m) => ({ default: m.UserProfile })),
);

// Loading spinner for lazy modals
const ModalLoadingFallback = () => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
    <div className='bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-3'>
      <BorderSpinner size='lg' className='text-primary-600' />
      <p className='text-sm text-gray-500 dark:text-gray-400'>Loading...</p>
    </div>
  </div>
);

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export function DashboardLayout() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGpSpotlight, setShowGpSpotlight] = useState(false);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
    }`;

  const confirmLogout = () => {
    logout();
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      setHistory(res.data);
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUploadComplete = () => {
    setUploadModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
    navigate('/department');
  };

  return (
    <div className='flex h-[100dvh] bg-gradient-to-b from-primary-100 via-primary-50/30 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden relative'>
      {/* Sidebar - Desktop */}
      <aside className='hidden md:flex md:flex-col w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 z-50 shadow-sm'>
        <div className='p-6 mb-6 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='flex items-center justify-center'>
              <img
                src='/logo-black.png'
                alt='PeerToLearn Logo'
                className='w-10 h-10 object-contain dark:hidden'
                fetchPriority='high'
                decoding='async'
              />
              <img
                src='/logo-blue.png'
                alt='PeerToLearn Logo'
                className='w-10 h-10 object-contain hidden dark:block'
                fetchPriority='high'
                decoding='async'
              />
            </div>
            <span className='text-xl font-bold text-gray-900 dark:text-white tracking-tight'>
              PeerToLearn
            </span>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto py-4 custom-scrollbar'>
          <nav className='px-4 space-y-6'>
            {/* Primary Section */}
            <div>
              <NavLink to='/dashboard' className={navLinkClass}>
                <Home className='w-5 h-5 flex-shrink-0' />
                <span>Home</span>
              </NavLink>
            </div>

            {/* Community Section */}
            <div>
              <div className='px-3 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest'>
                Community
              </div>
              <div className='space-y-1'>
                <NavLink to='/department' className={navLinkClass}>
                  <BookOpen className='w-5 h-5 flex-shrink-0' />
                  <span>Departmental Library</span>
                </NavLink>
                <NavLink to='/study-partner' className={navLinkClass}>
                  <Users className='w-5 h-5 flex-shrink-0' />
                  <span>Study Partner</span>
                </NavLink>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className='w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left font-medium border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary-500 hover:text-white hover:border-primary-500 transition-all duration-200'
                >
                  <Upload className='w-5 h-5 flex-shrink-0' />
                  <span>Upload Material</span>
                </button>
              </div>
            </div>

            {/* Tools Section */}
            <div>
              <div className='px-3 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest'>
                Tools
              </div>
              <div className='space-y-1'>
                <NavLink
                  to='/tools/gp-calculator'
                  className={navLinkClass}
                  onClick={() => {
                    const hasSeen = localStorage.getItem(
                      'has_seen_gp_calculator',
                    );
                    if (!hasSeen) {
                      localStorage.setItem('has_seen_gp_calculator', 'true');
                      setShowGpSpotlight(true);
                    }
                  }}
                >
                  <Calculator className='w-5 h-5 flex-shrink-0' />
                  <span>GP Calculator</span>
                </NavLink>
                <div className='px-1'>
                  <StudySessionGoals />
                </div>
              </div>
            </div>

            {/* Recent Chats Section */}
            {history.length > 0 && (
              <div>
                <div className='px-3 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest'>
                  Recent Chats
                </div>
                <div className='space-y-1'>
                  {history.slice(0, 5).map((chat) => (
                    <NavLink
                      key={chat.id}
                      to={`/chat/${chat.id}`}
                      className={({ isActive }) =>
                        `block px-3 py-2 rounded-xl text-sm truncate transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                        }`
                      }
                    >
                      {chat.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}

            {/* Support Section */}
            <div>
              <div className='px-3 pb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest'>
                Support
              </div>
              <div className='space-y-1'>
                <button
                  onClick={() => setFeedbackModalOpen(true)}
                  className='w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 text-left'
                >
                  <HelpCircle className='w-5 h-5 flex-shrink-0' />
                  <span>Feedback</span>
                </button>
                <button
                  onClick={() =>
                    window.open(
                      'mailto:abdulrahmanabdulsalam93@gmail.com?subject=Support Request',
                      '_blank',
                    )
                  }
                  className='w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 text-left'
                >
                  <Briefcase className='w-5 h-5 flex-shrink-0' />
                  <span>Support</span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        <div className='p-4 border-t border-gray-200/50 dark:border-gray-800/50'>
          <button
            onClick={() => setProfileOpen(true)}
            className='w-full flex items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-left group'
          >
            <div className='w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold group-hover:scale-105 transition-transform'>
              {user?.firstName?.[0]}
            </div>
            <div className='ml-3 overflow-hidden'>
              <div className='font-medium truncate text-gray-900 dark:text-gray-100'>
                {user?.firstName} {user?.lastName}
              </div>
              <div className='text-xs text-gray-500 truncate'>
                {user?.email}
              </div>
            </div>
          </button>

          {/* Admin Dashboard Link - Only visible for admin users */}
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className='w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors mb-2'
            >
              <Shield className='w-4 h-4 mr-2' />
              Admin Dashboard
            </button>
          )}

          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className='w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
          >
            <LogOut className='w-4 h-4 mr-2' />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className='fixed inset-0 z-[900] md:hidden'>
          <div
            className='absolute inset-0 bg-black/20 backdrop-blur-sm'
            onClick={() => setSidebarOpen(false)}
          />
          <aside className='absolute left-0 top-0 bottom-0 w-72 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl flex flex-col animate-slide-right border-r border-gray-200/50 dark:border-gray-800/50'>
            <div className='p-6 flex items-center justify-between'>
              <span className='text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600'>
                PeerToLearn
              </span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className='w-6 h-6 text-gray-500' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto py-4'>
              <nav className='px-4 space-y-2'>
                <NavLink
                  to='/dashboard'
                  className={navLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Home className='w-5 h-5 mr-3' />
                  Home
                </NavLink>
                <NavLink
                  to='/department'
                  className={navLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <BookOpen className='w-5 h-5 mr-3' />
                  Library
                </NavLink>
                <NavLink
                  to='/study-partner'
                  className={navLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Users className='w-5 h-5 mr-3' />
                  Study Partner
                </NavLink>

                <div className='py-2'>
                  <StudySessionGoals />
                </div>

                <button
                  onClick={() => {
                    setUploadModalOpen(true);
                    setSidebarOpen(false);
                  }}
                  className='w-full px-4 py-3 rounded-xl text-left font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center'
                >
                  <Upload className='w-5 h-5 mr-3' />
                  Upload
                </button>

                <div className='pt-4 border-t border-gray-100 dark:border-gray-800 mt-4'>
                  {/* Admin Dashboard Link - Only visible for admin users on mobile */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setSidebarOpen(false);
                      }}
                      className='w-full flex items-center px-4 py-3 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 mb-2'
                    >
                      <Shield className='w-5 h-5 mr-3' />
                      Admin Dashboard
                    </button>
                  )}

                  <a
                    href='mailto:abdulrahmanabdulsalam93@gmail.com'
                    className='flex items-center px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200'
                  >
                    <HelpCircle className='w-5 h-5 mr-3' />
                    Feedback & Support
                  </a>
                </div>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className='flex-1 flex flex-col overflow-hidden relative z-0 mb-16 md:mb-0'>
        {/* Mobile Header */}
        <div className='md:hidden h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-4 z-[100]'>
          <div className='flex items-center space-x-2'>
            <img
              src='/logo-black.png'
              alt='Logo'
              className='w-8 h-8 object-contain dark:hidden'
              fetchPriority='high'
              decoding='async'
            />
            <img
              src='/logo-blue.png'
              alt='Logo'
              className='w-8 h-8 object-contain hidden dark:block'
              fetchPriority='high'
              decoding='async'
            />
            <span className='font-bold text-lg text-gray-900 dark:text-gray-100 tracking-tight'>
              PeerToLearn
            </span>
          </div>
          <div className='flex items-center gap-2'>
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className='p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors'
              title='Toggle dark mode'
            >
              <Sun className='w-5 h-5 hidden dark:block' />
              <Moon className='w-5 h-5 dark:hidden' />
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className='p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20'
            >
              <Upload className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto relative animate-fade-in'>
          <Outlet
            context={{
              openUploadModal: () => setUploadModalOpen(true),
              refreshTrigger,
            }}
          />
        </div>
      </main>

      <BottomNav />

      {uploadModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <UploadModal
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            onUploadComplete={handleUploadComplete}
          />
        </Suspense>
      )}
      {profileOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <UserProfile
            onClose={() => setProfileOpen(false)}
            onFeedbackOpen={() => setFeedbackModalOpen(true)}
          />
        </Suspense>
      )}
      <WelcomeModal />
      <FeatureSpotlightModal
        isOpen={showGpSpotlight}
        onClose={() => {
          setShowGpSpotlight(false);
          navigate('/tools/gp-calculator');
        }}
        title='GP Calculator'
        description='Calculate your Grade Point Average easily. Set target GPAs and track your academic progress.'
        icon={Calculator}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
        title='Sign Out'
        message='Are you sure you want to sign out? You will need to log in again to access your account.'
        confirmText='Sign Out'
        isDangerous={true}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </div>
  );
}
