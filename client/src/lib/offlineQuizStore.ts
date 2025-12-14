/**
 * Offline Quiz Store
 * 
 * IndexedDB-backed storage for:
 * - Caching quizzes for offline access
 * - Storing pending quiz results to sync when online
 * 
 * Uses auto-cache strategy with LRU eviction (max 10 quizzes)
 */

const DB_NAME = 'peertolearn-offline';
const DB_VERSION = 1;
const STORE_QUIZZES = 'cachedQuizzes';
const STORE_PENDING_RESULTS = 'pendingQuizResults';
const MAX_CACHED_QUIZZES = 10;

// Quiz question interface (matches QuizModal)
interface Question {
    id?: string;
    type?: string;
    question: string;
    options: string[];
    correctAnswer?: string;
    answer?: string;
    explanation?: string;
    hint?: string;
}

interface CachedQuiz {
    materialId: string;
    materialTitle: string;
    questions: Question[];
    cachedAt: number;
}

interface PendingQuizResult {
    id: string;
    materialId: string;
    score: number;
    totalQuestions: number;
    timestamp: number;
    synced: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open/create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open offline quiz database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Cached quizzes store
            if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
                const quizStore = db.createObjectStore(STORE_QUIZZES, { keyPath: 'materialId' });
                quizStore.createIndex('cachedAt', 'cachedAt', { unique: false });
            }

            // Pending results store
            if (!db.objectStoreNames.contains(STORE_PENDING_RESULTS)) {
                const resultStore = db.createObjectStore(STORE_PENDING_RESULTS, { keyPath: 'id' });
                resultStore.createIndex('synced', 'synced', { unique: false });
                resultStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });

    return dbPromise;
}

// ==================== Quiz Caching ====================

/**
 * Cache a quiz for offline access
 */
export async function cacheQuiz(
    materialId: string,
    questions: Question[],
    materialTitle: string = 'Untitled Quiz'
): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_QUIZZES, 'readwrite');
        const store = tx.objectStore(STORE_QUIZZES);

        const cachedQuiz: CachedQuiz = {
            materialId,
            materialTitle,
            questions,
            cachedAt: Date.now(),
        };

        store.put(cachedQuiz);
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        // Cleanup old quizzes if exceeding max
        await cleanupOldQuizzes();

        console.log(`Cached quiz for offline: ${materialTitle} (${questions.length} questions)`);
    } catch (error) {
        console.error('Failed to cache quiz:', error);
    }
}

/**
 * Get a cached quiz by material ID
 */
export async function getCachedQuiz(materialId: string): Promise<CachedQuiz | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_QUIZZES, 'readonly');
        const store = tx.objectStore(STORE_QUIZZES);

        return new Promise((resolve, reject) => {
            const request = store.get(materialId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to get cached quiz:', error);
        return null;
    }
}

/**
 * Get list of all cached quizzes
 */
export async function getCachedQuizList(): Promise<CachedQuiz[]> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_QUIZZES, 'readonly');
        const store = tx.objectStore(STORE_QUIZZES);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const quizzes = request.result || [];
                // Sort by cachedAt descending (most recent first)
                quizzes.sort((a, b) => b.cachedAt - a.cachedAt);
                resolve(quizzes);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to get cached quiz list:', error);
        return [];
    }
}

/**
 * Remove old quizzes using LRU eviction
 */
async function cleanupOldQuizzes(): Promise<void> {
    try {
        const quizzes = await getCachedQuizList();

        if (quizzes.length <= MAX_CACHED_QUIZZES) return;

        const db = await openDB();
        const tx = db.transaction(STORE_QUIZZES, 'readwrite');
        const store = tx.objectStore(STORE_QUIZZES);

        // Remove oldest quizzes (LRU)
        const toRemove = quizzes.slice(MAX_CACHED_QUIZZES);
        for (const quiz of toRemove) {
            store.delete(quiz.materialId);
        }

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        console.log(`Cleaned up ${toRemove.length} old cached quizzes`);
    } catch (error) {
        console.error('Failed to cleanup old quizzes:', error);
    }
}

