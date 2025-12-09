import { memo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StarRating } from '../StarRating';

interface MaterialHeaderInfoProps {
    title: string;
    uploaderName: string;
    averageRating: number;
    onBack: () => void;
}

export const MaterialHeaderInfo = memo<MaterialHeaderInfoProps>(({
    title,
    uploaderName,
    averageRating,
    onBack,
}) => {
    return (
        <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 rounded-full transition-all shrink-0 touch-manipulation"
                aria-label="Go back"
            >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 overflow-hidden">
                    <div className="relative overflow-hidden w-full">
                        <span className="whitespace-nowrap md:animate-none animate-marquee md:w-auto block">
                            {title}
                        </span>
                    </div>
                    {/* Desktop Rating */}
                    <div className="hidden md:flex items-center shrink-0">
                        <StarRating rating={averageRating} size={12} readonly />
                        <span className="text-xs text-gray-500 ml-1">
                            ({averageRating.toFixed(1)})
                        </span>
                    </div>
                    {/* Mobile Rating Badge */}
                    <div className="flex md:hidden items-center shrink-0 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        <span className="mr-1">★</span>
                        {averageRating.toFixed(1)}
                    </div>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    Uploaded by {uploaderName}
                </p>
            </div>
        </div>
    );
});

MaterialHeaderInfo.displayName = 'MaterialHeaderInfo';
