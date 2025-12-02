import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Share2,
  Brain,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import api from '../lib/api';
import { AISidebar } from './AISidebar';
import { QuizModal } from './QuizModal';

interface Material {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  type: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export const MaterialView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        // We might need a specific endpoint for single material or use existing list with filter
        // Assuming we can fetch by ID. If not, we might need to update backend.
        // Actually, we don't have a direct "get material by id" endpoint in MaterialsController yet?
        // Let's check. MaterialsController has findAll, create, remove.
        // I might need to add findOne to MaterialsController.
        // For now, I'll try to fetch it.
        const res = await api.get(`/academic/materials/${id}`);
        setMaterial(res.data);
      } catch (error) {
        console.error('Failed to fetch material', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMaterial();
    }
  }, [id]);

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
    <div className='flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden'>
      {/* Left Side: Material Viewer */}
      <div className='flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800'>
        {/* Header */}
        <div className='h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0'>
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
          <div className='flex items-center space-x-2'>
            <button
              onClick={() => setQuizOpen(true)}
              className='px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center font-medium text-sm'
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
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-full transition-colors ${
                sidebarOpen
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={sidebarOpen ? 'Close AI Sidebar' : 'Open AI Sidebar'}
            >
              {sidebarOpen ? (
                <PanelRightClose className='w-5 h-5' />
              ) : (
                <PanelRightOpen className='w-5 h-5' />
              )}
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className='flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative'>
          {material.fileType.includes('pdf') ? (
            <iframe
              src={material.fileUrl}
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
                  Open file
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: AI Sidebar */}
      <AISidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        materialId={material.id}
      />

      <QuizModal
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        materialId={material?.id || ''}
      />
    </div>
  );
};
