import { memo } from 'react';

type TabType = 'profile' | 'quizzes' | 'data';

interface ProfileTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string }[] = [
    { id: 'profile', label: 'Profile Details' },
    { id: 'quizzes', label: 'Quiz History' },
    { id: 'data', label: 'Data Usage' },
];

export const ProfileTabs = memo<ProfileTabsProps>(({ activeTab, onTabChange }) => {
    return (
        <div className="flex border-b border-gray-100 dark:border-gray-800">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative touch-manipulation ${activeTab === tab.id
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800'
                        }`}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full" />
                    )}
                </button>
            ))}
        </div>
    );
});

ProfileTabs.displayName = 'ProfileTabs';
