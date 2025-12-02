import { useState, useEffect } from 'react';
import { Chatbot } from './Chatbot';
import { useAuth } from '../contexts/AuthContext';
import { StudyTimer } from './StudyTimer';
import { UploadModal } from './UploadModal';
import { StudyPartner } from './StudyPartner';
import { UserProfile } from './UserProfile';
import DepartmentView from './DepartmentView';
import {
  Flame,
  Upload,
  Clock,
  Moon,
  Sun,
  Menu,
  X,
  BookOpen,
  MessageSquare,
  History,
  Trash2,
  Edit2,
  Check,
  Users,
  LogOut,
  Home,
} from 'lucide-react';
import { AcademicControlCenter } from './AcademicControlCenter';
import { useTheme } from '../contexts/ThemeContext';
import { ConfirmationModal } from './ConfirmationModal';
import api from '../lib/api';

type View = 'home' | 'chat' | 'study' | 'community' | 'partner';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  // Rename state
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editTitle, setEditTitle] = useState('');

  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const fetchStreak = async () => {
    try {
      const res = await api.get('/study/streak');
      setStreak(res.data.currentStreak || 0);
    } catch {
      // console.error('Failed to fetch streak', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      setHistory(res.data);
    } catch {
      // console.error('Failed to fetch history', err);
    }
  };

  useEffect(() => {
    void fetchStreak();
    void fetchHistory();
  }, []);

  const handleHistoryClick = (id: string) => {
    if (editingConversationId === id) return; // Don't switch if editing
    setSelectedConversationId(id);
    setSelectedMaterialId(null); // Clear material selection when picking a history item
    setCurrentView('chat');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.id) return;

    try {
      await api.delete(`/chat/history/${deleteConfirmation.id}`);
      setHistory((prev) => prev.filter((c) => c.id !== deleteConfirmation.id));
      if (selectedConversationId === deleteConfirmation.id) {
        setSelectedConversationId(null);
      }
    } catch {
      // console.error('Failed to delete conversation', err);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingConversationId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      await api.patch(`/chat/history/${id}`, { title: editTitle });
      setHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: editTitle } : c)),
      );
      setEditingConversationId(null);
    } catch {
      // console.error('Failed to rename conversation', err);
    }
  };

  const handleCancelRename = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setEditingConversationId(null);
  };

  const handleUploadComplete = () => {
    fetchStreak();
    setUploadModalOpen(false);
    setCurrentView('community'); // Redirect to community materials
  };

  return (
    <div className='flex h-[100dvh] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden relative'>
      {/* Background Mesh Gradients */}
      <div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0'>
        <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-400/20 blur-[120px] animate-pulse' />
        <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[120px] animate-pulse delay-1000' />
      </div>

      {/* Sidebar - Desktop */}
      <aside className='hidden md:flex md:flex-col w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 z-10 shadow-sm'>
        <div className='p-6 border-b border-gray-200/50 dark:border-gray-800/50'>
          <h1 className='text-2xl font-bold tracking-tight'>
            peer<span className='text-primary-600'>Student</span>
          </h1>
        </div>

        <div className='flex-1 overflow-y-auto py-4'>
          <nav className='px-3 space-y-1'>
            <button
              onClick={() => setCurrentView('home')}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 flex items-center ${
                currentView === 'home'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Home
                className={`w-5 h-5 mr-3 ${currentView === 'home' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
              />
              Home
            </button>
            <div className='px-3 mb-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
              Community
            </div>
            <button
              onClick={() => setCurrentView('community')}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 flex items-center ${
                currentView === 'community'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen
                className={`w-5 h-5 mr-3 ${currentView === 'community' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
              />
              Department Library
            </button>
            <button
              onClick={() => setCurrentView('partner')}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 flex items-center ${
                currentView === 'partner'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Users
                className={`w-5 h-5 mr-3 ${currentView === 'partner' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
              />
              Study Partner
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className='w-full px-3 py-2.5 rounded-xl text-left font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200 flex items-center'
            >
              <Upload className='w-5 h-5 mr-3 text-gray-400' />
              Upload Material
            </button>

            <div className='px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
              Tools
            </div>
            <button
              onClick={() => setCurrentView('study')}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 flex items-center ${
                currentView === 'study'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Clock
                className={`w-5 h-5 mr-3 ${currentView === 'study' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
              />
              Study Timer
            </button>
            <button
              onClick={() => {
                setCurrentView('chat');
                setSelectedConversationId(null);
                setSelectedMaterialId(null);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-left font-medium transition-all duration-200 flex items-center ${
                currentView === 'chat' && !selectedConversationId
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <MessageSquare
                className={`w-5 h-5 mr-3 ${currentView === 'chat' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}
              />
              AI Assistant
            </button>
          </nav>

          {history.length > 0 && (
            <div className='mt-6 px-3'>
              <h3 className='px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                Recent Chats
              </h3>
              <div className='space-y-0.5'>
                {history.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className={`group w-full px-3 py-2 text-sm text-left rounded-lg transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      selectedConversationId === conv.id
                        ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    onClick={() => handleHistoryClick(conv.id)}
                  >
                    <div className='flex items-center space-x-3 min-w-0 flex-1'>
                      <History className='w-3.5 h-3.5 flex-shrink-0 opacity-70' />
                      {editingConversationId === conv.id ? (
                        <div
                          className='flex items-center space-x-1 w-full'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type='text'
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className='flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500'
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleSaveRename(e, conv.id);
                              if (e.key === 'Escape') handleCancelRename(e);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => handleSaveRename(e, conv.id)}
                            className='p-1 text-green-500 hover:bg-green-50 rounded'
                          >
                            <Check className='w-3 h-3' />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className='p-1 text-red-500 hover:bg-red-50 rounded'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        </div>
                      ) : (
                        <span className='truncate'>{conv.title}</span>
                      )}
                    </div>

                    {!editingConversationId && (
                      <div className='flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <button
                          onClick={(e) => handleRenameClick(e, conv)}
                          className='p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors'
                          title='Rename conversation'
                        >
                          <Edit2 className='w-3 h-3' />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, conv.id)}
                          className='p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
                          title='Delete conversation'
                        >
                          <Trash2 className='w-3 h-3' />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='p-4 border-t border-gray-200/50 dark:border-gray-800/50 space-y-2 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between px-4 py-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200/50 dark:border-orange-700/30 shadow-sm'>
            <div className='flex items-center'>
              <div className='p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg mr-3'>
                <Flame
                  className='w-4 h-4 text-orange-500'
                  fill='currentColor'
                />
              </div>
              <div>
                <div className='font-bold text-gray-900 dark:text-gray-100 leading-none'>
                  {streak} Days
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                  Study Streak
                </div>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={() => setProfileOpen(true)}
              className='px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            >
              <Users className='w-4 h-4 mr-2' />
              Profile
            </button>
            <button
              onClick={toggleTheme}
              className='px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            >
              {theme === 'light' ? (
                <Moon className='w-4 h-4 mr-2' />
              ) : (
                <Sun className='w-4 h-4 mr-2' />
              )}
              Theme
            </button>
          </div>

          <button
            onClick={logout}
            className='w-full px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 transition-colors text-sm font-medium flex items-center justify-center'
          >
            <LogOut className='w-4 h-4 mr-2' />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className='fixed inset-0 z-50 md:hidden'>
          <div
            className='absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity'
            onClick={() => setSidebarOpen(false)}
          />
          <aside className='absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-right'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center'>
              <h1 className='text-2xl font-bold'>
                peer<span className='text-primary-600'>Student</span>
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto py-4'>
              <nav className='px-4 space-y-2'>
                <button
                  onClick={() => {
                    setCurrentView('home');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors flex items-center ${
                    currentView === 'home'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Home className='w-5 h-5 mr-3' />
                  Home
                </button>
                <button
                  onClick={() => {
                    setCurrentView('community');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors flex items-center ${
                    currentView === 'community'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <BookOpen className='w-5 h-5 mr-3' />
                  Department Library
                </button>
                <button
                  onClick={() => {
                    setCurrentView('partner');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors flex items-center ${
                    currentView === 'partner'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Users className='w-5 h-5 mr-3' />
                  Study Partner
                </button>
                <button
                  onClick={() => {
                    setCurrentView('study');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors flex items-center ${
                    currentView === 'study'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Clock className='w-5 h-5 mr-3' />
                  Study Timer
                </button>
                <button
                  onClick={() => {
                    setCurrentView('chat');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors flex items-center ${
                    currentView === 'chat'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <MessageSquare className='w-5 h-5 mr-3' />
                  AI Assistant
                </button>
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className='flex-1 flex flex-col overflow-hidden relative z-0'>
        {/* Mobile Header */}
        <header className='md:hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-20'>
          <button
            onClick={() => setSidebarOpen(true)}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg'
          >
            <Menu className='w-6 h-6' />
          </button>
          <h1 className='text-xl font-bold'>
            peer<span className='text-primary-600'>Student</span>
          </h1>
          <div className='w-10' /> {/* Spacer for balance */}
        </header>

        {/* Content Area */}
        <div className='flex-1 overflow-hidden relative'>
          {currentView === 'chat' ? (
            <Chatbot
              initialConversationId={selectedConversationId}
              initialMaterialId={selectedMaterialId}
              onConversationChange={(id) => {
                setSelectedConversationId(id);
                fetchHistory();
              }}
            />
          ) : currentView === 'home' ? (
            <AcademicControlCenter
              onNavigate={(view, id) => {
                setCurrentView(view);
                if (id) setSelectedConversationId(id);
              }}
              onUpload={() => setUploadModalOpen(true)}
            />
          ) : currentView === 'community' ? (
            <DepartmentView />
          ) : currentView === 'partner' ? (
            <div className='h-full overflow-y-auto'>
              <StudyPartner />
            </div>
          ) : (
            <div className='h-full overflow-y-auto p-4 md:p-8 flex items-center justify-center'>
              <StudyTimer onSessionComplete={fetchStreak} />
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <UserProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title='Delete Conversation'
        message='Are you sure you want to delete this conversation? This action cannot be undone.'
        confirmText='Delete'
        isDangerous={true}
      />
    </div>
  );
}
