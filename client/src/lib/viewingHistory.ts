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
    uploader?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    };
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

export function removeFromViewingHistory(materialId: string): void {
    try {
        const history = getViewingHistory();
        const filtered = history.filter(m => m.id !== materialId);
        localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Failed to remove from viewing history:', error);
    }
}

/**
 * Validate that materials in viewing history still exist.
 * Removes stale entries (deleted materials) without blocking UI.
 * Debounced to run at most once per 24 hours to avoid excessive API calls.
 * @param checkMaterialExists - async function that returns true if material exists
 */
const VALIDATION_CACHE_KEY = 'peer-scholar-validation-timestamp';
const VALIDATION_CACHE_HOURS = 24;

export async function validateAndCleanHistory(
    checkMaterialExists: (id: string) => Promise<boolean>
): Promise<void> {
    try {
        // Check if we've validated recently (within 24 hours)
        const lastValidated = localStorage.getItem(VALIDATION_CACHE_KEY);
        if (lastValidated) {
            const hoursSinceValidation = (Date.now() - parseInt(lastValidated, 10)) / (1000 * 60 * 60);
            if (hoursSinceValidation < VALIDATION_CACHE_HOURS) {
                return; // Skip validation, done recently
            }
        }

        const history = getViewingHistory();
        if (history.length === 0) {
            localStorage.setItem(VALIDATION_CACHE_KEY, Date.now().toString());
            return;
        }

        // Check all materials in parallel
        const validationResults = await Promise.all(
            history.map(async (material) => ({
                id: material.id,
                exists: await checkMaterialExists(material.id),
            }))
        );

        // Filter to only valid materials
        const validIds = new Set(
            validationResults.filter(r => r.exists).map(r => r.id)
        );
        const cleanedHistory = history.filter(m => validIds.has(m.id));

        // Only update if we removed something
        if (cleanedHistory.length < history.length) {
            localStorage.setItem(VIEWING_HISTORY_KEY, JSON.stringify(cleanedHistory));
            console.log(`Cleaned ${history.length - cleanedHistory.length} stale entries from viewing history`);
        }

        // Mark validation as complete
        localStorage.setItem(VALIDATION_CACHE_KEY, Date.now().toString());
    } catch (error) {
        // Fail silently - this is a background cleanup
        console.warn('Failed to validate viewing history:', error);
    }
}

export function clearViewingHistory(): void {
    localStorage.removeItem(VIEWING_HISTORY_KEY);
}
