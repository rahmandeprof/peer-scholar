import React, { memo } from 'react';
import {
    FileText,
    Users,
    BookOpen,
    Heart,
    Search,
    FolderOpen,
    MessageSquare,
    Trophy,
} from 'lucide-react';

interface EmptyStateProps {
    type:
    | 'materials'
    | 'partners'
    | 'courses'
    | 'favorites'
    | 'search'
    | 'collections'
    | 'messages'
    | 'quizzes';
    title?: string;
    message?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const emptyStates = {
    materials: {
        icon: FileText,
        defaultTitle: 'No materials yet',
        defaultMessage: 'Upload your first study material to get started.',
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    partners: {
        icon: Users,
        defaultTitle: 'No study partners',
        defaultMessage: 'Invite a friend to study together and stay motivated.',
        color: 'text-purple-500',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    courses: {
        icon: BookOpen,
        defaultTitle: 'No courses found',
        defaultMessage: 'Courses for your department will appear here.',
        color: 'text-green-500',
        bg: 'bg-green-50 dark:bg-green-900/20',
    },
    favorites: {
        icon: Heart,
        defaultTitle: 'No favorites yet',
        defaultMessage: 'Materials you love will appear here.',
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-900/20',
    },
    search: {
        icon: Search,
        defaultTitle: 'No results found',
        defaultMessage: 'Try adjusting your search or filters.',
        color: 'text-gray-500',
        bg: 'bg-gray-50 dark:bg-gray-900/50',
    },
    collections: {
        icon: FolderOpen,
        defaultTitle: 'No collections',
        defaultMessage: 'Create a collection to organize your materials.',
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    messages: {
        icon: MessageSquare,
        defaultTitle: 'No messages',
        defaultMessage: 'Start a conversation with the AI assistant.',
        color: 'text-indigo-500',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    quizzes: {
        icon: Trophy,
        defaultTitle: 'No quiz history',
        defaultMessage: 'Complete a quiz to see your results here.',
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
};

export const EmptyState = memo<EmptyStateProps>(({
    type,
    title,
    message,
    action,
    className = '',
}) => {
    const config = emptyStates[type];
    const Icon = config.icon;

    return (
        <div
            className={`flex flex-col items-center justify-center py-12 px-6 rounded-xl ${config.bg} ${className}`}
        >
            <div className="relative mb-4">
                <div className="absolute inset-0 animate-ping opacity-20">
                    <Icon className={`w-16 h-16 ${config.color}`} />
                </div>
                <Icon className={`w-16 h-16 ${config.color} relative`} />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
                {title || config.defaultTitle}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
                {message || config.defaultMessage}
            </p>

            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
});
