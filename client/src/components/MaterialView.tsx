import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Material } from '../types/academic';
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
  TrendingUp,
  X,
} from 'lucide-react';
import { BorderSpinner, MaterialViewSkeleton } from './Skeleton';
import api from '../lib/api';
import { accumulateReadingTime } from '../lib/offlineReadingTracker';
import { getDisplayName } from '../lib/displayName';
import { addToViewingHistory } from '../lib/viewingHistory';
import { useTheme } from '../contexts/ThemeContext';
import { TextFileViewer } from './TextFileViewer';
import { PDFViewer } from './PDFViewer';
import { ContextMenu } from './ContextMenu';
import { CompactTimer as StudyTimer } from './CompactTimer';
import { TextSettings } from './TextSettings';
import { SessionEndModal } from './SessionEndModal';
import { ReaderSettingsProvider } from '../contexts/ReaderSettingsContext';
import { StarRating } from './StarRating';
import { useSocket } from '../contexts/SocketContext';
import { Headphones, Layers } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { FeatureSpotlightModal } from './FeatureSpotlightModal';
import { ReportModal } from './ReportModal';
import { CollectionModal } from './CollectionModal';
import { SaveOfflineButton } from './SaveOfflineButton';
import {
  saveMaterialOffline,
  isMaterialOffline,
  evictOldAutoCached,
} from '../lib/offlineStorage';
import { PenTool, Folder, MessageSquare, Link2 } from 'lucide-react';

// Lazy-loaded heavy modals and sidebars for better code splitting
const QuizModal = lazy(() =>
  import('./QuizModal').then((m) => ({ default: m.QuizModal })),
);
const FlashcardModal = lazy(() =>
  import('./FlashcardModal').then((m) => ({ default: m.FlashcardModal })),
);
// Lazy-load sidebar components (not visible until user opens them)
const AISidebar = lazy(() =>
  import('./AISidebar').then((m) => ({ default: m.AISidebar })),
);
const TTSPlayer = lazy(() =>
  import('./TTSPlayer').then((m) => ({ default: m.TTSPlayer })),
);
const Jotter = lazy(() =>
  import('./Jotter').then((m) => ({ default: m.Jotter })),
);
const PublicNotesPanel = lazy(() =>
  import('./PublicNotesPanel').then((m) => ({ default: m.PublicNotesPanel })),
);
const HelpfulLinksPanel = lazy(() =>
  import('./HelpfulLinksPanel').then((m) => ({ default: m.default })),
);
const RecommendedMaterials = lazy(() =>
  import('./RecommendedMaterials').then((m) => ({
    default: m.RecommendedMaterials,
  })),
);

