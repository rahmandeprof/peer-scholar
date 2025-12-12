import { useState, useEffect } from 'react';
import { X, Plus, Folder, Edit3, Trash2, Check, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useModalBack } from '../hooks/useModalBack';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId?: string; // Optional: If provided, show "add to collection" mode
  onCollectionSelect?: (collection: { id: string; title: string }) => void;
  onRefresh?: () => void;
}

interface Collection {
  id: string;
  title: string;
  count: number;
  color?: string;
}

export function CollectionModal({
  isOpen,
  onClose,
  materialId,
  onCollectionSelect,
  onRefresh,
}: CollectionModalProps) {
  useModalBack(isOpen, onClose, 'collection-modal');

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { success, error } = useToast();

  // Browse mode when no materialId is provided
  const isBrowseMode = !materialId;

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
      onRefresh?.();
    } catch (err: any) {
      if (err.response?.status === 409) {
        error('A collection with this name already exists');
      } else {
        error('Failed to create collection');
      }
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

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.patch(`/academic/collections/${id}`, { title: editTitle });
      setCollections(cols => cols.map(c => c.id === id ? { ...c, title: editTitle } : c));
      setEditingId(null);
      success('Collection renamed');
      onRefresh?.();
    } catch (err: any) {
      if (err.response?.status === 409) {
        error('A collection with this name already exists');
      } else {
        error('Failed to rename collection');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection? Materials inside will not be deleted.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/academic/collections/${id}`);
      setCollections(cols => cols.filter(c => c.id !== id));
      success('Collection deleted');
      onRefresh?.();
    } catch (err) {
      error('Failed to delete collection');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectCollection = (col: Collection) => {
    if (isBrowseMode && onCollectionSelect) {
      onCollectionSelect({ id: col.id, title: col.title });
      onClose();
    } else if (materialId) {
      handleAddToCollection(col.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg'>
              <Folder className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <h3 className='font-bold text-lg text-gray-900 dark:text-white'>
              {isBrowseMode ? 'My Collections' : 'Save to Collection'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
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
              className='flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500'
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || isCreating}
              className='p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors'
            >
              <Plus className='w-5 h-5' />
            </button>
          </div>

          <div className='border-t border-gray-100 dark:border-gray-700 pt-3'>
            {loading ? (
              <div className='flex justify-center py-8'>
                <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600'></div>
              </div>
            ) : collections.length === 0 ? (
              <div className='text-center py-8'>
                <Folder className='w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600' />
                <p className='text-sm text-gray-500'>No collections yet. Create one above!</p>
              </div>
            ) : (
              <div className='space-y-1.5 max-h-[350px] overflow-y-auto'>
                {collections.map((col) => (
                  <div
                    key={col.id}
                    className='group flex items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                  >
                    {editingId === col.id ? (
                      // Edit mode
                      <div className='flex-1 flex items-center space-x-2'>
                        <input
                          type='text'
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(col.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className='flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-primary-500'
                        />
                        <button
                          onClick={() => handleRename(col.id)}
                          className='p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200'
                        >
                          <Check className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className='p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    ) : (
                      // Normal mode
                      <>
                        <button
                          onClick={() => handleSelectCollection(col)}
                          className='flex-1 flex items-center text-left'
                        >
                          <div className='p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg mr-3'>
                            <Folder className='w-4 h-4' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <h4 className='font-medium text-gray-900 dark:text-white text-sm truncate'>
                              {col.title}
                            </h4>
                            <p className='text-xs text-gray-500'>
                              {col.count || 0} items
                            </p>
                          </div>
                          {!isBrowseMode && (
                            <Plus className='w-4 h-4 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity' />
                          )}
                          {isBrowseMode && (
                            <ChevronRight className='w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' />
                          )}
                        </button>

                        {/* Edit/Delete buttons - only in browse mode */}
                        {isBrowseMode && (
                          <div className='flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(col.id);
                                setEditTitle(col.title);
                              }}
                              className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-500 hover:text-gray-700'
                              title='Rename'
                            >
                              <Edit3 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(col.id);
                              }}
                              disabled={deletingId === col.id}
                              className='p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-600'
                              title='Delete'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
