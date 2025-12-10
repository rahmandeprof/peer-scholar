import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Brain,
  Sparkles,
  Heart,
  MoreVertical,
  AlertTriangle,
  Moon,
  Sun,
} from 'lucide-react';
import api from '../lib/api';
import { addToViewingHistory } from '../lib/viewingHistory';
import { useTheme } from '../contexts/ThemeContext';
import { AISidebar } from './AISidebar';
import { QuizModal } from './QuizModal';
import { TextFileViewer } from './TextFileViewer';
import { PDFViewer } from './PDFViewer';
import { ContextMenu } from './ContextMenu';
import { CompactTimer as StudyTimer } from './CompactTimer';
import { TextSettings } from './TextSettings';
import { SessionEndModal } from './SessionEndModal';
import { ReaderSettingsProvider } from '../contexts/ReaderSettingsContext';
import { StarRating } from './StarRating';
import { useSocket } from '../contexts/SocketContext';
import { TTSPlayer } from './TTSPlayer';
import { Headphones, Layers } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { FlashcardModal } from './FlashcardModal';
import { FeatureSpotlightModal } from './FeatureSpotlightModal';
import { ReportModal } from './ReportModal';
import { Jotter } from './Jotter';
import { CollectionModal } from './CollectionModal';
import { PublicNotesPanel } from './PublicNotesPanel';
import HelpfulLinksPanel from './HelpfulLinksPanel';
import { PenTool, Folder, MessageSquare, Link2 } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  pdfUrl?: string;
  fileType: string;
  content?: string;
  type: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  favoritesCount: number;
  averageRating: number;
}

