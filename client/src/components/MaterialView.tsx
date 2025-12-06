import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Brain,
  Sparkles,
  Heart,
} from 'lucide-react';
import api from '../lib/api';
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
  const [timerKey, setTimerKey] = useState(0); // Used to reset timer
  const [ttsOpen, setTtsOpen] = useState(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState(0);

  const handleSessionEnd = () => {
    setSessionEndModalOpen(true);
  };

  const handleContinueReading = () => {
    setSessionEndModalOpen(false);
    setTimerKey((prev) => prev + 1); // Reset timer
  };

  const handleStartQuiz = async (pageLimit?: number) => {
    setSessionEndModalOpen(false);
    setQuizOpen(true);
    setTimerKey((prev) => prev + 1); // Reset timer

    // If pageLimit is provided, re-fetch quiz with limit
    if (pageLimit && material) {
      try {
        const cacheKey = `cached_quiz_${material.id}_limit_${pageLimit}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) {
          // We need to trigger a new generation. 
          // Note: The QuizModal usually fetches on mount. We might need to pass this limit to QuizModal 
          // or pre-fetch here. For now, let's pre-fetch and cache, assuming QuizModal checks cache.
          const res = await api.post(`/chat/quiz/${material.id}`, { pageLimit });
          localStorage.setItem(cacheKey, JSON.stringify(res.data));
        }
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
          // Ideally we pass the seed to the quiz modal to ensure same questions
          // For now, just opening it is a good start.
          // console.log('Starting shared quiz with seed:', data.seed);
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
        const res = await api.get(`/materials/${id}`);
        setMaterial(res.data);
        setFavoritesCount(res.data.favoritesCount || 0);
        setAverageRating(res.data.averageRating || 0);

        // Fetch interaction status
        const interactionRes = await api.get(`/materials/${id}/interactions`);
        setIsFavorited(interactionRes.data.isFavorited);
        setUserRating(interactionRes.data.userRating);

        // ... (existing localStorage logic)
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

  // Background Pre-fetching for Quiz
  useEffect(() => {
    if (!material?.id) return;

    const prefetchQuiz = async () => {
      const cacheKey = `cached_quiz_${material.id}`;
      const cached = localStorage.getItem(cacheKey);

      // If already cached, don't fetch again
      if (cached) return;

      try {
        // console.log('Pre-fetching quiz...');
        const res = await api.post(`/chat/quiz/${material.id}`);
        localStorage.setItem(cacheKey, JSON.stringify(res.data));
        // console.log('Quiz pre-fetched and cached');
      } catch (err) {
        console.error('Failed to pre-fetch quiz', err);
      }
    };

    // Small delay to prioritize main content load
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
      setFavoritesCount(res.data.favoritesCount);
    } catch (error) {
      console.error('Failed to toggle favorite', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!material) return;
    try {
      const res = await api.post(`/materials/${material.id}/rate`, { value: rating });
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

  // ... (existing render logic)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Material not found
      </div>
    );
  }

  return (
    <ReaderSettingsProvider>
      <div className='flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm z-10 shrink-0'>
          {/* ... Header content ... */}
          <div className='flex items-center space-x-3'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate(-1)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
              >
                <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
              </button>
              <div>
                <h1 className='text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md flex items-center gap-2'>
                  {material.title}
                  <div className='flex items-center ml-2'>
                    <StarRating rating={averageRating} size={14} readonly />
                    <span className='text-xs text-gray-500 ml-1'>({averageRating})</span>
                  </div>
                </h1>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Uploaded by {material.uploader.firstName}{' '}
                  {material.uploader.lastName}
                </p>
              </div>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <div className='flex items-center mr-4'>
               <span className='text-sm text-gray-500 mr-2'>Rate:</span>
               <StarRating rating={userRating} onRate={handleRate} size={18} />
            </div>
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-full transition-colors flex items-center gap-1 ${
                isFavorited
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              {favoritesCount > 0 && <span className='text-xs font-medium'>{favoritesCount}</span>}
            </button>
            <div className='w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2' />
            <StudyTimer key={timerKey} onComplete={handleSessionEnd} />
            {/* ... rest of buttons ... */}
            <TextSettings />
            
            <button
              onClick={() => setTtsOpen(!ttsOpen)}
              className={`p-2 rounded-full transition-colors ${
                ttsOpen
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Listen to this document"
            >
              <Headphones className="w-5 h-5" />
            </button>

            <div className='w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2' />
            {/* ... */}

            <button
              onClick={() => setQuizOpen(true)}
              className='hidden md:flex px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors items-center font-medium text-sm'
            >
              <Brain className='w-4 h-4 mr-2' />
              Take Quiz
            </button>
            <button
              onClick={() => setFlashcardModalOpen(true)}
              className='hidden md:flex px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors items-center font-medium text-sm'
            >
              <Layers className='w-4 h-4 mr-2' />
              Flashcards
            </button>
            <a
              href={material.fileUrl}
              download
              target='_blank'
              rel='noopener noreferrer'
              className='p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
              title='Download'
            >
              <Download className='w-5 h-5' />
            </a>
            <button
              onClick={handleShare}
              className='p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
              title='Share'
            >
              <Share2 className='w-5 h-5' />
            </button>
            <div className='w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2' />
            <button
              onClick={() =>
                setViewMode(viewMode === 'original' ? 'text' : 'original')
              }
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center ${
                viewMode === 'text'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {viewMode === 'text' && (
                <span className='mr-1.5 text-xs'>⚡</span>
              )}
              {viewMode === 'original' ? 'Lite Mode' : 'Saving Data'}
            </button>
            <div className='w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2' />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-full transition-colors ${
                sidebarOpen
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title='Open AI Companion'
            >
              <Sparkles className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Main Content Area (Flex Row) */}
        <div className='flex-1 flex overflow-hidden relative'>
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
              <PDFViewer url={material.pdfUrl || material.fileUrl} materialId={material.id} />
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

        {/* Mobile FAB for Quiz */}
        <button
          onClick={() => setQuizOpen(true)}
          className='md:hidden fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-700 transition-colors z-40'
        >
          <Brain className='w-7 h-7' />
        </button>

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
      </div>
    </ReaderSettingsProvider>
  );
};
