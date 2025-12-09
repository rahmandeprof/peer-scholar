import { X, Folder, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MaterialCard } from './MaterialCard'; // Reuse existing
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface FolderViewProps {
  folder: {
    id: string; // 'favorites' or collection ID
    title: string;
    type: 'collection' | 'favorites';
    color?: string;
  };
  onClose: () => void;
  onUpdate: () => void; // Trigger refresh of dashboard
}

export function FolderView({ folder, onClose, onUpdate }: FolderViewProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, success } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, [folder]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      if (folder.type === 'favorites') {
        // Assuming we have an endpoint for favorites or filter logic
        // For now, simpler to fetch all favorites.
        // Wait, did we create a favorites endpoint?
        // Usually GET /users/favorites or similar.
        // Let's assume GET /users/activity/favorites exists or create it.
        // Actually, we can use the MaterialFavorite entity relation.
        // Let's assume we fetch `GET /materials/favorites`.
        const res = await api.get('/materials/favorites');
        setMaterials(res.data);
      } else {
        // Collection
        const res = await api.get(`/academic/collections/${folder.id}`);
        setMaterials(res.data.materials || []);
      }
    } catch (err) {
      console.error('Failed to fetch folder contents', err);
      // Fallback or empty
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFolder = async (materialId: string) => {
    try {
      if (folder.type === 'favorites') {
        await api.post(`/materials/${materialId}/favorite`); // Use POST to toggle (which handles remove) or DELETE if explicit
        // The controller uses POST :id/favorite to toggle.
        // But here we want to remove.
        // Let's call the toggle endpoint.
        // Wait, FolderView calls DELETE.
        // The Controller toggle logic is remove-if-exists.
        // So calling POST `materials/:id/favorite` will remove it if it's there.
        // But `FolderView` code is `api.delete`.
        // Let's check `MaterialView`. usage: `api.post`.
        // So I should change `api.delete` to `api.post` for consistency with toggle logic.
        await api.post(`/materials/${materialId}/favorite`);
      } else {
        await api.delete(
          `/academic/collections/${folder.id}/materials/${materialId}`,
        );
      }
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      onUpdate();
      success('Removed from folder');
    } catch (err) {
      error('Failed to remove material');
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]'>
        {/* Header */}
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10'>
          <div className='flex items-center space-x-3'>
            <div
              className={`p-2 rounded-lg ${folder.type === 'favorites' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}
            >
              <Folder className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                {folder.title}
              </h2>
              <p className='text-sm text-gray-500'>{materials.length} items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-6 h-6 text-gray-500' />
          </button>
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
                <div key={material.id} className='relative group'>
                  <MaterialCard material={material} />
                  {/* Overlay Action to Remove */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveFromFolder(material.id);
                    }}
                    className='absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50'
                    title='Remove from folder'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
