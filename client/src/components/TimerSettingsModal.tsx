import { useState, useEffect } from 'react';
import { X, Clock, BookOpen, Brain, Coffee } from 'lucide-react';
import { useTimerSettings } from '../hooks/useTimerSettings';
import type { TimerSettings } from '../hooks/useTimerSettings';
import { useToast } from '../contexts/ToastContext';

interface TimerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TimerSettingsModal({ isOpen, onClose }: TimerSettingsModalProps) {
    const { settings, updateSettings, isLoading } = useTimerSettings();
    const { success, error: showError } = useToast();

    // Local state for form (in minutes for user-friendly input)
    const [studyMinutes, setStudyMinutes] = useState(25);
    const [testMinutes, setTestMinutes] = useState(5);
    const [restMinutes, setRestMinutes] = useState(10);

    // Sync with fetched settings
    useEffect(() => {
        setStudyMinutes(Math.round(settings.studyDuration / 60));
        setTestMinutes(Math.round(settings.testDuration / 60));
        setRestMinutes(Math.round(settings.restDuration / 60));
    }, [settings]);

    const handleSave = async () => {
        const newSettings: Partial<TimerSettings> = {
            studyDuration: studyMinutes * 60,
            testDuration: testMinutes * 60,
            restDuration: restMinutes * 60,
        };

        const success_result = await updateSettings(newSettings);
        if (success_result) {
            success('Timer settings saved!');
            onClose();
        } else {
            showError('Failed to save settings');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Mobile-first: slides up from bottom on mobile, centered on desktop */}
            <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-auto animate-slide-up sm:animate-fade-in">
                {/* Handle for mobile */}
                <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-3" />

                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                            <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Timer Settings
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customize your study, test, and rest durations to fit your learning style.
                    </p>

                    {/* Study Duration */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary-600" />
                            <label className="text-sm font-medium text-gray-900 dark:text-white">
                                Study Mode
                            </label>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="120"
                                value={studyMinutes}
                                onChange={(e) => setStudyMinutes(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                            <div className="w-20 text-right">
                                <span className="text-lg font-bold text-primary-600">{studyMinutes}</span>
                                <span className="text-sm text-gray-500 ml-1">min</span>
                            </div>
                        </div>
                    </div>

                    {/* Test Duration */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-orange-500" />
                            <label className="text-sm font-medium text-gray-900 dark:text-white">
                                Test Mode
                            </label>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="60"
                                value={testMinutes}
                                onChange={(e) => setTestMinutes(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                            <div className="w-20 text-right">
                                <span className="text-lg font-bold text-orange-500">{testMinutes}</span>
                                <span className="text-sm text-gray-500 ml-1">min</span>
                            </div>
                        </div>
                    </div>

                    {/* Rest Duration */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-blue-500" />
                            <label className="text-sm font-medium text-gray-900 dark:text-white">
                                Rest Break
                            </label>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="30"
                                value={restMinutes}
                                onChange={(e) => setRestMinutes(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="w-20 text-right">
                                <span className="text-lg font-bold text-blue-500">{restMinutes}</span>
                                <span className="text-sm text-gray-500 ml-1">min</span>
                            </div>
                        </div>
                    </div>

                    {/* Presets - Quick Select */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-500 mb-3">Quick presets</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setStudyMinutes(25); setTestMinutes(5); setRestMinutes(10); }}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            >
                                Classic (25/5/10)
                            </button>
                            <button
                                onClick={() => { setStudyMinutes(50); setTestMinutes(10); setRestMinutes(15); }}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            >
                                Extended (50/10/15)
                            </button>
                            <button
                                onClick={() => { setStudyMinutes(15); setTestMinutes(3); setRestMinutes(5); }}
                                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            >
                                Quick (15/3/5)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer - Sticky save button for mobile */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                    >
                        {isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
