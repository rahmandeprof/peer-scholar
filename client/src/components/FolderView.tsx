import { X, Folder, Trash2, Edit3, Check, MoreVertical } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { MaterialCard } from './MaterialCard';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';

interface FolderViewProps {
  folder: {
    id: string;
    title: string;
    type: 'collection' | 'favorites';
    color?: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function FolderView({ folder, onClose, onUpdate }: FolderViewProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(folder.title);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { error, success } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, [folder]);

  useEffect(() => {
    setEditTitle(folder.title);
  }, [folder.title]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      if (folder.type === 'favorites') {
        const res = await api.get('/materials/favorites');
        setMaterials(res.data);
      } else {
        const res = await api.get(`/academic/collections/${folder.id}`);
        setMaterials(res.data.materials || []);
      }
    } catch (err) {
      console.error('Failed to fetch folder contents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFolder = async (materialId: string) => {
    // Optimistic removal
    const previousMaterials = materials;
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));

    try {
      if (folder.type === 'favorites') {
        await api.post(`/materials/${materialId}/favorite`);
      } else {
        await api.delete(
          `/academic/collections/${folder.id}/materials/${materialId}`,
        );
      }
      onUpdate();
      success('Removed from folder');
    } catch (err) {
      // Rollback on error
      setMaterials(previousMaterials);
      error('Failed to remove material');
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle === folder.title) {
      setIsEditing(false);
      setEditTitle(folder.title);
      return;
    }
    try {
      await api.patch(`/academic/collections/${folder.id}`, { title: editTitle });
      success('Collection renamed');
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      if (err.response?.status === 409) {
        error('A collection with this name already exists');
      } else {
        error('Failed to rename collection');
      }
      setEditTitle(folder.title);
    }
  };

  const handleDeleteCollection = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      await api.delete(`/academic/collections/${folder.id}`);
      success('Collection deleted');
      onUpdate();
      onClose();
    } catch (err) {
      error('Failed to delete collection');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]'>
        {/* Header */}
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10'>
          <div className='flex items-center space-x-3 flex-1 min-w-0'>
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${folder.type === 'favorites' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}
            >
              <Folder className='w-5 h-5' />
            </div>
            <div className='flex-1 min-w-0'>
              {isEditing && folder.type === 'collection' ? (
                <div className='flex items-center space-x-2'>
                  <input
                    type='text'
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditTitle(folder.title);
                      }
                    }}
                    autoFocus
                    className='flex-1 px-2 py-1 text-xl font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-primary-500'
                  />
                  <button
                    onClick={handleSaveTitle}
                    className='p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors'
                  >
                    <Check className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-white truncate'>
                    {folder.title}
                  </h2>
                  <p className='text-sm text-gray-500'>{materials.length} items</p>
                </>
              )}
            </div>
          </div>

          <div className='flex items-center space-x-2'>
            {/* Collection actions menu (only for collections, not favorites) */}
            {folder.type === 'collection' && !isEditing && (
              <div className='relative' ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
                >
                  <MoreVertical className='w-5 h-5 text-gray-500' />
                </button>
                {showMenu && (
                  <div className='absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-[160px]'>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center'
                    >
                      <Edit3 className='w-4 h-4 mr-2' />
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleting}
                      className='w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center'
                    >
                      <Trash2 className='w-4 h-4 mr-2' />
                      {deleting ? 'Deleting...' : 'Delete Collection'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
            >
              <X className='w-6 h-6 text-gray-500' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950/50'>
          {loading ? (
            <div className='flex justify-center py-20'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
            </div>
          ) : materials.length === 0 ? (
            <div className='text-center py-20 opacity-50'>
              <Folder className='w-16 h-16 mx-auto mb-4 text-gray-300' />
              <p>This folder is empty.</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  onRemoveFromFavorites={folder.type === 'favorites' ? handleRemoveFromFolder : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? Materials inside will not be deleted."
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
}
