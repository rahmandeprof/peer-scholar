import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    disabled?: boolean;
    className?: string;
}

/**
 * Wrapper component that adds pull-to-refresh functionality
 * 
 * Usage:
 * ```tsx
 * <PullToRefresh onRefresh={handleRefresh}>
 *   <YourScrollableContent />
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
    children,
    onRefresh,
    disabled = false,
    className = '',
}: PullToRefreshProps) {
    const { pullDistance, isRefreshing, isPulling, bindEvents } = usePullToRefresh({
        onRefresh,
        disabled,
        threshold: 80,
    });

    const showIndicator = isPulling || isRefreshing;
    const progress = Math.min(pullDistance / 80, 1);
    const rotation = isRefreshing ? 'animate-spin' : '';

    return (
        <div className={`relative ${className}`} {...bindEvents}>
            {/* Pull indicator */}
            {showIndicator && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-transform"
                    style={{
                        top: Math.max(8, pullDistance - 40),
                        opacity: progress,
                        transform: `translateX(-50%) scale(${0.5 + progress * 0.5})`,
                    }}
                >
                    <div className={`
            p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700
            ${isRefreshing ? 'scale-110' : ''}
            transition-transform duration-200
          `}>
                        <RefreshCw
                            className={`w-5 h-5 text-primary-600 dark:text-primary-400 ${rotation}`}
                            style={{
                                transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Content with pull transform */}
            <div
                style={{
                    transform: isPulling ? `translateY(${pullDistance * 0.3}px)` : undefined,
                    transition: isPulling ? 'none' : 'transform 0.2s ease-out',
                }}
            >
                {children}
            </div>
        </div>
    );
}
