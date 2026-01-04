import { lazy, type ComponentType } from 'react';

/**
 * Wrapper around React.lazy that handles chunk load failures gracefully.
 * 
 * When a user has a stale version of the app (old main.js trying to load
 * new chunks that don't exist), the dynamic import fails. This wrapper:
 * 
 * 1. Catches the chunk load error
 * 2. Attempts a retry after a brief delay
 * 3. If retry fails, triggers a page reload (with loop prevention)
 * 
 * This prevents the "Oops! Something went wrong" error after deploys.
 */

const RELOAD_KEY = 'ptl_chunk_reload_attempted';
const RELOAD_THRESHOLD_MS = 10000; // 10 seconds - prevent reload loop

interface ChunkLoadError extends Error {
    name: 'ChunkLoadError';
}

function isChunkLoadError(error: unknown): error is ChunkLoadError {
    return (
        error instanceof Error &&
        (error.name === 'ChunkLoadError' ||
            error.message.includes('Loading chunk') ||
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Unable to preload CSS'))
    );
}

/**
 * Lazy load a component with automatic retry and reload on chunk failure.
 * 
 * @param importFn - Dynamic import function, e.g. () => import('./MyComponent')
 * @param retries - Number of retries before triggering reload (default: 1)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    retries = 1
) {
    return lazy(async () => {
        try {
            return await importFn();
        } catch (error) {
            // Check if this is a chunk loading error
            if (isChunkLoadError(error)) {
                console.warn('[lazyWithRetry] Chunk load failed, attempting retry...', error);

                // Try again after a brief delay
                for (let i = 0; i < retries; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    try {
                        return await importFn();
                    } catch (retryError) {
                        console.warn(`[lazyWithRetry] Retry ${i + 1} failed`, retryError);
                    }
                }

                // All retries failed - check if we should reload
                const lastReload = sessionStorage.getItem(RELOAD_KEY);
                const now = Date.now();

                if (!lastReload || now - parseInt(lastReload, 10) > RELOAD_THRESHOLD_MS) {
                    console.warn('[lazyWithRetry] Triggering page reload to get fresh chunks...');
                    sessionStorage.setItem(RELOAD_KEY, now.toString());

                    // Clear service worker cache before reload
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }

                    // Force a hard reload
                    window.location.reload();
                }
            }

            // Re-throw for ErrorBoundary to catch if reload didn't happen
            throw error;
        }
    });
}

/**
 * Alternative: Lazy load with named export support.
 * 
 * Usage: lazyWithRetryNamed(() => import('./MyComponent'), 'MyComponent')
 */
export function lazyWithRetryNamed<T extends ComponentType<any>>(
    importFn: () => Promise<Record<string, T>>,
    exportName: string,
    retries = 1
) {
    return lazyWithRetry(
        () => importFn().then(module => ({ default: module[exportName] })),
        retries
    );
}
