import { memo } from 'react';
import { Trophy, Shield } from 'lucide-react';
import { OptimizedImage } from '../OptimizedImage';

interface User {
    firstName?: string;
    lastName?: string;
    image?: string;
    reputation?: number;
    isVerified?: boolean;
}

interface ProfileHeaderProps {
    user: User;
}

export const ProfileHeader = memo<ProfileHeaderProps>(({ user }) => {
    const progressToNextLevel = ((user.reputation || 0) % 500) / 5;
    const currentLevel = Math.floor((user.reputation || 0) / 500) + 1;

    return (
        <div className="mb-6">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-3xl font-bold overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-lg">
                    {user.image ? (
                        <OptimizedImage
                            src={user.image}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span>
                            {(user.firstName?.[0] || '').toUpperCase()}
                            {(user.lastName?.[0] || '').toUpperCase()}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-center gap-4">
                {/* Reputation Badge */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center">
                    <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
                    <div className="min-w-0">
                        <div className="flex justify-between items-end mb-1">
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase tracking-wider">
                                Reputation
                            </p>
                            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300 ml-2">
                                {(user.reputation || 0) % 500} / 500 XP
                            </span>
                        </div>
                        <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300 leading-none mb-2">
                            {user.reputation || 0}
                        </p>
                        {/* Level Progress Bar */}
                        <div className="w-full h-1.5 bg-yellow-200 dark:bg-yellow-900/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressToNextLevel}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-yellow-600/80 dark:text-yellow-400/80 mt-1 text-right">
                            To Level {currentLevel}
                        </p>
                    </div>
                </div>

                {/* Verified Badge */}
                {user.isVerified && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center">
                        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">
                                Status
                            </p>
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                Verified
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';
