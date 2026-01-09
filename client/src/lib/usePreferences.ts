import { useState, useEffect, useCallback } from 'react';
import api from './api';

// LocalStorage key for offline/fast access
const LOCAL_PREFS_KEY = 'peer-scholar-preferences';

/**
 * User preferences hook with localStorage caching + backend sync
 * Provides instant local reads with async backend persistence
 */
export function usePreferences() {
    const [preferences, setPreferences] = useState<Record<string, any>>(() => {
        // Initialize from localStorage
        try {
            const stored = localStorage.getItem(LOCAL_PREFS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const [synced, setSynced] = useState(false);

    // Sync from backend on mount
    useEffect(() => {
        async function syncFromBackend() {
            try {
                const res = await api.get('/users/preferences');
                const backendPrefs = res.data || {};

                // Merge backend with local (backend takes precedence)
                setPreferences(prev => {
                    const merged = { ...prev, ...backendPrefs };
                    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(merged));
                    return merged;
                });
                setSynced(true);
            } catch (error) {
                console.error('Failed to sync preferences:', error);
                // Keep using local prefs
            }
        }
        syncFromBackend();
    }, []);

    /**
     * Get a preference value
     */
    const get = useCallback((key: string, defaultValue: any = null) => {
        return preferences[key] ?? defaultValue;
    }, [preferences]);

    /**
     * Set a preference value (updates local + syncs to backend)
     */
    const set = useCallback(async (key: string, value: any) => {
        // Optimistic local update
        setPreferences(prev => {
            const updated = { ...prev, [key]: value };
            localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(updated));
            return updated;
        });

        // Sync to backend (fire and forget)
        try {
            await api.patch('/users/preferences', { [key]: value });
        } catch (error) {
            console.error('Failed to save preference to backend:', error);
        }
    }, []);

    /**
     * Set multiple preferences at once
     */
    const setMultiple = useCallback(async (updates: Record<string, any>) => {
        // Optimistic local update
        setPreferences(prev => {
            const updated = { ...prev, ...updates };
            localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(updated));
            return updated;
        });

        // Sync to backend
        try {
            await api.patch('/users/preferences', updates);
        } catch (error) {
            console.error('Failed to save preferences to backend:', error);
        }
    }, []);

    return {
        preferences,
        get,
        set,
        setMultiple,
        synced,
    };
}

// Common preference keys for type safety
export const PREF_KEYS = {
    HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
    PWA_PROMPT_DISMISSED: 'pwaPromptDismissed',
    HAS_SEEN_FLASHCARD_SPOTLIGHT: 'hasSeenFlashcardSpotlight',
    THEME_PREFERENCE: 'themePreference',
} as const;
