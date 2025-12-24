/**
 * Custom API hooks with SWR caching.
 * 
 * These hooks provide stale-while-revalidate caching for frequently
 * accessed data, improving perceived performance on repeat visits.
 */
import { useSWR, CacheKeys, invalidateCache, fetcher } from '../lib/swr';
import type { SWRConfiguration } from 'swr';

// Types for API responses
interface Material {
    id: string;
    title: string;
    department: string;
    yearLevel: number;
    category: string;
    createdAt: string;
    isPublic: boolean;
    url: string;
    uploadedBy?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface UserStats {
    totalReadingTime: number;
    materialsRead: number;
    streak: number;
    lastReadAt: string | null;
}

interface LeaderboardEntry {
    id: string;
    firstName: string;
    lastName: string;
    points: number;
    rank: number;
}

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

// Hook configurations with appropriate TTLs
const shortCacheConfig: SWRConfiguration = {
    refreshInterval: 60000, // 1 minute
    dedupingInterval: 30000,
};

const mediumCacheConfig: SWRConfiguration = {
    refreshInterval: 300000, // 5 minutes
    dedupingInterval: 60000,
};

/**
 * Fetch community materials with caching
 * TTL: 5 minutes (materials don't change frequently)
 */
export function useMaterials() {
    const { data, error, isLoading, isValidating, mutate } = useSWR<Material[]>(
        CacheKeys.MATERIALS,
        fetcher,
        mediumCacheConfig
    );

    return {
        materials: data ?? [],
        isLoading,
        isValidating,
        error,
        refresh: () => mutate(),
    };
}

/**
 * Fetch user stats with shorter caching
 * TTL: 1 minute (personalized data, needs fresher updates)
 */
export function useUserStats(enabled = true) {
    const { data, error, isLoading, mutate } = useSWR<UserStats>(
        enabled ? CacheKeys.USER_STATS : null,
        fetcher,
        shortCacheConfig
    );

    return {
        stats: data,
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

/**
 * Fetch weekly leaderboard with medium caching
 * TTL: 2 minutes (shared data, slightly stale is okay)
 */
export function useLeaderboard(limit = 10) {
    const { data, error, isLoading } = useSWR<LeaderboardEntry[]>(
        `${CacheKeys.LEADERBOARD}?limit=${limit}`,
        fetcher,
        {
            refreshInterval: 120000, // 2 minutes
            dedupingInterval: 60000,
        }
    );

    return {
        leaderboard: data ?? [],
        isLoading,
        error,
    };
}

/**
 * Fetch chat conversations with caching
 * TTL: 1 minute
 */
export function useConversations(enabled = true) {
    const { data, error, isLoading, mutate } = useSWR<Conversation[]>(
        enabled ? CacheKeys.CONVERSATIONS : null,
        fetcher,
        shortCacheConfig
    );

    return {
        conversations: data ?? [],
        isLoading,
        error,
        refresh: () => mutate(),
    };
}

/**
 * Invalidate materials cache (call after upload/delete)
 */
export async function invalidateMaterialsCache() {
    await invalidateCache(CacheKeys.MATERIALS);
}

/**
 * Invalidate user stats cache (call after reading activity)
 */
export async function invalidateUserStatsCache() {
    await invalidateCache(CacheKeys.USER_STATS);
}

/**
 * Invalidate conversations cache (call after new conversation)
 */
export async function invalidateConversationsCache() {
    await invalidateCache(CacheKeys.CONVERSATIONS);
}
