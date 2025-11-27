import { useState, useEffect } from 'react';
import { Chatbot } from './Chatbot';
import { StudyTimer } from './StudyTimer';
import { UploadModal } from './UploadModal';
import { CommunityMaterials } from './CommunityMaterials';
import { Flame, Upload, Clock, Moon, Sun, Menu, X, BookOpen, MessageSquare, History } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';

type View = 'chat' | 'study' | 'community';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export function Dashboard() {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<Conversation[]>([]);
  const { theme, toggleTheme } = useTheme();

  const fetchStreak = async () => {
    try {
      const res = await api.get('/study/streak');
      setStreak(res.data.currentStreak || 0);
    } catch (err) {
      console.error('Failed to fetch streak', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  useEffect(() => {
    fetchStreak();
    fetchHistory();
  }, []);

  return (
    <div className="flex h-screen bg-gray-200 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold">
            peer<span className="text-primary-600">Scholar</span>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                currentView === 'chat'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <MessageSquare className="inline w-5 h-5 mr-2" />
              Chat
            </button>
            <button
              onClick={() => setCurrentView('community')}
              className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                currentView === 'community'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <BookOpen className="inline w-5 h-5 mr-2" />
              Community Materials
            </button>
            <button
              onClick={() => setCurrentView('study')}
              className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                currentView === 'study'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Clock className="inline w-5 h-5 mr-2" />
              Study Timer
            </button>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="w-full px-4 py-3 rounded-xl text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Upload className="inline w-5 h-5 mr-2" />
              Upload to Community
            </button>
          </nav>

          {history.length > 0 && (
            <div className="p-4 pt-0">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                History
              </h3>
              <div className="space-y-1">
                {history.map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full px-4 py-2 text-sm text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg truncate transition-colors flex items-center"
                  >
                    <History className="w-3 h-3 mr-2 flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-gradient-to-r dark:from-orange-900/30 dark:to-yellow-900/30 rounded-xl border border-orange-200 dark:border-transparent">
            <div className="flex items-center">
              <Flame className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" />
              <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{streak}</span>
              <span className="text-gray-600 dark:text-gray-400 text-sm ml-1">day streak</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-5 h-5 mr-2" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-5 h-5 mr-2" />
                Light Mode
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h1 className="text-2xl font-bold">
                peer<span className="text-primary-600">Scholar</span>
              </h1>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav className="p-4 space-y-2">
                <button
                  onClick={() => {
                    setCurrentView('chat');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                    currentView === 'chat'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <MessageSquare className="inline w-5 h-5 mr-2" />
                  Chat
                </button>
                <button
                  onClick={() => {
                    setCurrentView('community');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                    currentView === 'community'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <BookOpen className="inline w-5 h-5 mr-2" />
                  Community Materials
                </button>
                <button
                  onClick={() => {
                    setCurrentView('study');
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                    currentView === 'study'
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Clock className="inline w-5 h-5 mr-2" />
                  Study Timer
                </button>
                <button
                  onClick={() => {
                    setUploadModalOpen(true);
                    setSidebarOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-xl text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-primary-600 dark:text-primary-400"
                >
                  <Upload className="inline w-5 h-5 mr-2" />
                  Upload to Community
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-gradient-to-r dark:from-orange-900/30 dark:to-yellow-900/30 rounded-xl border border-orange-200 dark:border-transparent">
                <div className="flex items-center">
                  <Flame className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" />
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{streak}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm ml-1">day streak</span>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-5 h-5 mr-2" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="w-5 h-5 mr-2" />
                    Light Mode
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">
            peer<span className="text-primary-600">Scholar</span>
          </h1>
          <button onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'chat' ? (
            <Chatbot />
          ) : currentView === 'community' ? (
            <CommunityMaterials />
          ) : (
            <div className="h-full overflow-y-auto p-4 md:p-8 flex items-center justify-center">
              <StudyTimer onSessionComplete={fetchStreak} />
            </div>
          )}
        </div>
      </main>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={fetchStreak}
      />
    </div>
  );
}
