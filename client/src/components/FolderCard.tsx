import { Folder, MoreVertical, Heart } from 'lucide-react';
import { useState } from 'react';

interface FolderCardProps {
  id: string;
  title: string;
  count: number;
  color?: string;
  isFavorite?: boolean; // Special styling for Favorites folder
  onClick: () => void;
  onDelete?: () => void; // Optional delete action
}

export function FolderCard({
  title,
  count,
  color = '#4F46E5', // Default Indigo
  isFavorite = false,
  onClick,
  onDelete,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`relative group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
        isFavorite
          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/30'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-500/50'
      }`}
    >
      <div className='flex items-start justify-between mb-4'>
        <div
          className={`p-3 rounded-xl ${
            isFavorite
              ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
          style={
            !isFavorite ? { backgroundColor: `${color}20`, color: color } : {}
          }
        >
          {isFavorite ? (
            <Heart className='w-6 h-6 fill-current' />
          ) : (
            <Folder className='w-6 h-6 fill-current' />
          )}
        </div>

        {onDelete && !isFavorite && (
          <div className='relative' onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className='p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity'
            >
              <MoreVertical className='w-4 h-4' />
            </button>
            {menuOpen && (
              <>
                <div
                  className='fixed inset-0 z-10'
                  onClick={() => setMenuOpen(false)}
                />
                <div className='absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20'>
                  <button
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className='w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className='font-bold text-gray-900 dark:text-gray-100 truncate'>
          {title}
        </h3>
        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
          {count} {count === 1 ? 'file' : 'files'}
        </p>
      </div>
    </div>
  );
}
