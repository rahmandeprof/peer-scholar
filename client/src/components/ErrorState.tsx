import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react';

interface ErrorStateProps {
    title?: string;
    message?: string;
    type?: 'error' | 'network' | 'empty' | 'server';
    onRetry?: () => void;
    className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title,
    message,
    type = 'error',
    onRetry,
    className = '',
}) => {
    const configs = {
        error: {
            icon: AlertTriangle,
            defaultTitle: 'Something went wrong',
            defaultMessage: 'We encountered an error. Please try again.',
            iconColor: 'text-red-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
        network: {
            icon: WifiOff,
            defaultTitle: 'No connection',
            defaultMessage: 'Please check your internet connection and try again.',
            iconColor: 'text-orange-500',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        },
        empty: {
            icon: AlertTriangle,
            defaultTitle: 'Nothing here yet',
            defaultMessage: 'This section is empty.',
            iconColor: 'text-gray-400',
            bgColor: 'bg-gray-50 dark:bg-gray-900/50',
        },
        server: {
            icon: ServerCrash,
            defaultTitle: 'Server error',
            defaultMessage: 'Our servers are having issues. Please try again later.',
            iconColor: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col items-center justify-center min-h-[200px] p-8 rounded-xl ${config.bgColor} ${className}`}
        >
            <div className="relative mb-4">
                <div
                    className={`p-4 rounded-full bg-white dark:bg-gray-800 shadow-lg`}
                >
                    <Icon className={`w-8 h-8 ${config.iconColor}`} />
                </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
                {title || config.defaultTitle}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-4">
                {message || config.defaultMessage}
            </p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </button>
            )}
        </div>
    );
};
