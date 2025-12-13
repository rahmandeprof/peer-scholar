import { useState, useEffect } from 'react';
import { X, Clock, BookOpen, Brain, Coffee } from 'lucide-react';
import { useTimerSettings } from '../hooks/useTimerSettings';
import type { TimerSettings } from '../hooks/useTimerSettings';
import { useToast } from '../contexts/ToastContext';
import { useModalBack } from '../hooks/useModalBack';

interface TimerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TimerSettingsModal({ isOpen, onClose }: TimerSettingsModalProps) {
    useModalBack(isOpen, onClose, 'timer-settings-modal');

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Always centered with consistent max-height */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col animate-modal-pop">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
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

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
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

                {/* Footer - Save button */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                    >
                        {isLoading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* Animation styles */}
            <style>{`
                @keyframes modal-pop {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-modal-pop { animation: modal-pop 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
}
