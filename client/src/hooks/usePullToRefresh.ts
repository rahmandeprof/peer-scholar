import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number; // Distance to pull before triggering (default: 80px)
    disabled?: boolean;
}

interface UsePullToRefreshResult {
    pullDistance: number;
    isRefreshing: boolean;
    isPulling: boolean;
    bindEvents: {
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchMove: (e: React.TouchEvent) => void;
        onTouchEnd: () => void;
    };
}

/**
 * Hook for implementing pull-to-refresh gesture on mobile
 * 
 * Usage:
 * ```tsx
 * const { pullDistance, isRefreshing, isPulling, bindEvents } = usePullToRefresh({
 *   onRefresh: async () => { await fetchData(); }
 * });
 * 
 * return (
 *   <div {...bindEvents}>
 *     {isPulling && <PullIndicator distance={pullDistance} />}
 *     {content}
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
    onRefresh,
    threshold = 80,
    disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const startY = useRef(0);
    const currentY = useRef(0);
    const pulling = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;

        // Only start pull if at top of scroll container
        const target = e.currentTarget as HTMLElement;
        if (target.scrollTop > 0) return;

        startY.current = e.touches[0].clientY;
        pulling.current = true;
    }, [disabled, isRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!pulling.current || disabled || isRefreshing) return;

        currentY.current = e.touches[0].clientY;
        const distance = Math.max(0, currentY.current - startY.current);

        // Apply resistance - pull gets harder as you go
        const resistedDistance = Math.min(distance * 0.5, 150);

        if (resistedDistance > 0) {
            setIsPulling(true);
            setPullDistance(resistedDistance);
        }
    }, [disabled, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling.current) return;

        pulling.current = false;

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setIsPulling(false);
            setPullDistance(threshold); // Hold at threshold during refresh

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setIsPulling(false);
            setPullDistance(0);
        }
    }, [pullDistance, threshold, isRefreshing, onRefresh]);

    // Reset on disabled change
    useEffect(() => {
        if (disabled) {
            setPullDistance(0);
            setIsPulling(false);
            pulling.current = false;
        }
    }, [disabled]);

    return {
        pullDistance,
        isRefreshing,
        isPulling,
        bindEvents: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}
