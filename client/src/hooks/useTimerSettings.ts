import { useState, useEffect, useCallback } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface TimerSettings {
    studyDuration: number; // in seconds
    testDuration: number;
    restDuration: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
    studyDuration: 1500, // 25 minutes
    testDuration: 300,   // 5 minutes
    restDuration: 600,   // 10 minutes
};

export function useTimerSettings() {
    const { isAuthenticated } = useAuth();
    const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await axios.get('/users/timer-settings');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (res.data as any).data || res.data;
            setSettings({
                studyDuration: data.studyDuration ?? DEFAULT_SETTINGS.studyDuration,
                testDuration: data.testDuration ?? DEFAULT_SETTINGS.testDuration,
                restDuration: data.restDuration ?? DEFAULT_SETTINGS.restDuration,
            });
        } catch (err) {
            console.error('Failed to fetch timer settings:', err);
            setError('Failed to load timer settings');
            // Use defaults on error
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const updateSettings = useCallback(async (newSettings: Partial<TimerSettings>) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await axios.patch('/users/timer-settings', newSettings);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (res.data as any).data || res.data;
            setSettings({
                studyDuration: data.studyDuration ?? settings.studyDuration,
                testDuration: data.testDuration ?? settings.testDuration,
                restDuration: data.restDuration ?? settings.restDuration,
            });
            return true;
        } catch (err) {
            console.error('Failed to update timer settings:', err);
            setError('Failed to save timer settings');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [settings]);

    // Fetch on mount when authenticated
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        isLoading,
        error,
        updateSettings,
        refreshSettings: fetchSettings,
    };
}
