import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  BookOpen,
  SortAsc,
  SortDesc,
  MessageSquare,
  Trash2,
  Eye,
  Download,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';
import { FileViewerModal } from './FileViewerModal';
import { LoadingState } from './LoadingState';
import { useMaterials, invalidateMaterialsCache } from '../hooks/useApi';

interface Material {
  id: string;
  title: string;
  department: string;
  yearLevel: number;
  category: string;
  createdAt: string;
  isPublic: boolean;
  url: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ViewerMaterial {
  id: string;
  title: string;
  content: string;
  fileUrl: string;
  fileType: string;
}

type SortField = 'createdAt' | 'title' | 'yearLevel';
type SortOrder = 'asc' | 'desc';

interface CommunityMaterialsProps {
  onChat?: (materialId: string) => void;
}

export function CommunityMaterials({ onChat }: CommunityMaterialsProps) {
  // Use SWR-cached materials hook for instant loading on revisit
  const { materials, isLoading, isValidating, refresh } = useMaterials();

  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });
  const [viewingMaterial, setViewingMaterial] = useState<ViewerMaterial | null>(
    null,
  );
  const [localMaterials, setLocalMaterials] = useState<Material[]>([]);

  const { user } = useAuth();

  // Sync SWR data to local state for optimistic updates
  useEffect(() => {
    if (materials) {
      setLocalMaterials(materials as Material[]);
    }
  }, [materials]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.id) return;

    const idToDelete = deleteConfirmation.id;

    // Optimistic update: remove from local state immediately
    setLocalMaterials((prev) => prev.filter((m) => m.id !== idToDelete));
    setDeleteConfirmation({ isOpen: false, id: null });

    try {
      const api = (await import('../lib/api')).default;
      await api.delete(`/chat/materials/${idToDelete}`);
      // Invalidate cache to ensure fresh data on next fetch
      await invalidateMaterialsCache();
    } catch {
      // Revert optimistic update on error
      refresh();
    }
  };

  const filteredMaterials = localMaterials
    .filter(
      (m) =>
        m.title.toLowerCase().includes(filter.toLowerCase()) ||
        m.department?.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'yearLevel') {
        comparison = (a.yearLevel || 0) - (b.yearLevel || 0);
      } else {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className='flex flex-col h-full bg-gray-50 dark:bg-gray-950'>
      <div className='p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
              <BookOpen className='w-6 h-6 mr-2 text-primary-600' />
              Community Materials
              {isValidating && !isLoading && (
                <RefreshCw className='w-4 h-4 ml-2 animate-spin text-gray-400' />
              )}
            </h2>
            <p className='text-gray-500 dark:text-gray-400 text-sm mt-1'>
              Access resources shared by other students
            </p>
          </div>

          <div className='flex items-center space-x-4 w-full md:w-auto'>
            <button
              onClick={() => refresh()}
              className='p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              title='Refresh materials'
            >
              <RefreshCw className={`w-5 h-5 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
            <div className='relative flex-1 md:w-64'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Search materials...'
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className='w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
              />
            </div>
          </div>
        </div>

        <div className='flex items-center space-x-4 mt-6 text-sm text-gray-500 overflow-x-auto pb-2'>
          <span className='font-medium'>Sort by:</span>
          <button
            onClick={() => toggleSort('createdAt')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'createdAt' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Date
            {sortField === 'createdAt' &&
              (sortOrder === 'asc' ? (
                <SortAsc className='w-4 h-4 ml-1' />
              ) : (
                <SortDesc className='w-4 h-4 ml-1' />
              ))}
          </button>
          <button
            onClick={() => toggleSort('title')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'title' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Title
            {sortField === 'title' &&
              (sortOrder === 'asc' ? (
                <SortAsc className='w-4 h-4 ml-1' />
              ) : (
                <SortDesc className='w-4 h-4 ml-1' />
              ))}
          </button>
          <button
            onClick={() => toggleSort('yearLevel')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'yearLevel' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Year Level
            {sortField === 'yearLevel' &&
              (sortOrder === 'asc' ? (
                <SortAsc className='w-4 h-4 ml-1' />
              ) : (
                <SortDesc className='w-4 h-4 ml-1' />
              ))}
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-6'>
        {isLoading ? (
          <LoadingState message='Fetching community materials...' />
        ) : filteredMaterials.length === 0 ? (
          <div className='text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800'>
            <BookOpen className='w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4' />
            <h3 className='text-xl font-medium text-gray-900 dark:text-gray-100'>
              No materials found
            </h3>
            <p className='text-gray-500 dark:text-gray-400 mt-2'>
              Be the first to share something with the community!
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow group relative'
              >
                {/* Delete Button */}
                {user && material.uploadedBy?.id === user.id && (
                  <button
                    onClick={(e) => handleDeleteClick(e, material.id)}
                    className='absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100'
                    title='Delete material'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                )}

                <div className='flex items-start justify-between mb-4 pr-8'>
                  <div className='p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400'>
                    <FileText className='w-6 h-6' />
                  </div>
                  <span className='text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full'>
                    {material.category.replace('_', ' ')}
                  </span>
                </div>

                <h3 className='font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors'>
                  {material.title}
                </h3>

                <div className='space-y-2 mb-6'>
                  <div className='flex items-center text-sm text-gray-500 dark:text-gray-400'>
                    <span className='w-20'>Dept:</span>
                    <span className='font-medium text-gray-900 dark:text-gray-200'>
                      {material.department || 'N/A'}
                    </span>
                  </div>
                  <div className='flex items-center text-sm text-gray-500 dark:text-gray-400'>
                    <span className='w-20'>Year:</span>
                    <span className='font-medium text-gray-900 dark:text-gray-200'>
                      {material.yearLevel || 'N/A'}
                    </span>
                  </div>
                  <div className='flex items-center text-sm text-gray-500 dark:text-gray-400'>
                    <span className='w-20'>Date:</span>
                    <span>
                      {new Date(material.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <button
                    onClick={() =>
                      setViewingMaterial({
                        id: material.id,
                        title: material.title,
                        content: 'Loading content...',
                        fileUrl: material.url,
                        fileType: 'application/pdf',
                      })
                    }
                    className='flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium'
                  >
                    <Eye className='w-3 h-3 mr-1.5' />
                    View
                  </button>
                  <a
                    href={material.url}
                    download
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300'
                  >
                    <Download className='w-3 h-3 mr-1.5' />
                    Download
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/materials/${material.id}`,
                      );
                      // You might want to add a toast here
                    }}
                    className='flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-medium'
                  >
                    <Share2 className='w-3 h-3 mr-1.5' />
                    Share
                  </button>
                  {onChat && (
                    <button
                      onClick={() => onChat(material.id)}
                      className='flex items-center justify-center px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-xs font-medium'
                    >
                      <MessageSquare className='w-3 h-3 mr-1.5' />
                      Summarize
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title='Delete Material'
        message='Are you sure you want to delete this material? This action cannot be undone.'
        confirmText='Delete'
        isDangerous={true}
      />

      <FileViewerModal
        isOpen={!!viewingMaterial}
        onClose={() => setViewingMaterial(null)}
        material={viewingMaterial}
      />
    </div>
  );
}
