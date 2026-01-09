// Backend-synced viewing history with localStorage fallback
// This syncs with GET/POST /users/viewing-history endpoints

import api from './api';

const VIEWING_HISTORY_KEY = 'peer-scholar-viewing-history';
const MAX_HISTORY_ITEMS = 10;

export interface ViewedMaterial {
    id: string;
    title: string;
    type: string;
    courseCode?: string;
    viewedAt: string;
    lastPage?: number;
    uploader?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    };
}

// ==================== Local Storage (Fallback) ====================

function getLocalHistory(): ViewedMaterial[] {
    try {
        const stored = localStorage.getItem(VIEWING_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveLocalHistory(history: ViewedMaterial[]): void {
    try {
        localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('Failed to save local viewing history:', error);
    }
}

// ==================== Backend Sync ====================

/**
 * Fetch viewing history from backend, with localStorage fallback
 */
export async function getViewingHistory(limit: number = 10): Promise<ViewedMaterial[]> {
    try {
        const res = await api.get(`/users/viewing-history?limit=${limit}`);
        const backendHistory = res.data.map((item: any) => ({
            ...item,
            viewedAt: item.viewedAt || new Date().toISOString(),
        }));

        // Update local cache with backend data
        saveLocalHistory(backendHistory);
        return backendHistory;
    } catch {
        // Fall back to localStorage if offline or error
        return getLocalHistory().slice(0, limit);
    }
}

/**
 * Get recently opened materials (wrapper for consistency)
 */
export function getRecentlyOpened(limit: number = 3): ViewedMaterial[] {
    // This is synchronous - returns cached localStorage data immediately
    // For async backend sync, use getViewingHistory()
    return getLocalHistory().slice(0, limit);
}

/**
 * Record a material view - syncs to backend with localStorage fallback
 */
export async function addToViewingHistory(
    material: Omit<ViewedMaterial, 'viewedAt'> & { viewedAt?: string }
): Promise<void> {
    const entry: ViewedMaterial = {
        ...material,
        viewedAt: material.viewedAt || new Date().toISOString(),
    };

    // Always save to localStorage first (for instant UI update)
    const history = getLocalHistory();
    const filtered = history.filter(m => m.id !== material.id);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    saveLocalHistory(updated);

    // Sync to backend (fire and forget)
    try {
        await api.post('/users/viewing-history', {
            materialId: material.id,
            lastPage: material.lastPage || 1,
        });
    } catch (error) {
        console.error('Failed to sync viewing history to backend:', error);
        // Not critical - localStorage has the data
    }
}

/**
 * Update the last page for a material in viewing history
 */
export async function updateViewingHistoryPage(materialId: string, page: number): Promise<void> {
    // Update localStorage
    const history = getLocalHistory();
    const updated = history.map(m =>
        m.id === materialId ? { ...m, lastPage: page, viewedAt: new Date().toISOString() } : m
    );
    saveLocalHistory(updated);

    // Sync to backend
    try {
        await api.post('/users/viewing-history', {
            materialId,
            lastPage: page,
        });
    } catch (error) {
        console.error('Failed to sync page update to backend:', error);
    }
}

/**
 * Remove a material from viewing history
 */
export async function removeFromViewingHistory(materialId: string): Promise<void> {
    // Update localStorage
    const history = getLocalHistory();
    const filtered = history.filter(m => m.id !== materialId);
    saveLocalHistory(filtered);

    // Sync to backend
    try {
        await api.delete(`/users/viewing-history/${materialId}`);
    } catch (error) {
        console.error('Failed to sync removal to backend:', error);
    }
}

/**
 * Sync localStorage history to backend (run on login/app start)
 * Fetches backend data and merges with local cache
 */
export async function syncViewingHistory(): Promise<void> {
    try {
        const backendHistory = await getViewingHistory(MAX_HISTORY_ITEMS);
        saveLocalHistory(backendHistory);
    } catch (error) {
        console.error('Failed to sync viewing history:', error);
    }
}
