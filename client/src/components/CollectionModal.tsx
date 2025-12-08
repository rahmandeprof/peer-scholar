import { useState, useEffect } from 'react';
import { X, Plus, Folder } from 'lucide-react';
import api from '../lib/api'; // Adjust path
import { useToast } from '../contexts/ToastContext'; // Adjust path

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId?: string; // Optional: If verified, add immediate
}

interface Collection {
  id: string;
  title: string;
  count: number;
}

export function CollectionModal({
  isOpen,
  onClose,
  materialId,
}: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/collections');
      setCollections(res.data);
    } catch (err) {
      console.error('Failed to fetch collections', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await api.post('/academic/collections', { title: newTitle });
      setCollections([res.data, ...collections]);
      setNewTitle('');
      success('Collection created');
    } catch (err) {
      error('Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!materialId) return;
    try {
      await api.post(`/academic/collections/${collectionId}/materials`, {
        materialId,
      });
      success('Added to collection');
      onClose();
    } catch (err) {
      error('Failed to add to collection');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
          <h3 className='font-bold text-lg text-gray-900 dark:text-white'>
            Save to Collection
          </h3>
          <button
            onClick={onClose}
            className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='p-4 space-y-4'>
          {/* Create New Input */}
          <div className='flex items-center space-x-2'>
            <input
              type='text'
              placeholder='New Collection Name...'
              className='flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500'
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || isCreating}
              className='p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50'
            >
              <Plus className='w-5 h-5' />
            </button>
          </div>

          <div className='border-t border-gray-100 dark:border-gray-700 pt-2'>
            {loading ? (
              <div className='flex justify-center py-4'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600'></div>
              </div>
            ) : collections.length === 0 ? (
              <p className='text-center text-sm text-gray-500 py-4'>
                No collections yet. Create one!
              </p>
            ) : (
              <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleAddToCollection(col.id)}
                    className='w-full flex items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group text-left'
                  >
                    <div className='p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg mr-3'>
                      <Folder className='w-4 h-4' />
                    </div>
                    <div className='flex-1'>
                      <h4 className='font-medium text-gray-900 dark:text-white text-sm'>
                        {col.title}
                      </h4>
                      <p className='text-xs text-gray-500'>
                        {col.count || 0} items
                      </p>
                    </div>
                    {materialId && (
                      <div className='opacity-0 group-hover:opacity-100 text-primary-600'>
                        <Plus className='w-4 h-4' />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
