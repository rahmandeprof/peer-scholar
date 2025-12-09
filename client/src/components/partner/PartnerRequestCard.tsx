import { memo } from 'react';
import { Check, X } from 'lucide-react';

interface PartnerRequest {
    id: string;
    sender?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    receiver?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface PartnerRequestCardProps {
    request: PartnerRequest;
    type: 'incoming' | 'outgoing';
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onCancel?: (id: string) => void;
}

export const PartnerRequestCard = memo<PartnerRequestCardProps>(({
    request,
    type,
    onAccept,
    onReject,
    onCancel,
}) => {
    const person = type === 'incoming' ? request.sender : request.receiver;
    const initial = person?.firstName?.[0] || '?';

    return (
        <div className="p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg">
                    {initial}
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {person?.firstName} {person?.lastName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                        {person?.email}
                    </div>
                </div>
            </div>

            {type === 'incoming' ? (
                <div className="flex space-x-2 flex-shrink-0">
                    <button
                        onClick={() => onAccept?.(request.id)}
                        className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 active:scale-95 transition-all touch-manipulation"
                    >
                        <Check className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onReject?.(request.id)}
                        className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-95 transition-all touch-manipulation"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => onCancel?.(request.id)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all text-sm font-medium touch-manipulation flex-shrink-0"
                >
                    Cancel
                </button>
            )}
        </div>
    );
});

PartnerRequestCard.displayName = 'PartnerRequestCard';
