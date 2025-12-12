/**
 * Offline Reading Tracker
 * 
 * Stores reading sessions locally (IndexedDB/localStorage) when offline
 * and syncs them to the server when back online.
 */

const STORAGE_KEY = 'offlineReadingSessions';
const SYNC_INTERVAL = 30000; // 30 seconds

interface OfflineSession {
    id: string;
    materialId: string;
    durationSeconds: number;
    timestamp: number;
    synced: boolean;
}

/**
 * Get all offline sessions from localStorage
 */
export function getOfflineSessions(): OfflineSession[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save sessions to localStorage
 */
function saveSessions(sessions: OfflineSession[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
        console.error('Failed to save offline sessions:', e);
    }
}

/**
 * Add a new offline reading session
 */
export function addOfflineSession(materialId: string, durationSeconds: number): void {
    const sessions = getOfflineSessions();
    const newSession: OfflineSession = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        materialId,
        durationSeconds,
        timestamp: Date.now(),
        synced: false,
    };
    sessions.push(newSession);
    saveSessions(sessions);

    // Try to sync immediately if online
    if (navigator.onLine) {
        syncOfflineSessions();
    }
}

/**
 * Accumulate reading time for a material (used for continuous tracking)
 */
export function accumulateReadingTime(materialId: string, secondsToAdd: number): void {
    const sessions = getOfflineSessions();

    // Find existing unsync'd session for this material from last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const existingIndex = sessions.findIndex(
        s => s.materialId === materialId && !s.synced && s.timestamp > oneHourAgo
    );

    if (existingIndex >= 0) {
        // Accumulate time to existing session
        sessions[existingIndex].durationSeconds += secondsToAdd;
        sessions[existingIndex].timestamp = Date.now();
    } else {
        // Create new session
        sessions.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            materialId,
            durationSeconds: secondsToAdd,
            timestamp: Date.now(),
            synced: false,
        });
    }

    saveSessions(sessions);
}

/**
 * Sync all unsynced sessions to the server
 */
export async function syncOfflineSessions(): Promise<{ synced: number; failed: number }> {
    if (!navigator.onLine) {
        return { synced: 0, failed: 0 };
    }

    const sessions = getOfflineSessions();
    const unsynced = sessions.filter(s => !s.synced);

    if (unsynced.length === 0) {
        return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
        return { synced: 0, failed: unsynced.length };
    }

    for (const session of unsynced) {
        try {
            const response = await fetch('https://peerscholar.onrender.com/api/v1/study/reading/offline-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    materialId: session.materialId,
                    durationSeconds: session.durationSeconds,
                    timestamp: session.timestamp,
                }),
            });

            if (response.ok) {
                // Mark as synced
                session.synced = true;
                synced++;
            } else {
                failed++;
            }
        } catch (e) {
            console.error('Failed to sync session:', e);
            failed++;
        }
    }

    // Update storage with synced status
    saveSessions(sessions);

    // Clean up old synced sessions (older than 7 days)
    cleanupOldSessions();

    return { synced, failed };
}

/**
 * Remove synced sessions older than 7 days
 */
function cleanupOldSessions(): void {
    const sessions = getOfflineSessions();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => !s.synced || s.timestamp > sevenDaysAgo);
    saveSessions(filtered);
}

/**
 * Get total unsynced reading time in seconds
 */
export function getUnsyncedReadingTime(): number {
    const sessions = getOfflineSessions();
    return sessions
        .filter(s => !s.synced)
        .reduce((total, s) => total + s.durationSeconds, 0);
}

/**
 * Initialize sync on page load and when coming back online
 */
export function initOfflineSync(): void {
    // Sync when coming back online
    window.addEventListener('online', () => {
        console.log('Back online, syncing reading sessions...');
        syncOfflineSessions().then(result => {
            if (result.synced > 0) {
                console.log(`Synced ${result.synced} offline reading sessions`);
            }
        });
    });

    // Periodic sync when online
    setInterval(() => {
        if (navigator.onLine) {
            syncOfflineSessions();
        }
    }, SYNC_INTERVAL);

    // Initial sync
    if (navigator.onLine) {
        syncOfflineSessions();
    }
}

/**
 * Check if currently offline
 */
export function isOffline(): boolean {
    return !navigator.onLine;
}
