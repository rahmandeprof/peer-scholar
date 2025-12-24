/**
 * SWR (Stale-While-Revalidate) configuration for client-side caching.
 * 
 * This provides instant UI on page revisits with background revalidation.
 * Data is served from cache immediately, then updated in the background.
 */
import useSWR, { mutate } from 'swr';
import type { SWRConfiguration } from 'swr';
import api from './api';

// Default fetcher using our axios instance
export const fetcher = async <T>(url: string): Promise<T> => {
    const response = await api.get(url);
    return response.data;
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
    fetcher,
    revalidateOnFocus: false,        // Don't refetch when tab gains focus
    revalidateOnReconnect: true,     // Refetch on network reconnect
    dedupingInterval: 60000,         // Dedupe requests within 60s
    errorRetryCount: 3,              // Retry failed requests 3 times
    errorRetryInterval: 5000,        // Wait 5s between retries
    shouldRetryOnError: true,        // Retry on error
    revalidateIfStale: true,         // Revalidate when data is stale
};

// Cache key patterns for invalidation
export const CacheKeys = {
    MATERIALS: '/chat/materials',
    MATERIALS_FEATURED: '/materials/featured',
    USER_STATS: '/users/me/stats',
    LEADERBOARD: '/leaderboard',
    CONVERSATIONS: '/chat/history',
} as const;

// Invalidate cache for a specific key or pattern
export const invalidateCache = async (key: string | string[]) => {
    if (Array.isArray(key)) {
        await Promise.all(key.map(k => mutate(k)));
    } else {
        await mutate(key);
    }
};

// Invalidate all caches matching a pattern
export const invalidateCachePattern = async (pattern: RegExp) => {
    // This will trigger revalidation for all matching keys
    await mutate(
        (key: string) => typeof key === 'string' && pattern.test(key),
        undefined,
        { revalidate: true }
    );
};

// Re-export useSWR for convenience
export { useSWR, mutate };