/**
 * Delete a specific cached quiz
 */
export async function deleteCachedQuiz(materialId: string): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_QUIZZES, 'readwrite');
        const store = tx.objectStore(STORE_QUIZZES);
        store.delete(materialId);

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Failed to delete cached quiz:', error);
    }
}

// ==================== Pending Results ====================

/**
 * Save a quiz result locally (when offline)
 */
export async function savePendingResult(
    materialId: string,
    score: number,
    totalQuestions: number
): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_PENDING_RESULTS, 'readwrite');
        const store = tx.objectStore(STORE_PENDING_RESULTS);

        const result: PendingQuizResult = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            materialId,
            score,
            totalQuestions,
            timestamp: Date.now(),
            synced: false,
        };

        store.add(result);

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        console.log('Saved quiz result for offline sync');
    } catch (error) {
        console.error('Failed to save pending result:', error);
    }
}

/**
 * Get all unsynced pending results
 */
async function getUnsyncedResults(): Promise<PendingQuizResult[]> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_PENDING_RESULTS, 'readonly');
        const store = tx.objectStore(STORE_PENDING_RESULTS);
        const index = store.index('synced');

        return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(false));
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to get unsynced results:', error);
        return [];
    }
}

/**
 * Mark a result as synced
 */
async function markResultSynced(id: string): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_PENDING_RESULTS, 'readwrite');
        const store = tx.objectStore(STORE_PENDING_RESULTS);

        const request = store.get(id);
        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                result.synced = true;
                store.put(result);
            }
        };

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Failed to mark result synced:', error);
    }
}

/**
 * Sync all pending quiz results to the server
 */
export async function syncPendingQuizResults(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) {
        return { synced: 0, failed: 0 };
    }

    const pending = await getUnsyncedResults();
    if (pending.length === 0) {
        return { synced: 0, failed: 0 };
    }

    const token = localStorage.getItem('token');
    if (!token) {
        return { synced: 0, failed: pending.length };
    }

    let synced = 0;
    let failed = 0;

    for (const result of pending) {
        try {
            const response = await fetch('https://peerscholar.onrender.com/v1/chat/quiz/result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    materialId: result.materialId,
                    score: result.score,
                    totalQuestions: result.totalQuestions,
                }),
            });

            if (response.ok) {
                await markResultSynced(result.id);
                synced++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('Failed to sync quiz result:', error);
            failed++;
        }
    }

    // Cleanup old synced results (older than 7 days)
    await cleanupOldResults();

    return { synced, failed };
}

/**
 * Remove synced results older than 7 days
 */
async function cleanupOldResults(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_PENDING_RESULTS, 'readwrite');
        const store = tx.objectStore(STORE_PENDING_RESULTS);
        const index = store.index('timestamp');

        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const request = index.openCursor(IDBKeyRange.upperBound(sevenDaysAgo));
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                const value = cursor.value as PendingQuizResult;
                if (value.synced) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Failed to cleanup old results:', error);
    }
}

// ==================== Initialization ====================

/**
 * Initialize offline quiz sync
 * Call this on app startup
 */
export function initOfflineQuizSync(): void {
    // Sync when coming back online
    window.addEventListener('online', () => {
        console.log('Back online, syncing quiz results...');
        syncPendingQuizResults().then(result => {
            if (result.synced > 0) {
                console.log(`Synced ${result.synced} offline quiz results`);
            }
        });
    });

    // Initial sync if online
    if (navigator.onLine) {
        syncPendingQuizResults();
    }
}

/**
 * Check if quiz exists in cache
 */
export async function isQuizCached(materialId: string): Promise<boolean> {
    const cached = await getCachedQuiz(materialId);
    return cached !== null;
}

/**
 * Get count of pending (unsynced) quiz results
 */
export async function getPendingResultsCount(): Promise<number> {
    const pending = await getUnsyncedResults();
    return pending.length;
}
