import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { StudySessionGoals } from './StudySessionGoals';
import { UploadModal } from './UploadModal';
import { BottomNav } from './BottomNav';
import { UserProfile } from './UserProfile';
import { WelcomeModal } from './WelcomeModal';
import api from '../lib/api';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { FeatureSpotlightModal } from './FeatureSpotlightModal';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export function DashboardLayout() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showGpSpotlight, setShowGpSpotlight] = useState(false);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toolsRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(toolsRef, () => setToolsOpen(false));

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
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
    <div className='flex h-[100dvh] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden relative'>
      {/* Sidebar - Desktop */}
      <aside className='hidden md:flex md:flex-col w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 z-50 shadow-sm'>
        <div className='p-6 mb-6 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='flex items-center justify-center'>
              <img
                src='/logo.jpg'
                alt='PeerToLearn Logo'
                className='w-10 h-10 object-contain'
              />
            </div>
            <span className='text-xl font-bold text-gray-900 dark:text-white tracking-tight'>
              PeerToLearn
            </span>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto py-4 custom-scrollbar'>
          <nav className='px-3'>
            {/* Home Section */}
            <div className='mb-2'>
              <NavLink to='/dashboard' className={navLinkClass}>
                <Home className='w-5 h-5 mr-3' />
                Home
              </NavLink>
            </div>

            {/* Community Section */}
            <div className='mb-6'>
              <div className='px-4 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Community
              </div>
              <div className='space-y-1'>
                <NavLink to='/department' className={navLinkClass}>
                  <BookOpen className='w-5 h-5 mr-3' />
                  Department Library
                </NavLink>
                <NavLink to='/study-partner' className={navLinkClass}>
                  <Users className='w-5 h-5 mr-3' />
                  Study Partner
                </NavLink>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className='w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-left font-medium bg-primary-500 text-white hover:bg-primary-600 transition-all duration-200 shadow-lg shadow-primary-500/20'
                >
                  <Upload className='w-5 h-5 mr-3 text-white' />
                  Upload Material
                </button>
              </div>
            </div>

            {/* Tools Section */}
            <div>
              <div className='px-4 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Tools
              </div>
              <div className='space-y-1 relative'>
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                    toolsOpen
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <Briefcase className='w-5 h-5 mr-3' />
                  <span>Tools</span>
                </button>

                {toolsOpen && (
                  <>
                    <div
                      className='fixed inset-0 z-[60]'
                      onClick={() => setToolsOpen(false)}
                    />
                    <div
                      ref={toolsRef}
                      className='fixed left-72 ml-4 top-1/2 -translate-y-1/2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-[70] animate-in fade-in zoom-in-95 duration-100 grid grid-cols-2 gap-3'
                    >
                      <NavLink
                        to='/tools/gp-calculator'
                        className='flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-center group'
                        onClick={(e) => {
                          const hasSeen = localStorage.getItem(
                            'has_seen_gp_calculator',
                          );
                          if (!hasSeen) {
                            e.preventDefault();
                            setShowGpSpotlight(true);
                            localStorage.setItem(
                              'has_seen_gp_calculator',
                              'true',
                            );
                            setToolsOpen(false);
                          } else {
                            setToolsOpen(false);
                          }
                        }}
                      >
                        <div className='w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform'>
                          <Calculator className='w-5 h-5' />
                        </div>
                        <span className='text-xs font-medium'>
                          GP Calculator
                        </span>
                      </NavLink>

                      <div className='col-span-2'>
                        <StudySessionGoals />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </nav>

          {history.length > 0 && (
            <div className='mt-6 px-3'>
              <div className='px-4 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Recent Chats
              </div>
              <div className='space-y-1'>
                {history.slice(0, 5).map((chat) => (
                  <NavLink
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {chat.title}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          <div className='mt-auto px-3 pb-4'>
            <div className='px-3 mb-1.5 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
              Support
            </div>
            <button
              onClick={() =>
                window.open(
                  'mailto:abdulrahmanabdulsalam93@gmail.com',
                  '_blank',
                )
              }
              className='w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 text-left'
            >
              <HelpCircle className='w-5 h-5 mr-3' />
              Feedback & Support
            </button>
          </div>
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
          <button
            onClick={handleLogout}
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
                peerStudent
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
              src='/logo.jpg'
              alt='Logo'
              className='w-8 h-8 object-contain'
            />
            <span className='font-bold text-lg text-gray-900 dark:text-gray-100 tracking-tight'>
              PeerToLearn
            </span>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className='p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20'
          >
            <Upload className='w-5 h-5' />
          </button>
        </div>

        {/* Content Area */}
        <div className='flex-1 overflow-hidden relative animate-fade-in'>
          <Outlet
            context={{
              openUploadModal: () => setUploadModalOpen(true),
              refreshTrigger,
            }}
          />
        </div>
      </main>

      <BottomNav />

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
      {profileOpen && <UserProfile onClose={() => setProfileOpen(false)} />}
      {profileOpen && <UserProfile onClose={() => setProfileOpen(false)} />}
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
    </div>
  );
}
