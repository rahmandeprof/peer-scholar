import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Brain,
  Sparkles,
} from 'lucide-react';
import api from '../lib/api';
import { AISidebar } from './AISidebar';
import { QuizModal } from './QuizModal';
import { TextFileViewer } from './TextFileViewer';
import { PDFViewer } from './PDFViewer';
import { ContextMenu } from './ContextMenu';
import { StudyTimer } from './StudyTimer';
import { TextSettings } from './TextSettings';
import { SessionEndModal } from './SessionEndModal';
import { ReaderSettingsProvider } from '../contexts/ReaderSettingsContext';

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
}

export const MaterialView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [viewMode, setViewMode] = useState<'original' | 'text'>('original');
  const [sessionEndModalOpen, setSessionEndModalOpen] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Used to reset timer

  const handleSessionEnd = () => {
    setSessionEndModalOpen(true);
  };

  const handleContinueReading = () => {
    setSessionEndModalOpen(false);
    setTimerKey((prev) => prev + 1); // Reset timer
  };

  const handleStartQuiz = () => {
    setSessionEndModalOpen(false);
    setQuizOpen(true);
    setTimerKey((prev) => prev + 1); // Reset timer
  };

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const res = await api.get(`/materials/${id}`);
        setMaterial(res.data);

        // Track recently viewed material in localStorage
        const recent = JSON.parse(
          localStorage.getItem('recentMaterials') || '[]',
        );
        const newEntry = {
          id: res.data.id,
          title: res.data.title,
          type: res.data.type,
          courseCode: res.data.course?.code,
          viewedAt: new Date().toISOString(),
        };

        // Remove existing entry if present (to move it to top)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered = recent.filter((m: any) => m.id !== res.data.id);
        // Add new entry to top, limit to 10
        const updated = [newEntry, ...filtered].slice(0, 10);

        localStorage.setItem('recentMaterials', JSON.stringify(updated));
      } catch {
        // console.error('Failed to fetch material', error);
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

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  if (!material) {
    return <div>Material not found</div>;
  }

  return (
    <ReaderSettingsProvider>
      <div className='flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm z-10'>
          <div className='flex items-center space-x-3'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate(-1)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
              >
                <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
              </button>
              <div>
                <h1 className='text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md'>
                  {material.title}
                </h1>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Uploaded by {material.uploader.firstName}{' '}
                  {material.uploader.lastName}
                </p>
              </div>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <StudyTimer key={timerKey} onComplete={handleSessionEnd} />
            <TextSettings />
            <button
              onClick={() => setQuizOpen(true)}
              className='hidden md:flex px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors items-center font-medium text-sm'
            >
              <Brain className='w-4 h-4 mr-2' />
              Take Quiz
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
            <button className='p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'>
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

        {/* Content Viewer */}
        <div className='flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative'>
          {material.status === 'failed' ? (
            <div className='flex items-center justify-center h-full text-red-500'>
              <div className='text-center p-6'>
                <FileText className='w-16 h-16 mx-auto mb-4 opacity-50' />
                <p className='text-lg font-semibold'>File processing failed</p>
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
            <PDFViewer url={material.pdfUrl || material.fileUrl} />
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
        <div
          className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-[400px]' : 'w-0'} hidden md:block`}
        />
        <AISidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          materialId={material.id}
        />

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
        <SessionEndModal
          isOpen={sessionEndModalOpen}
          onStartQuiz={handleStartQuiz}
          onContinueReading={handleContinueReading}
        />
      </div>
    </ReaderSettingsProvider>
  );
};
