import { useState, useEffect } from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import api from '../lib/api';

interface Badge {
    id: string;
    badgeType: string;
    unlockedAt: string;
    info: {
        type: string;
        name: string;
        description: string;
        icon: string;
        color: string;
    };
}

interface BadgeDefinition {
    type: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface BadgesDisplayProps {
    compact?: boolean;
}

export function BadgesDisplay({ compact = false }: BadgesDisplayProps) {
    const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
    const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchBadges();
    }, []);

    const fetchBadges = async () => {
        try {
            const [earnedRes, defsRes] = await Promise.all([
                api.get('/badges/my'),
                api.get('/badges/definitions'),
            ]);
            setEarnedBadges(earnedRes.data);
            setAllBadges(defsRes.data);
        } catch (err) {
            console.error('Failed to fetch badges', err);
        } finally {
            setLoading(false);
        }
    };

    const earnedTypes = new Set(earnedBadges.map((b) => b.badgeType));
    const earnedCount = earnedBadges.length;
    const totalCount = allBadges.length;

    if (loading) {
        return (
            <div className='animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-24'></div>
        );
    }

    if (compact) {
        // Compact view - just show earned badges in a row
        return (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm'>
                <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center space-x-2'>
                        <Award className='w-5 h-5 text-amber-500' />
                        <h3 className='font-bold text-gray-900 dark:text-white'>Badges</h3>
                    </div>
                    <span className='text-sm text-gray-500'>
                        {earnedCount}/{totalCount}
                    </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                    {earnedBadges.length === 0 ? (
                        <p className='text-sm text-gray-500'>No badges earned yet. Keep studying!</p>
                    ) : (
                        earnedBadges.slice(0, 5).map((badge) => (
                            <div
                                key={badge.id}
                                className='group relative'
                                title={`${badge.info.name}: ${badge.info.description}`}
                            >
                                <div
                                    className='w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md transition-transform group-hover:scale-110'
                                    style={{ backgroundColor: `${badge.info.color}20`, boxShadow: `0 0 12px ${badge.info.color}40` }}
                                >
                                    {badge.info.icon}
                                </div>
                            </div>
                        ))
                    )}
                    {earnedBadges.length > 5 && (
                        <div className='w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300'>
                            +{earnedBadges.length - 5}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Full view - show all badges with earned/locked state
    return (
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm'>
            <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center space-x-3'>
                    <div className='p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl'>
                        <Award className='w-6 h-6 text-amber-500' />
                    </div>
                    <div>
                        <h3 className='font-bold text-lg text-gray-900 dark:text-white'>Achievements</h3>
                        <p className='text-sm text-gray-500'>
                            {earnedCount} of {totalCount} badges earned
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className='text-sm text-primary-600 hover:underline'
                >
                    {expanded ? 'Show less' : 'View all'}
                </button>
            </div>

            {/* Progress bar */}
            <div className='mb-6'>
                <div className='h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden'>
                    <div
                        className='h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500'
                        style={{ width: `${(earnedCount / totalCount) * 100}%` }}
                    />
                </div>
            </div>

            {/* Badge grid */}
            <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4'>
                {(expanded ? allBadges : allBadges.slice(0, 6)).map((badge) => {
                    const isEarned = earnedTypes.has(badge.type);
                    const earnedBadge = earnedBadges.find((b) => b.badgeType === badge.type);

                    return (
                        <div
                            key={badge.type}
                            className={`group relative flex flex-col items-center p-3 rounded-xl transition-all cursor-pointer ${isEarned
                                    ? 'bg-gradient-to-b from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 shadow-md hover:shadow-lg'
                                    : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'
                                }`}
                            title={badge.description}
                        >
                            {/* Badge icon */}
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 transition-transform group-hover:scale-110 ${isEarned ? 'animate-pulse' : ''
                                    }`}
                                style={{
                                    backgroundColor: isEarned ? `${badge.color}20` : 'transparent',
                                    boxShadow: isEarned ? `0 0 20px ${badge.color}30` : 'none',
                                }}
                            >
                                {isEarned ? (
                                    badge.icon
                                ) : (
                                    <Lock className='w-5 h-5 text-gray-400' />
                                )}
                            </div>

                            {/* Badge name */}
                            <span className='text-xs font-medium text-center text-gray-700 dark:text-gray-300 line-clamp-2'>
                                {badge.name}
                            </span>

                            {/* Sparkle effect for newly earned */}
                            {isEarned && earnedBadge && (
                                <div className='absolute -top-1 -right-1'>
                                    <Sparkles className='w-4 h-4 text-amber-400' />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
