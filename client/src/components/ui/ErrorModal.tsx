/**
 * ErrorModal - Dismissable modal for displaying detailed error messages
 * Replaces toast notifications for critical errors that need user attention
 */
import { useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';

export type ErrorModalType = 'error' | 'warning' | 'info';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: ErrorModalType;
    onRetry?: () => void;
    retryLabel?: string;
}

const iconConfig = {
    error: {
        Icon: AlertCircle,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    warning: {
        Icon: AlertTriangle,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        borderColor: 'border-amber-200 dark:border-amber-800',
    },
    info: {
        Icon: Info,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
};

export function ErrorModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'error',
    onRetry,
    retryLabel = 'Try Again',
}: ErrorModalProps) {
    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const config = iconConfig[type];
    const { Icon } = config;

    return (
        <div
            className='fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'
            onClick={onClose}
            role='dialog'
            aria-modal='true'
            aria-labelledby='error-modal-title'
        >
            <div
                className={`bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md border-t md:border ${config.borderColor} animate-in slide-in-from-bottom md:zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className='flex items-start justify-between p-4 md:p-5 border-b border-gray-100 dark:border-gray-700'>
                    <div className='flex items-center gap-3'>
                        <div className={`p-2 rounded-xl ${config.bgColor}`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        </div>
                        <h2
                            id='error-modal-title'
                            className='text-lg font-bold text-gray-900 dark:text-white'
                        >
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
                        aria-label='Close'
                    >
                        <X className='w-5 h-5 text-gray-500' />
                    </button>
                </div>

                {/* Content */}
                <div className='p-4 md:p-5'>
                    <p className='text-gray-600 dark:text-gray-300 leading-relaxed'>
                        {message}
                    </p>
                </div>

                {/* Footer - Full width buttons on mobile */}
                <div className='flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2 md:gap-3 p-4 md:p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl'>
                    <button
                        onClick={onClose}
                        className='w-full md:w-auto px-4 py-3 md:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors'
                    >
                        Dismiss
                    </button>
                    {onRetry && (
                        <button
                            onClick={() => {
                                onClose();
                                onRetry();
                            }}
                            className='w-full md:w-auto px-4 py-3 md:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2'
                        >
                            <RefreshCw className='w-4 h-4' />
                            {retryLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ErrorModal;
