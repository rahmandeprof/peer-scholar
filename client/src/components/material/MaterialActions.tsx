import { memo } from 'react';
import { Heart, Share2, Download, Headphones, Folder, AlertTriangle } from 'lucide-react';

interface MaterialActionsProps {
    materialId: string;
    fileUrl: string;
    isFavorited: boolean;
    ttsOpen: boolean;
    onToggleFavorite: () => void;
    onToggleTts: () => void;
    onShare: () => void;
    onAddToCollection: () => void;
    onReport: () => void;
}

export const MaterialActions = memo<MaterialActionsProps>(({
    fileUrl,
    isFavorited,
    ttsOpen,
    onToggleFavorite,
    onToggleTts,
    onShare,
    onAddToCollection,
    onReport,
}) => {
    return (
        <div className="py-1">
            {/* Favorite */}
            <button
                onClick={onToggleFavorite}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-gray-700 dark:text-gray-200 touch-manipulation"
            >
                <Heart
                    className={`w-4 h-4 mr-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                />
                {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>

            {/* Text to Speech */}
            <button
                onClick={onToggleTts}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-gray-700 dark:text-gray-200 touch-manipulation"
            >
                <Headphones className="w-4 h-4 mr-3" />
                {ttsOpen ? 'Hide Reader' : 'Read Aloud'}
            </button>

            {/* Add to Collection */}
            <button
                onClick={onAddToCollection}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-gray-700 dark:text-gray-200 touch-manipulation"
            >
                <Folder className="w-4 h-4 mr-3" />
                Add to Collection
            </button>

            {/* Download */}
            <a
                href={fileUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-gray-700 dark:text-gray-200 touch-manipulation"
            >
                <Download className="w-4 h-4 mr-3" />
                Download File
            </a>

            {/* Share */}
            <button
                onClick={onShare}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-gray-700 dark:text-gray-200 touch-manipulation"
            >
                <Share2 className="w-4 h-4 mr-3" />
                Share
            </button>

            {/* Report */}
            <button
                onClick={onReport}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 flex items-center text-sm text-red-600 dark:text-red-400 touch-manipulation"
            >
                <AlertTriangle className="w-4 h-4 mr-3" />
                Report
            </button>
        </div>
    );
});

MaterialActions.displayName = 'MaterialActions';
