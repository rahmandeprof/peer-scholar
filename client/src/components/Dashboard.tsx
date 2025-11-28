import { useState, useEffect } from 'react';
import { Chatbot } from './Chatbot';
import { StudyTimer } from './StudyTimer';
import { UploadModal } from './UploadModal';
import { CommunityMaterials } from './CommunityMaterials';
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
  Check 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ConfirmationModal } from './ConfirmationModal';
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
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  
  // Rename state
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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
    
    console.log('Attempting to delete conversation:', deleteConfirmation.id);
    try {
      await api.delete(`/chat/history/${deleteConfirmation.id}`);
      console.log('Delete successful');
      setHistory(prev => prev.filter(c => c.id !== deleteConfirmation.id));
      if (selectedConversationId === deleteConfirmation.id) {
        setSelectedConversationId(null);
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingConversationId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      await api.patch(`/chat/history/${id}`, { title: editTitle });
      setHistory(prev => prev.map(c => c.id === id ? { ...c, title: editTitle } : c));
      setEditingConversationId(null);
    } catch (err) {
      console.error('Failed to rename conversation', err);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConversationId(null);
  };

  const handleChatWithMaterial = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setSelectedConversationId(null); // Start new chat
    setCurrentView('chat');
  };

  const handleUploadComplete = () => {
    fetchStreak();
    setUploadModalOpen(false);
    setCurrentView('community'); // Redirect to community materials
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold">
            peer<span className="text-primary-600">Scholar</span>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => {
                setCurrentView('chat');
                setSelectedConversationId(null); // New chat
                setSelectedMaterialId(null);
              }}
              className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                currentView === 'chat' && !selectedConversationId
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <MessageSquare className="inline w-5 h-5 mr-2" />
              New Chat
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
                  <div
                    key={conv.id}
                    className={`group w-full px-4 py-2 text-sm text-left rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedConversationId === conv.id
                        ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleHistoryClick(conv.id)}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <History className="w-3 h-3 flex-shrink-0" />
                      {editingConversationId === conv.id ? (
                        <div className="flex items-center space-x-1 w-full" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(e as any, conv.id);
                              if (e.key === 'Escape') handleCancelRename(e as any);
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                          <button onClick={(e) => handleSaveRename(e, conv.id)} className="p-1 text-green-500 hover:bg-green-50 rounded">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={handleCancelRename} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate">{conv.title}</span>
                      )}
                    </div>
                    
                    {!editingConversationId && (
                      <div className="flex items-center space-x-1 opacity-100">
                        <button
                          onClick={(e) => handleRenameClick(e, conv)}
                          className="p-1 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          title="Rename conversation"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, conv.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
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
                    setSelectedConversationId(null);
                    setSelectedMaterialId(null);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                    currentView === 'chat' && !selectedConversationId
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <MessageSquare className="inline w-5 h-5 mr-2" />
                  New Chat
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

              {history.length > 0 && (
                <div className="p-4 pt-0">
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    History
                  </h3>
                  <div className="space-y-1">
                    {history.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group w-full px-4 py-2 text-sm text-left rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          selectedConversationId === conv.id
                            ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleHistoryClick(conv.id)}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <History className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteClick(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                          title="Delete conversation"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
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
            <Chatbot 
              initialConversationId={selectedConversationId}
              initialMaterialId={selectedMaterialId}
              onConversationChange={(id) => {
                setSelectedConversationId(id);
                fetchHistory(); // Refresh history list
              }}
            />
          ) : currentView === 'community' ? (
            <CommunityMaterials onChat={handleChatWithMaterial} />
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
        onUploadComplete={handleUploadComplete}
      />

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
}
