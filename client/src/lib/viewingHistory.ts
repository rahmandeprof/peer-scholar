// Utility for tracking recently viewed materials in localStorage

const VIEWING_HISTORY_KEY = 'peer-scholar-viewing-history';
const MAX_HISTORY_ITEMS = 10;

export interface ViewedMaterial {
    id: string;
    title: string;
    type: string;
    courseCode?: string;
    viewedAt: string;
    lastPage?: number;
}

export function getViewingHistory(): ViewedMaterial[] {
    try {
        const stored = localStorage.getItem(VIEWING_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addToViewingHistory(material: Omit<ViewedMaterial, 'viewedAt'> & { viewedAt?: string }): void {
    try {
        const history = getViewingHistory();

        // Remove existing entry for this material (if any) to avoid duplicates
        const filtered = history.filter(m => m.id !== material.id);

        // Add the new entry at the start
        const newEntry: ViewedMaterial = {
            ...material,
            viewedAt: material.viewedAt || new Date().toISOString(),
        };

        const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to save viewing history:', error);
    }
}

export function updateViewingHistoryPage(materialId: string, page: number): void {
    try {
        const history = getViewingHistory();
        const updated = history.map(m =>
            m.id === materialId ? { ...m, lastPage: page, viewedAt: new Date().toISOString() } : m
        );
        localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to update viewing history page:', error);
    }
}

export function getRecentlyOpened(limit: number = 3): ViewedMaterial[] {
    return getViewingHistory().slice(0, limit);
}

export function clearViewingHistory(): void {
    localStorage.removeItem(VIEWING_HISTORY_KEY);
}
