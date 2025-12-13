import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, User, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    firstName: string;
    image: string | null;
    totalMinutes: number;
    isCurrentUser: boolean;
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[];
    currentUser: {
        rank: number;
        totalMinutes: number;
    } | null;
}

export function WeeklyLeaderboard() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Check if user has opted out of leaderboard
    const userOptedOut = (user as any)?.showOnLeaderboard === false;

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await api.get('/study/leaderboard');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch leaderboard', err);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className='w-5 h-5 text-amber-400' />;
            case 2:
                return <Medal className='w-5 h-5 text-gray-400' />;
            case 3:
                return <Medal className='w-5 h-5 text-amber-600' />;
            default:
                return <span className='w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500'>#{rank}</span>;
        }
    };

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    if (loading) {
        return (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm'>
                <div className='animate-pulse space-y-4'>
                    <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3'></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className='h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl'></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data || data.leaderboard.length === 0) {
        return (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm'>
                <div className='flex items-center space-x-3 mb-4'>
                    <div className='p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl'>
                        <Trophy className='w-5 h-5 text-amber-500' />
                    </div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>Weekly Leaderboard</h3>
                </div>
                <p className='text-sm text-gray-500 text-center py-8'>
                    No study activity this week yet. Be the first on the board! 🎯
                </p>
            </div>
        );
    }

    return (
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm'>
            {/* Header */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20'>
                        <Trophy className='w-5 h-5 text-white' />
                    </div>
                    <div>
                        <h3 className='font-bold text-gray-900 dark:text-white'>Weekly Leaderboard</h3>
                        <p className='text-xs text-gray-500'>Your department's top students</p>
                    </div>
                </div>
                <div className='flex items-center text-xs text-gray-500'>
                    <TrendingUp className='w-3 h-3 mr-1' />
                    This week
                </div>
            </div>

            {/* Leaderboard List */}
            <div className='space-y-2'>
                {data.leaderboard.slice(0, 5).map((entry, index) => (
                    <div
                        key={entry.userId}
                        className={`flex items-center p-3 rounded-xl transition-all ${entry.isCurrentUser
                            ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-700'
                            : index === 0
                                ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10'
                                : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {/* Rank */}
                        <div className='w-8 flex-shrink-0'>
                            {getRankIcon(entry.rank)}
                        </div>

                        {/* Avatar */}
                        <div className='w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold mr-3 overflow-hidden'>
                            {entry.image ? (
                                <img src={entry.image} alt='' className='w-full h-full object-cover' />
                            ) : (
                                entry.firstName?.charAt(0) || <User className='w-4 h-4' />
                            )}
                        </div>

                        {/* Name */}
                        <div className='flex-1 min-w-0'>
                            <p className={`font-medium truncate ${entry.isCurrentUser ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'
                                }`}>
                                {entry.firstName}
                                {entry.isCurrentUser && <span className='text-xs ml-1'>(You)</span>}
                            </p>
                        </div>

                        {/* Time */}
                        <div className={`font-bold ${index === 0 ? 'text-amber-600' : entry.isCurrentUser ? 'text-primary-600' : 'text-gray-600 dark:text-gray-300'
                            }`}>
                            {formatTime(entry.totalMinutes)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Current user not in top 5 */}
            {data.currentUser && data.currentUser.rank > 5 && (
                <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700'>
                        <div className='w-8 flex-shrink-0 text-sm font-bold text-gray-500'>
                            #{data.currentUser.rank}
                        </div>
                        <div className='flex-1'>
                            <p className='font-medium text-primary-700 dark:text-primary-300'>Your Position</p>
                        </div>
                        <div className='font-bold text-primary-600'>
                            {formatTime(data.currentUser.totalMinutes)}
                        </div>
                    </div>
                </div>
            )}

            {/* Opted-out notice */}
            {userOptedOut && (
                <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm'>
                        <EyeOff className='w-4 h-4 flex-shrink-0' />
                        <span>You've opted out of rankings. Change this in <span className='font-medium'>Profile → Privacy Settings</span>.</span>
                    </div>
                </div>
            )}
        </div>
    );
}

