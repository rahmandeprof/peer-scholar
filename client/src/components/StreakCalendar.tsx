import { useState, useEffect } from 'react';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import api from '../lib/api';

interface ActivityDay {
    date: string;
    minutes: number;
    sessions: number;
}

interface StreakCalendarProps {
    compact?: boolean;
}

export function StreakCalendar({ compact = false }: StreakCalendarProps) {
    const [activity, setActivity] = useState<ActivityDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await api.get('/study/activity/history');
                setActivity(res.data);
            } catch (error) {
                console.error('Failed to fetch activity:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    // Get intensity level (0-4) based on minutes studied
    const getIntensity = (minutes: number): number => {
        if (minutes === 0) return 0;
        if (minutes < 15) return 1;
        if (minutes < 30) return 2;
        if (minutes < 60) return 3;
        return 4;
    };

    // Get motivational message based on streak
    const getMotivationalMessage = (streak: number): string => {
        if (streak === 0) return "Start your streak today! 🚀";
        if (streak === 1) return "Great start! Keep going! 💪";
        if (streak < 3) return "Building momentum! 🔥";
        if (streak < 7) return "You're on fire! 🌟";
        if (streak < 14) return "Incredible dedication! 🏆";
        if (streak < 30) return "Unstoppable! 👑";
        return "Legendary streak! 🎖️";
    };

    // Get color class based on intensity
    const getColorClass = (intensity: number): string => {
        const colors = [
            'bg-gray-100 dark:bg-gray-800', // 0 - no activity
            'bg-green-200 dark:bg-green-900/50', // 1 - light
            'bg-green-300 dark:bg-green-700/60', // 2 - medium
            'bg-green-400 dark:bg-green-600/70', // 3 - good
            'bg-green-500 dark:bg-green-500', // 4 - great
        ];
        return colors[intensity] || colors[0];
    };

    // Calculate stats
    const totalDays = activity.filter((d) => d.minutes > 0).length;
    const totalMinutes = activity.reduce((acc, d) => acc + d.minutes, 0);
    const currentStreak = calculateCurrentStreak(activity);

    function calculateCurrentStreak(days: ActivityDay[]): number {
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const sortedDays = [...days].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        for (const day of sortedDays) {
            // Skip future dates
            if (day.date > today) continue;

            if (day.minutes > 0) {
                streak++;
            } else if (day.date !== today) {
                // Allow today to be empty (user might not have studied yet)
                break;
            }
        }
        return streak;
    }

    // Format date for tooltip
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    // Get day of week (0 = Sunday, 6 = Saturday) - for grid alignment
    const getDayOfWeek = (dateStr: string): number => {
        return new Date(dateStr).getDay();
    };

    if (loading) {
        return (
            <div className='animate-pulse'>
                <div className='h-24 bg-gray-100 dark:bg-gray-800 rounded-xl'></div>
            </div>
        );
    }

    if (compact) {
        // Compact inline view - just last 7 days
        const last7Days = activity.slice(-7);
        return (
            <div className='flex items-center gap-1'>
                {last7Days.map((day) => (
                    <div
                        key={day.date}
                        className={`w-3 h-3 rounded-sm ${getColorClass(getIntensity(day.minutes))} transition-all hover:scale-125`}
                        title={`${formatDate(day.date)}: ${day.minutes}m`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 md:p-6'>
            {/* Header */}
            <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                    <div className='p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl'>
                        <Flame className='w-5 h-5 text-orange-500' />
                    </div>
                    <div>
                        <h3 className='font-bold text-gray-900 dark:text-gray-100'>
                            Study Activity
                        </h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                            Last 30 days
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className='flex items-center gap-4 text-sm'>
                    <div className='text-center'>
                        <div className='font-bold text-orange-500'>{currentStreak}</div>
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            Streak
                        </div>
                    </div>
                    <div className='text-center'>
                        <div className='font-bold text-green-500'>{totalDays}</div>
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            Active
                        </div>
                    </div>
                    <div className='text-center hidden sm:block'>
                        <div className='font-bold text-primary-500'>
                            {Math.round(totalMinutes / 60)}h
                        </div>
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                            Total
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className='relative'>
                {/* Day labels */}
                <div className='hidden sm:flex flex-col gap-1 absolute -left-6 top-0 text-[10px] text-gray-400'>
                    <span className='h-3'>S</span>
                    <span className='h-3'>M</span>
                    <span className='h-3'>T</span>
                    <span className='h-3'>W</span>
                    <span className='h-3'>T</span>
                    <span className='h-3'>F</span>
                    <span className='h-3'>S</span>
                </div>

                {/* Activity Grid - organized by weeks */}
                <div className='flex gap-1 overflow-x-auto pb-2 scrollbar-thin'>
                    {/* Group days into weeks */}
                    {(() => {
                        const weeks: ActivityDay[][] = [];
                        let currentWeek: ActivityDay[] = [];

                        // Add empty cells for alignment at the start
                        if (activity.length > 0) {
                            const firstDayOfWeek = getDayOfWeek(activity[0].date);
                            for (let i = 0; i < firstDayOfWeek; i++) {
                                currentWeek.push({ date: '', minutes: 0, sessions: 0 });
                            }
                        }

                        activity.forEach((day) => {
                            currentWeek.push(day);
                            if (getDayOfWeek(day.date) === 6) {
                                weeks.push(currentWeek);
                                currentWeek = [];
                            }
                        });

                        if (currentWeek.length > 0) {
                            weeks.push(currentWeek);
                        }

                        return weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className='flex flex-col gap-1'>
                                {week.map((day, dayIndex) => (
                                    <div
                                        key={day.date || `empty-${weekIndex}-${dayIndex}`}
                                        className={`w-3 h-3 rounded-sm ${day.date
                                            ? getColorClass(getIntensity(day.minutes))
                                            : 'bg-transparent'
                                            } transition-all hover:scale-125 cursor-pointer relative ${hoveredDay?.date === day.date ? 'isolate z-[100]' : ''}`}
                                        onMouseEnter={() => day.date && setHoveredDay(day)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                    >
                                        {/* Tooltip */}
                                        {hoveredDay?.date === day.date && day.date && (
                                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[9999] pointer-events-none'>
                                                <div className='bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-gray-700 dark:border-gray-600'>
                                                    <div className='font-medium'>
                                                        {formatDate(day.date)}
                                                    </div>
                                                    <div className='text-gray-300'>
                                                        {day.minutes > 0
                                                            ? `${day.minutes}m • ${day.sessions} session${day.sessions !== 1 ? 's' : ''}`
                                                            : 'No activity'}
                                                    </div>
                                                </div>
                                                {/* Arrow pointer */}
                                                <div className='absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 border-r border-b border-gray-700 dark:border-gray-600'></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ));
                    })()}
                </div>

                {/* Legend */}
                <div className='flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400'>
                    <div className='flex items-center gap-1'>
                        <Calendar className='w-3 h-3' />
                        <span>Less</span>
                        {[0, 1, 2, 3, 4].map((intensity) => (
                            <div
                                key={intensity}
                                className={`w-3 h-3 rounded-sm ${getColorClass(intensity)}`}
                            />
                        ))}
                        <span>More</span>
                    </div>

                    <div className='hidden sm:flex items-center gap-1'>
                        <TrendingUp className='w-3 h-3' />
                        <span>{getMotivationalMessage(currentStreak)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
