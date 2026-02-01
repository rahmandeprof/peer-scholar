/**
 * SWR (Stale-While-Revalidate) configuration for client-side caching.
 *
 * This provides instant UI on page revisits with background revalidation.
 * Data is served from cache immediately, then updated in the background.
 *
 * Now with offline persistence via IndexedDB.
 */
import useSWR, { mutate } from 'swr';
import type { SWRConfiguration, Middleware } from 'swr';
import api from './api';
import {
  saveToCache,
  getFromCacheStale,
  type CacheKey,
} from './offlineStorage';

// Map API endpoints to cache keys
const ENDPOINT_TO_CACHE_KEY: Record<string, CacheKey> = {
  '/users/me': 'user_profile',
  '/study/insights': 'study_insights',
  '/study/streak': 'study_insights',
  '/materials/recent': 'recent_materials',
  '/materials/favorites': 'favorite_materials',
  '/academic/courses': 'courses',
};

// Default fetcher using our axios instance
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await api.get(url);
  return response.data;
};

/**
 * Offline persistence middleware for SWR
 * - Saves successful responses to IndexedDB
 * - Returns cached data when offline or on error
 */
export const offlineMiddleware: Middleware = (useSWRNext) => {
  return (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);

    // Only process string keys that match our cached endpoints
    const cacheKey =
      typeof key === 'string' ? ENDPOINT_TO_CACHE_KEY[key] : null;

    // Save successful data to offline cache
    if (cacheKey && swr.data && !swr.error) {
      saveToCache(cacheKey, swr.data).catch(() => {
        // Silently fail - offline cache is optional
      });
    }

    return swr;
  };
};

/**
 * Hook to get data with offline fallback
 * Falls back to stale cached data when offline
 */
export function useOfflineData<T>(
  key: string,
  swrData: T | undefined,
  isOnline: boolean,
): T | undefined {
  const [offlineData, setOfflineData] = useState<T | undefined>(undefined);
  const cacheKey = ENDPOINT_TO_CACHE_KEY[key];

  useEffect(() => {
    if (!isOnline && cacheKey && !swrData) {
      getFromCacheStale<T>(cacheKey).then((cached) => {
        if (cached) setOfflineData(cached);
      });
    }
  }, [isOnline, cacheKey, swrData]);

  return swrData ?? offlineData;
}

import { useState, useEffect } from 'react';

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  use: [offlineMiddleware],
  revalidateOnFocus: false, // Don't refetch when tab gains focus
  revalidateOnReconnect: true, // Refetch on network reconnect
  dedupingInterval: 60000, // Dedupe requests within 60s
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 5000, // Wait 5s between retries
  shouldRetryOnError: true, // Retry on error
  revalidateIfStale: true, // Revalidate when data is stale
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    // Don't retry on 404 or 401
    if (error?.response?.status === 404 || error?.response?.status === 401)
      return;

    // Only retry up to 3 times
    if (retryCount >= 3) return;

    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000);
  },
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
    await Promise.all(key.map((k) => mutate(k)));
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
    { revalidate: true },
  );
};

// Re-export useSWR for convenience
export { useSWR, mutate };
