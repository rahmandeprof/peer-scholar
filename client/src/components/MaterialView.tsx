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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'text'>('original');
  const [sessionEndModalOpen, setSessionEndModalOpen] = useState(false);
  const [timerKey, setTimerKey] = useState(0); // Used to reset timer

  // ... (handlers remain same)

  // ... (useEffect for fetchMaterial remains same)

  // ... (useEffect for prefetchQuiz remains same)

  if (loading) {
    // ...
  }

  if (!material) {
    return <div>Material not found</div>;
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
        <SessionEndModal
          isOpen={sessionEndModalOpen}
          onStartQuiz={handleStartQuiz}
          onContinueReading={handleContinueReading}
        />
      </div>
    </ReaderSettingsProvider>
  );
};