// Loading spinner for lazy modals
const ModalLoadingFallback = () => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
    <div className='bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center gap-3'>
      <BorderSpinner size='2xl' className='text-primary-600' />
      <p className='text-sm text-gray-500 dark:text-gray-400'>Loading...</p>
    </div>
  </div>
);

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
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);

  // Reading time tracking for weekly goals
  const [readingSessionId, setReadingSessionId] = useState<string | null>(null);
  const readingSecondsRef = useRef(0);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const sessionStartTimeRef = useRef<number>(0); // Track when session started for accurate cleanup

  // Continue reading from last position
  const [lastReadPage, setLastReadPage] = useState(1);

  // Page tracking for TTS
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [ttsHighlightRange, setTtsHighlightRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // Callback for PDFViewer page changes
  const handlePdfPageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  // Callback for TTS to navigate PDF
  const handleTtsNavigateToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
        // Use batched endpoint that returns material + interactions in one call
        const res = await api.get(`/materials/${id}/full`);
        setMaterial(res.data);
        setIsFavorited(res.data.isFavorited || false);
        setUserRating(res.data.userRating || 0);
        setAverageRating(res.data.averageRating || 0);

        // Add to viewing history for "Recently Opened" feature
        addToViewingHistory({
          id: res.data.id,
          title: res.data.title,
          type: res.data.type,
          courseCode: res.data.courseCode,
          uploader: res.data.uploader
            ? {
                id: res.data.uploader.id,
                firstName: res.data.uploader.firstName,
                lastName: res.data.uploader.lastName,
              }
            : undefined,
        });

        // Track activity (fire and forget)
        api
          .post('/users/activity/update', {
            materialId: id,
            page: 1,
          })
          .catch(console.error);

        // Fetch activity and start session in parallel (interactions already included above)
        const [activityRes, sessionRes] = await Promise.all([
          api
            .get(`/users/activity/recent?materialId=${id}`)
            .catch(() => ({ data: {} })),
          api.post('/study/reading/start').catch(() => ({ data: {} })),
        ]);

        // Process activity
        if (activityRes.data.lastReadPage > 1) {
          setLastReadPage(activityRes.data.lastReadPage);
        }

        // Process session
        if (sessionRes.data.id) {
          setReadingSessionId(sessionRes.data.id);
          readingSecondsRef.current = sessionRes.data.durationSeconds || 0;
          sessionStartTimeRef.current =
            Date.now() - readingSecondsRef.current * 1000;
        }
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

  // Auto-cache recently viewed PDFs for offline access
  useEffect(() => {
    if (!material || !material.fileUrl) return;

    const autoCachePdf = async () => {
      try {
        // Don't auto-cache if already saved offline
        const alreadyOffline = await isMaterialOffline(material.id);
        if (alreadyOffline) return;

        // Fetch the PDF and cache it
        const response = await fetch(material.fileUrl);
        if (!response.ok) return;

        const blob = await response.blob();
        await saveMaterialOffline(
          material.id,
          material.title,
          blob,
          false, // isUserSaved = false (auto-cached)
        );

        // Evict old auto-cached items to keep storage lean
        await evictOldAutoCached(5);
        console.log('[Offline] Auto-cached material:', material.title);
      } catch (err) {
        console.error('[Offline] Failed to auto-cache:', err);
      }
    };

    // Only auto-cache PDFs
    if (
      material.fileUrl?.endsWith('.pdf') ||
      material.fileType?.includes('pdf')
    ) {
      void autoCachePdf();
    }
  }, [material]);

  // Reading time heartbeat - sends every 30 seconds while viewing
  // Pauses when tab is hidden (user switches tabs or minimizes)
  useEffect(() => {
    if (!readingSessionId || !sessionStartTimeRef.current) return;

    // Track if we're paused due to visibility
    let isPaused = false;
    let pausedAt = 0;
    let totalPausedTime = 0;

    // Use the ref for consistent timing across the session
    const getElapsedSeconds = () => {
      const totalElapsed = Date.now() - sessionStartTimeRef.current;
      // Subtract time spent paused
      const activeTime =
        totalElapsed - totalPausedTime - (isPaused ? Date.now() - pausedAt : 0);
      return Math.floor(Math.max(0, activeTime) / 1000);
    };

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (isPaused) return; // Skip if paused

        const elapsedSeconds = getElapsedSeconds();
        readingSecondsRef.current = elapsedSeconds;

        // Send heartbeat to backend (or accumulate locally if offline)
        if (navigator.onLine) {
          api
            .post('/study/reading/heartbeat', {
              sessionId: readingSessionId,
              seconds: elapsedSeconds,
            })
            .catch(console.error);
        }
        // Always accumulate locally as fallback (will sync when online)
        accumulateReadingTime(id || '', 30);
      }, 30000); // Every 30 seconds
    };

    // Handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - pause timing
        isPaused = true;
        pausedAt = Date.now();
        // Stop heartbeat to save resources
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        // Tab became visible - resume timing
        if (isPaused) {
          totalPausedTime += Date.now() - pausedAt;
          isPaused = false;
          pausedAt = 0;
          // Restart heartbeat
          startHeartbeat();
        }
      }
    };

    // Start initial heartbeat
    startHeartbeat();

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Use sendBeacon for reliable delivery on page unload
    const sendEndRequest = () => {
      const elapsedSeconds = getElapsedSeconds();
      // Only send if there's meaningful time (> 5 seconds)
      if (elapsedSeconds >= 5) {
        // Always accumulate locally first as safety net
        accumulateReadingTime(id || '', elapsedSeconds);

        if (navigator.onLine) {
          // Get auth token and API base URL for sendBeacon
          const token = localStorage.getItem('token');
          const apiBaseUrl =
            (import.meta.env.VITE_API_URL as string | undefined) ??
            'https://peerscholar.onrender.com/v1';
          const endpointUrl = `${apiBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1/study/reading/end`;

          // Include token in body since sendBeacon can't set headers
          const data = JSON.stringify({
            sessionId: readingSessionId,
            seconds: elapsedSeconds,
            _token: token, // Backend will extract this
          });

          // Use sendBeacon for reliability - it survives page navigation
          const sent = navigator.sendBeacon(
            endpointUrl,
            new Blob([data], { type: 'application/json' }),
          );
          if (!sent) {
            // Fallback to regular fetch (may not complete on navigation)
            api
              .post('/study/reading/end', {
                sessionId: readingSessionId,
                seconds: elapsedSeconds,
              })
              .catch(console.error);
          }
        }
        // If offline, the local accumulation will be synced when back online
      }
    };

    // Handle page close/refresh
    const handleBeforeUnload = () => sendEndRequest();
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Send end request on React unmount (navigation within app)
      sendEndRequest();
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

    // Optimistic update - immediately toggle the UI
    const previousValue = isFavorited;
    setIsFavorited(!isFavorited);

    try {
      const res = await api.post(`/materials/${material.id}/favorite`);
      // Sync with server response (in case of race conditions)
      setIsFavorited(res.data.isFavorited);
    } catch (error) {
      // Revert on error
      setIsFavorited(previousValue);
      console.error('Failed to toggle favorite', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!material) return;

    // Optimistic update - immediately show the new rating
    const previousUserRating = userRating;
    const previousAverageRating = averageRating;
    setUserRating(rating);
    // Estimate new average (rough approximation for optimistic UI)
    setAverageRating(rating);

    try {
      const res = await api.post(`/materials/${material.id}/rate`, {
        value: rating,
      });
      // Sync with actual server-calculated values
      setUserRating(res.data.userRating);
      setAverageRating(res.data.averageRating);
    } catch (error) {
      // Revert on error
      setUserRating(previousUserRating);
      setAverageRating(previousAverageRating);
      console.error('Failed to rate material', error);
    }
  };

  const { success } = useToast();

  const handleShare = async () => {
    if (!material) return;

    const shareData = {
      title: material.title,
      text: `Check out "${material.title}" on PeerToLearn!`,
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
    return <MaterialViewSkeleton />;
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
                <span className='truncate md:whitespace-normal'>
                  {material.title}
                </span>
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
                Uploaded by{' '}
                {material.uploader
                  ? getDisplayName(material.uploader)
                  : 'Unknown'}
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
              className={`hidden md:flex px-3 py-1.5 rounded-full transition-colors items-center font-medium text-sm ${
                jotterOpen
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
              onClick={() => setRecommendationsOpen(true)}
              className='hidden md:flex px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors items-center font-medium text-sm'
            >
              <TrendingUp className='w-4 h-4 mr-1.5' />
              For You
            </button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden md:flex p-2 rounded-full transition-colors ${
                sidebarOpen
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
                    className='fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/40'
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      e.currentTarget.dataset.startY = touch.clientY.toString();
                      e.currentTarget.dataset.currentY =
                        touch.clientY.toString();
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const startY = parseFloat(
                        e.currentTarget.dataset.startY || '0',
                      );
                      const deltaY = touch.clientY - startY;
                      if (deltaY > 0) {
                        e.currentTarget.style.transform = `translateY(${deltaY}px)`;
                        e.currentTarget.dataset.currentY =
                          touch.clientY.toString();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const startY = parseFloat(
                        e.currentTarget.dataset.startY || '0',
                      );
                      const currentY = parseFloat(
                        e.currentTarget.dataset.currentY || '0',
                      );
                      const deltaY = currentY - startY;
                      if (deltaY > 100) {
                        setMenuOpen(false);
                      }
                      e.currentTarget.style.transform = '';
                    }}
                    className='fixed bottom-0 left-0 right-0 w-full md:absolute md:right-0 md:top-full md:bottom-auto md:left-auto md:w-56 max-h-[60vh] md:max-h-[85vh] overflow-y-auto overscroll-contain bg-white dark:bg-gray-800 md:rounded-xl rounded-t-2xl shadow-xl border-t md:border border-gray-200 dark:border-gray-700 pb-20 md:pb-2 z-[100] animate-in slide-in-from-bottom-full md:slide-in-from-top-2 md:fade-in md:zoom-in-95 duration-200 md:mt-2 transition-transform'
                  >
                    {/* Mobile Header with Close Button */}
                    <div className='md:hidden sticky top-0 bg-white dark:bg-gray-800 z-10 px-4 py-3 border-b border-gray-100 dark:border-gray-700'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                          Actions
                        </span>
                        <button
                          onClick={() => setMenuOpen(false)}
                          className='p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                        >
                          <X className='w-5 h-5 text-gray-500' />
                        </button>
                      </div>
                      {/* Drag Handle */}
                      <div className='absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full' />
                    </div>

                    {/* Mobile Quick Actions - 2x3 Grid */}
                    <div className='md:hidden p-3 grid grid-cols-3 gap-2'>
                      <button
                        onClick={() => {
                          setQuizOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <Brain className='w-5 h-5 mb-1.5' />
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
                          } else {
                            setFlashcardModalOpen(true);
                          }
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <Layers className='w-5 h-5 mb-1.5' />
                        Cards
                      </button>
                      <button
                        onClick={() => {
                          setJotterOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-yellow-600 dark:text-yellow-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <PenTool className='w-5 h-5 mb-1.5' />
                        Jotter
                      </button>
                      <button
                        onClick={() => {
                          setPublicNotesOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600 dark:text-teal-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <MessageSquare className='w-5 h-5 mb-1.5' />
                        Notes
                      </button>
                      <button
                        onClick={() => {
                          setRecommendationsOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <TrendingUp className='w-5 h-5 mb-1.5' />
                        For You
                      </button>
                      <button
                        onClick={() => {
                          setSidebarOpen(true);
                          setMenuOpen(false);
                        }}
                        className='flex flex-col items-center justify-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-primary-600 dark:text-primary-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
                      >
                        <Sparkles className='w-5 h-5 mb-1.5' />
                        AI
                      </button>
                      {/* Timer spans full width for prominence */}
                      <div className='col-span-3 flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl min-h-[64px]'>
                        <StudyTimer
                          key={`mobile-${timerKey}`}
                          onComplete={handleSessionEnd}
                        />
                      </div>
                    </div>

                    {/* Rating */}
                    <div className='px-4 py-2 border-b border-gray-100 dark:border-gray-700'>
                      <span className='text-xs text-gray-500 block mb-1'>
                        Your Rating
                      </span>
                      <StarRating
                        rating={userRating}
                        onRate={(r) => {
                          handleRate(r);
                          setMenuOpen(false);
                        }}
                        size={20}
                      />
                    </div>

                    {/* Actions List */}
                    <div className='py-1'>
                      <button
                        onClick={() => {
                          handleToggleFavorite();
                          // Keep open or close? User usually wants feedback.
                          // But to be consistent with "mobile feel", let's close it.
                          setMenuOpen(false);
                        }}
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

                      <button
                        onClick={() => setMenuOpen(false)}
                        className='w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <TextSettings />
                        <span className='ml-3'>Text Settings</span>
                      </button>

                      <a
                        href={material.fileUrl}
                        download
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={() => setMenuOpen(false)}
                        className='block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center text-sm text-gray-700 dark:text-gray-200'
                      >
                        <Download className='w-4 h-4 mr-3' />
                        Download File
                      </a>

                      {/* Save for Offline */}
                      <div className='px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                        <SaveOfflineButton
                          materialId={material.id}
                          materialTitle={material.title}
                        />
                      </div>

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

                      {/* WhatsApp Share */}
                      <button
                        onClick={() => {
                          const text = `Check out "${material.title}" on PeerToLearn! 📚\n${window.location.href}`;
                          window.open(
                            `https://wa.me/?text=${encodeURIComponent(text)}`,
                            '_blank',
                          );
                          setMenuOpen(false);
                        }}
                        className='w-full text-left px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center text-sm text-green-600 dark:text-green-400'
                      >
                        <svg
                          className='w-4 h-4 mr-3'
                          fill='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
                        </svg>
                        Share to WhatsApp
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
                highlightRange={ttsOpen ? ttsHighlightRange : null}
              />
            ) : material.pdfUrl ||
              material.fileType.includes('pdf') ||
              material.fileUrl.endsWith('.pdf') ? (
              <PDFViewer
                url={material.pdfUrl || material.fileUrl}
                materialId={material.id}
                initialPage={lastReadPage}
                controlledPage={currentPage}
                onPageChange={handlePdfPageChange}
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

        {quizOpen && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <QuizModal
              isOpen={quizOpen}
              onClose={() => setQuizOpen(false)}
              materialId={material?.id || ''}
            />
          </Suspense>
        )}
        {flashcardModalOpen && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <FlashcardModal
              isOpen={flashcardModalOpen}
              onClose={() => setFlashcardModalOpen(false)}
              materialId={material?.id || ''}
            />
          </Suspense>
        )}
        <SessionEndModal
          isOpen={sessionEndModalOpen}
          onStartQuiz={handleStartQuiz}
          onContinueReading={handleContinueReading}
        />
        {ttsOpen && material?.content && (
          <Suspense fallback={<ModalLoadingFallback />}>
            <TTSPlayer
              text={material.content}
              materialId={material.id}
              startChunk={
                totalPages > 0
                  ? Math.floor(
                      ((currentPage - 1) *
                        Math.ceil(material.content.length / 800)) /
                        totalPages,
                    )
                  : 0
              }
              onClose={() => {
                setTtsOpen(false);
                setTtsHighlightRange(null); // Clear highlight when TTS closes
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              onNavigateToPage={handleTtsNavigateToPage}
              onHighlightChange={setTtsHighlightRange}
            />
          </Suspense>
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
                <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Helpful Resources
                </h2>
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

        {/* Recommendations Sidebar */}
        {recommendationsOpen && (
          <div className='fixed inset-0 z-[60]'>
            <div
              className='absolute inset-0 bg-black/30 backdrop-blur-sm'
              onClick={() => setRecommendationsOpen(false)}
            />
            <div className='absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto animate-slide-in-right'>
              <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Recommended For You
                </h2>
                <button
                  onClick={() => setRecommendationsOpen(false)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  ✕
                </button>
              </div>
              <div className='p-4'>
                <RecommendedMaterials />
              </div>
            </div>
          </div>
        )}
      </div>
    </ReaderSettingsProvider>
  );
};
