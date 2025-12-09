import { memo } from 'react';
import { Brain, Layers, PenTool } from 'lucide-react';

interface QuickActionsGridProps {
    onQuiz: () => void;
    onFlashcards: () => void;
    onJotter: () => void;
}

export const QuickActionsGrid = memo<QuickActionsGridProps>(({
    onQuiz,
    onFlashcards,
    onJotter,
}) => {
    const actions = [
        { icon: Brain, label: 'Quiz', onClick: onQuiz, color: 'purple' },
        { icon: Layers, label: 'Cards', onClick: onFlashcards, color: 'indigo' },
        { icon: PenTool, label: 'Jotter', onClick: onJotter, color: 'yellow' },
    ];

    const colorClasses = {
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {actions.map(({ icon: Icon, label, onClick, color }) => (
                <button
                    key={label}
                    onClick={onClick}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg text-xs font-medium active:scale-95 transition-all touch-manipulation ${colorClasses[color as keyof typeof colorClasses]}`}
                >
                    <Icon className="w-5 h-5 mb-1" />
                    {label}
                </button>
            ))}
        </div>
    );
});

QuickActionsGrid.displayName = 'QuickActionsGrid';