export const MaterialView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'text'>('original');
  const [sessionEndModalOpen, setSessionEndModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Used to reset timer
  const [ttsOpen, setTtsOpen] = useState(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [showFlashcardSpotlight, setShowFlashcardSpotlight] = useState(false);
  const [jotterOpen, setJotterOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [averageRating, setAverageRating] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [publicNotesOpen, setPublicNotesOpen] = useState(false);
  const [helpfulLinksOpen, setHelpfulLinksOpen] = useState(false);

  // Reading time tracking for weekly goals
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null);
  const readingSecondsRef = useRef(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Continue reading from last position
  const [lastReadPage, setLastReadPage] = useState(1);

  const handleSessionEnd = () => {
    setSessionEndModalOpen(true);
  };

  const handleContinueReading = () => {
    setSessionEndModalOpen(false);
    setTimerKey((prev) => prev + 1); // Reset timer
  };

  const handleStartQuiz = async (pageStart?: number, pageEnd?: number) => {
    setSessionEndModalOpen(false);
    setQuizOpen(true);
    setTimerKey((prev) => prev + 1); // Reset timer

    // If page range is provided, fetch quiz with range limit
    if ((pageStart || pageEnd) && material) {
      try {
        await api.post(`/chat/quiz/${material.id}`, {
          pageStart,
          pageEnd,
        });
        // Quiz will be generated with the specified page range
        console.log('Generated quiz for pages', pageStart, 'to', pageEnd);
      } catch (err) {
        console.error('Failed to generate limited quiz', err);
      }
    }
  };

  // Listen for shared quiz trigger
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('start_quiz', (data: { seed: number; materialId: string }) => {
        if (data.materialId === id) {
          setQuizOpen(true);
        }
      });

      return () => {
        socket.off('start_quiz');
      };
    }
  }, [socket, id]);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const res = await api.get(`/materials/${id}`)
        setMaterial(res.data);
        setIsFavorited(res.data.isFavorited || false);

        // Add to viewing history for "Recently Opened" feature
        addToViewingHistory({
          id: res.data.id,
          title: res.data.title,
          type: res.data.type,
          courseCode: res.data.courseCode,
          uploader: res.data.uploader ? {
            id: res.data.uploader.id,
            firstName: res.data.uploader.firstName,
            lastName: res.data.uploader.lastName,
          } : undefined,
        });

        // Track activity
        api
          .post('/users/activity/update', {
            materialId: id,
            page: 1,
          })
          .catch(console.error);

        // Fetch last read page for this material (to resume)
        try {
          const activityRes = await api.get('/users/activity/recent');
          if (activityRes.data.lastReadMaterialId === id && activityRes.data.lastReadPage > 1) {
            setLastReadPage(activityRes.data.lastReadPage);
          }
        } catch {
          // Ignore if failed
        }

        // Start reading session for time tracking
        try {
          const sessionRes = await api.post('/study/reading/start');
          setReadingSessionId(sessionRes.data.id);
          readingSecondsRef.current = sessionRes.data.durationSeconds || 0;
        } catch (err) {
          console.error('Failed to start reading session', err);
        }

        setAverageRating(res.data.averageRating || 0);

        // Fetch interaction status
        const interactionRes = await api.get(`/materials/${id}/interactions`);
        setIsFavorited(interactionRes.data.isFavorited);
        setUserRating(interactionRes.data.userRating);
      } catch {
        // ...
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchMaterial();
    }
  }, [id]);

  // Reading time heartbeat - sends every 30 seconds while viewing
  useEffect(() => {
    if (!readingSessionId) return;

    // Start counting time locally
    const startTime = Date.now() - (readingSecondsRef.current * 1000);

    heartbeatIntervalRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      readingSecondsRef.current = elapsedSeconds;

      // Send heartbeat to backend
      api.post('/study/reading/heartbeat', {
        sessionId: readingSessionId,
        seconds: elapsedSeconds,
      }).catch(console.error);
    }, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Send final heartbeat on leave
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      api.post('/study/reading/heartbeat', {
        sessionId: readingSessionId,
        seconds: elapsedSeconds,
      }).catch(console.error);
    };
  }, [readingSessionId]);

  // Background Pre-fetching for Quiz
  useEffect(() => {
    if (!material?.id) return;

    const prefetchQuiz = async () => {
      const cacheKey = `cached_quiz_${material.id}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) return;

      try {
        const res = await api.post(`/chat/quiz/${material.id}`);
        localStorage.setItem(cacheKey, JSON.stringify(res.data));
      } catch (err) {
        console.error('Failed to pre-fetch quiz', err);
      }
    };

    const timer = setTimeout(() => {
      void prefetchQuiz();
    }, 2000);

    return () => clearTimeout(timer);
  }, [material?.id]);

  const handleToggleFavorite = async () => {
    if (!material) return;
    try {
      const res = await api.post(`/materials/${material.id}/favorite`);
      setIsFavorited(res.data.isFavorited);
    } catch (error) {
      console.error('Failed to toggle favorite', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!material) return;
    try {
      const res = await api.post(`/materials/${material.id}/rate`, {
        value: rating,
      });
      setUserRating(res.data.userRating);
      setAverageRating(res.data.averageRating);
    } catch (error) {
      console.error('Failed to rate material', error);
    }
  };

  const { success } = useToast();

  const handleShare = async () => {
    if (!material) return;

    const shareData = {
      title: material.title,
      text: `Check out "${material.title}" on peerScholar!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className='flex items-center justify-center h-full text-red-500'>
        Material not found
      </div>
    );
  }

  return (
    <ReaderSettingsProvider>
      <div className='flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden relative'>
        {/* Header */}
        <div className='absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm gap-4'>
          {/* Left: Back + Title */}
          <div className='flex items-center space-x-3 flex-1 min-w-0'>
            <button
              onClick={() => navigate(-1)}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0'
            >
              <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
            </button>
            <div className='min-w-0 flex-1 overflow-hidden'>
              <h1 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 overflow-hidden'>
                <div className='relative overflow-hidden w-full'>
                  <span className='whitespace-nowrap md:animate-none animate-marquee md:w-auto block'>
                    {material.title}
                  </span>
                </div>
                {/* Desktop Rating */}
                <div className='hidden md:flex items-center shrink-0'>
                  <StarRating rating={averageRating} size={12} readonly />
                  <span className='text-xs text-gray-500 ml-1'>
                    ({averageRating})
                  </span>
                </div>
                {/* Mobile Rating */}
                <div className='flex md:hidden items-center shrink-0 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded text-xs font-medium text-yellow-700 dark:text-yellow-400'>
                  <span className='mr-1'>★</span>
                  {averageRating.toFixed(1)}
                </div>
              </h1>
              <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>
                Uploaded by {material.uploader.firstName}{' '}
                {material.uploader.lastName}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className='flex items-center space-x-2 shrink-0'>
            {/* Visible Items */}
            <div className='hidden md:flex'>
              <StudyTimer key={timerKey} onComplete={handleSessionEnd} />
            </div>

            <button
              onClick={() => setQuizOpen(true)}
              className='hidden md:flex px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors items-center font-medium text-sm'
            >
              <Brain className='w-4 h-4 mr-1.5' />
              Quiz
            </button>

            <button
              onClick={() => {
                const hasSeen = localStorage.getItem('has_seen_flashcards');
                if (!hasSeen) {
                  setShowFlashcardSpotlight(true);
                  localStorage.setItem('has_seen_flashcards', 'true');
                } else {
                  setFlashcardModalOpen(true);
                }
              }}
              className='hidden md:flex px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors items-center font-medium text-sm'
            >
              <Layers className='w-4 h-4 mr-1.5' />
              Cards
            </button>

            <button
              onClick={() => setJotterOpen(!jotterOpen)}
              className={`hidden md:flex px-3 py-1.5 rounded-full transition-colors items-center font-medium text-sm ${jotterOpen
                ? 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                }`}
            >
              <PenTool className='w-4 h-4 mr-1.5' />
              Jotter
            </button>

            <button
              onClick={() => setPublicNotesOpen(true)}
              className='hidden md:flex px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors items-center font-medium text-sm'
            >
              <MessageSquare className='w-4 h-4 mr-1.5' />
              Notes
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden md:flex p-2 rounded-full transition-colors ${sidebarOpen
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              title='Open AI Companion'
            >
              <Sparkles className='w-5 h-5' />
            </button>

            {/* Dropdown Menu */}
            <div className='relative'>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-full transition-colors ${menuOpen ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <MoreVertical className='w-5 h-5 text-gray-600 dark:text-gray-300' />
              </button>

              {menuOpen && (
                <>
                  <div
                    className='fixed inset-0 z-10'
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className='absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-100'>
                    {/* Mobile Only Actions */}
                    <div className='md:hidden px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-center'>
                      <StudyTimer
                        key={`mobile-${timerKey}`}
                        onComplete={handleSessionEnd}
                      />
                    </div>
                    <div className='md:hidden px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2'>
                      <button
                        onClick={() => {
                          setQuizOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400 text-xs font-medium'
                      >
                        <Brain className='w-4 h-4 mb-1' />
                        Quiz
                      </button>
                      <button
                        onClick={() => {
                          const hasSeen = localStorage.getItem(
                            'has_seen_flashcards',
                          );
                          if (!hasSeen) {
                            setShowFlashcardSpotlight(true);
                            localStorage.setItem('has_seen_flashcards', 'true');
                            setMenuOpen(false);
                          } else {
                            setFlashcardModalOpen(true);
                            setMenuOpen(false);
                          }
                        }}
                        className='flex flex-col items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 text-xs font-medium'
                      >
                        <Layers className='w-4 h-4 mb-1' />
                        Cards
                      </button>
                      <button
                        onClick={() => {
                          setJotterOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-xs font-medium'
                      >
                        <PenTool className='w-4 h-4 mb-1' />
                        Jotter
                      </button>
                      <button
                        onClick={() => {
                          setPublicNotesOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600 dark:text-teal-400 text-xs font-medium'
                      >
                        <MessageSquare className='w-4 h-4 mb-1' />
                        Notes
                      </button>
                    </div>

                    {/* Rating */}
                    <div className='px-4 py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-xs text-gray-500 block mb-1'>
                        Your Rating
                      </span>
                      <StarRating
                        rating={userRating}
                        onRate={handleRate}
                        size={20}
                      />
                    </div>

                    {/* Actions List */}
                    <div className='py-1'>
                      <button
                        onClick={handleToggleFavorite}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Heart
                          className={`w-4 h-4 mr-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                        />
                        {isFavorited
                          ? 'Remove from Favorites'
                          : 'Add to Favorites'}
                      </button>

                      <button
                        onClick={() => {
                          setTtsOpen(!ttsOpen);
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Headphones className='w-4 h-4 mr-3' />
                        {ttsOpen ? 'Hide Reader' : 'Read Aloud'}
                      </button>

                      <button
                        onClick={() => {
                          setCollectionModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Folder className='w-4 h-4 mr-3' />
                        Add to Collection
                      </button>

                      <button
                        onClick={() => {
                          setHelpfulLinksOpen(true);
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Link2 className='w-4 h-4 mr-3' />
                        Helpful Resources
                      </button>

                      <div className='px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'>
                        <TextSettings />
                        <span className='ml-3'>Text Settings</span>
                      </div>

                      <a
                        href={material.fileUrl}
                        download
                        target='_blank'
                        rel='noopener noreferrer'
                        className='block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Download className='w-4 h-4 mr-3' />
                        Download File
                      </a>

                      <button
                        onClick={() => {
                          handleShare();
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Share2 className='w-4 h-4 mr-3' />
                        Share
                      </button>

                      <button
                        onClick={() => {
                          setReportModalOpen(true);
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-red-600 dark:text-red-400'
                      >
                        <AlertTriangle className='w-4 h-4 mr-3' />
                        Report
                      </button>

                      <div className='border-t border-gray-100 dark:border-gray-700 mt-1 pt-1'>
                        <button
                          onClick={() => {
                            setViewMode(
                              viewMode === 'original' ? 'text' : 'original',
                            );
                            setMenuOpen(false);
                          }}
                          className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                        >
                          {viewMode === 'original' ? (
                            <>
                              <span className='w-4 h-4 mr-3 flex items-center justify-center text-xs font-bold'>
                                ⚡
                              </span>
                              Switch to Lite Mode
                            </>
                          ) : (
                            <>
                              <FileText className='w-4 h-4 mr-3' />
                              Switch to Original
                            </>
                          )}
                        </button>
                      </div>

                      <div className='border-t border-gray-100 dark:border-gray-700 mt-1 pt-1'>
                        <button
                          onClick={() => {
                            toggleTheme();
                          }}
                          className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                        >
                          {theme === 'dark' ? (
                            <>
                              <Sun className='w-4 h-4 mr-3' />
                              Light Mode
                            </>
                          ) : (
                            <>
                              <Moon className='w-4 h-4 mr-3' />
                              Dark Mode
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area (Flex Row) */}
        <div className='flex-1 flex overflow-hidden relative pt-[60px]'>
          {/* Content Viewer */}
          <div className='flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative flex flex-col'>
            {material.status === 'failed' ? (
              <div className='flex items-center justify-center h-full text-red-500'>
                <div className='text-center p-6'>
                  <FileText className='w-16 h-16 mx-auto mb-4 opacity-50' />
                  <p className='text-lg font-semibold'>
                    File processing failed
                  </p>
                  <p className='text-sm mt-2'>
                    Please try uploading the file again.
                  </p>
                </div>
              </div>
            ) : viewMode === 'text' ? (
              <TextFileViewer
                content={material.content}
                materialId={material.id}
              />
            ) : material.pdfUrl ||
              material.fileType.includes('pdf') ||
              material.fileUrl.endsWith('.pdf') ? (
              <PDFViewer
                url={material.pdfUrl || material.fileUrl}
                materialId={material.id}
                initialPage={lastReadPage}
              />
            ) : material.fileType.includes('text') ||
              material.fileType.includes('json') ||
              material.fileType.includes('javascript') ||
              material.fileType.includes('typescript') ||
              material.fileUrl.endsWith('.txt') ||
              material.fileUrl.endsWith('.md') ? (
              <TextFileViewer url={material.fileUrl} materialId={material.id} />
            ) : material.fileType.includes('word') ||
              material.fileType.includes('presentation') ||
              material.fileType.includes('spreadsheet') ||
              material.fileUrl.endsWith('.docx') ||
              material.fileUrl.endsWith('.pptx') ||
              material.fileUrl.endsWith('.xlsx') ? (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(
                  material.fileUrl,
                )}&embedded=true`}
                className='w-full h-full'
                title={material.title}
              />
            ) : (
              <div className='flex items-center justify-center h-full text-gray-500'>
                <div className='text-center'>
                  <FileText className='w-16 h-16 mx-auto mb-4 opacity-50' />
                  <p>Preview not available for this file type.</p>
                  <a
                    href={material.fileUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary-600 hover:underline mt-2 block'
                  >
                    Download file
                  </a>
                </div>
              </div>
            )}
            <ContextMenu />
          </div>

          {/* Right Side: AI Sidebar */}
          <AISidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            materialId={material.id}
          />
        </div>

        {/* Mobile FAB for Quiz - HIDDEN ON MOBILE as per request */}
        {/* 
        <button
          onClick={() => setQuizOpen(true)}
          className='md:hidden fixed bottom-[80px] right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors z-[999]'
        >
          <Brain className='w-7 h-7' />
        </button>
        */}

        <QuizModal
          isOpen={quizOpen}
          onClose={() => setQuizOpen(false)}
          materialId={material?.id || ''}
        />
        <FlashcardModal
          isOpen={flashcardModalOpen}
          onClose={() => setFlashcardModalOpen(false)}
          materialId={material?.id || ''}
        />
        <SessionEndModal
          isOpen={sessionEndModalOpen}
          onStartQuiz={handleStartQuiz}
          onContinueReading={handleContinueReading}
        />
        {ttsOpen && material?.content && (
          <TTSPlayer
            text={material.content}
            onClose={() => setTtsOpen(false)}
          />
        )}
        <FeatureSpotlightModal
          isOpen={showFlashcardSpotlight}
          onClose={() => {
            setShowFlashcardSpotlight(false);
            setFlashcardModalOpen(true);
          }}
          title='Study with Flashcards'
          description='Transform this material into interactive flashcards instantly. Perfect for memorizing key concepts and definitions.'
          icon={Layers}
        />
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          materialId={material?.id || ''}
        />
        <Jotter
          materialId={material?.id || ''}
          isOpen={jotterOpen}
          onClose={() => setJotterOpen(false)}
        />
        <CollectionModal
          isOpen={collectionModalOpen}
          onClose={() => setCollectionModalOpen(false)}
          materialId={material?.id}
        />
        <PublicNotesPanel
          materialId={material?.id || ''}
          isOpen={publicNotesOpen}
          onClose={() => setPublicNotesOpen(false)}
        />

        {/* Helpful Links Sidebar */}
        {helpfulLinksOpen && (
          <div className='fixed inset-0 z-[60]'>
            <div
              className='absolute inset-0 bg-black/30 backdrop-blur-sm'
              onClick={() => setHelpfulLinksOpen(false)}
            />
            <div className='absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in-right'>
              <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>Helpful Resources</h2>
                <button
                  onClick={() => setHelpfulLinksOpen(false)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  ✕
                </button>
              </div>
              <div className='p-4'>
                <HelpfulLinksPanel
                  materialId={material?.id || ''}
                  currentUserId={material?.uploader?.id}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ReaderSettingsProvider>
  );
};
