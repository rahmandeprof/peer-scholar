import { memo } from 'react';
import { Wifi, Zap, Moon, Sun } from 'lucide-react';

interface NetworkPreferences {
    highQualityImages: boolean;
    autoPlayVideos: boolean;
}

interface DataUsageSettingsProps {
    preferences: NetworkPreferences;
    updatePreferences: (prefs: Partial<NetworkPreferences>) => void;
    connectionType: string;
    isLowBandwidth: boolean;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isStandalone: boolean;
    isIOS: boolean;
    onInstallClick: () => void;
}

export const DataUsageSettings = memo<DataUsageSettingsProps>(({
    preferences,
    updatePreferences,
    connectionType,
    isLowBandwidth,
    theme,
    toggleTheme,
    isStandalone,
    onInstallClick,
}) => {
    return (
        <div className="space-y-6">
            {/* Network Status Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center mb-2">
                    <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Current Network
                    </h3>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                    Connection Type:{' '}
                    <span className="font-bold uppercase">{connectionType}</span>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    Status:{' '}
                    <span className="font-bold">
                        {isLowBandwidth ? 'Low Bandwidth Mode ⚡' : 'Standard Mode'}
                    </span>
                </p>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Preferences
                </h3>

                {/* High Quality Images Toggle */}
                <SettingToggle
                    icon={<Zap className="w-5 h-5 text-yellow-500" />}
                    title="High Quality Images"
                    description="Always load HD images (uses more data)"
                    checked={preferences.highQualityImages}
                    onChange={(checked) => updatePreferences({ highQualityImages: checked })}
                />

                {/* Auto-play Videos Toggle */}
                <SettingToggle
                    icon={<span className="text-lg">▶️</span>}
                    title="Auto-play Videos"
                    description="Automatically play videos when loaded"
                    checked={preferences.autoPlayVideos}
                    onChange={(checked) => updatePreferences({ autoPlayVideos: checked })}
                />

                {/* Dark Mode Toggle */}
                <SettingToggle
                    icon={theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-blue-400" />
                    ) : (
                        <Sun className="w-5 h-5 text-orange-400" />
                    )}
                    title="Dark Mode"
                    description={theme === 'dark' ? 'On' : 'Off'}
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                />

                {/* Install App */}
                {!isStandalone && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-center">
                            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                                <span className="text-lg">📱</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Install App
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Add to home screen for offline access
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onInstallClick}
                            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors active:scale-95 touch-manipulation"
                        >
                            Install
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

DataUsageSettings.displayName = 'DataUsageSettings';

// Internal Toggle Component
interface SettingToggleProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const SettingToggle = memo<SettingToggleProps>(({ icon, title, description, checked, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center">
            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                </p>
            </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer touch-manipulation">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
        </label>
    </div>
));

SettingToggle.displayName = 'SettingToggle';
