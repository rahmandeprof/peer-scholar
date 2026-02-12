import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Snowflake, X, RefreshCw, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../lib/api';

interface StreakRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: {
    currentStreak: number;
    missedDays: number;
    streakFreezes: number;
  };
  onRestoreSuccess: (newStreakData: any) => void;
  onDecline: () => void;
}

export const StreakRestoreModal: React.FC<StreakRestoreModalProps> = ({
  isOpen,
  onClose,
  streakData,
  onRestoreSuccess,
  onDecline,
}) => {
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await api.post('/study/streak/restore');

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F97316', '#3B82F6', '#10B981'],
      });

      onRestoreSuccess(res.data);
      onClose();
    } catch (error) {
      console.error('Failed to restore streak', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await api.post('/study/streak/decline');
      onDecline();
      onClose();
    } catch (error) {
      console.error('Failed to decline streak restore', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden'
          >
            {/* Header with Fire Animation */}
            <div className='relative h-32 bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center overflow-hidden'>
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
              <div className='absolute top-0 w-full h-full bg-gradient-to-b from-transparent to-zinc-900' />

              <div className='relative z-10 flex flex-col items-center'>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className='bg-orange-500/20 p-4 rounded-full backdrop-blur-md border border-orange-500/30 mb-2'
                >
                  <Flame className='w-10 h-10 text-orange-500 fill-orange-500' />
                </motion.div>
                <div className='text-3xl font-bold text-white flex items-center gap-2'>
                  {streakData.currentStreak} Day Streak
                </div>
              </div>
            </div>

            <div className='p-6'>
              <div className='text-center mb-6'>
                <h3 className='text-xl font-bold text-white mb-2'>
                  Your streak is at risk! 😱
                </h3>
                <p className='text-zinc-400'>
                  You missed{' '}
                  <strong>
                    {streakData.missedDays}{' '}
                    {streakData.missedDays === 1 ? 'day' : 'days'}
                  </strong>{' '}
                  of study. Use your streak freezes to save your progress?
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className='bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-700/50'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-zinc-400'>
                    Streak Freezes Available:
                  </span>
                  <div className='flex items-center gap-1.5 text-blue-400 font-medium bg-blue-400/10 px-2 py-1 rounded-lg'>
                    <Snowflake className='w-4 h-4' />
                    {streakData.streakFreezes}
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <span className='text-zinc-400'>Freezes Needed:</span>
                  <div className='flex items-center gap-1.5 text-orange-400 font-medium bg-orange-400/10 px-2 py-1 rounded-lg'>
                    <Snowflake className='w-4 h-4' />-{streakData.missedDays}
                  </div>
                </div>

                <div className='h-px bg-zinc-700 my-3' />

                <div className='flex items-center justify-between text-sm'>
                  <span className='text-zinc-500'>
                    Remaining after restore:
                  </span>
                  <span className='text-white font-medium'>
                    {streakData.streakFreezes - streakData.missedDays}
                  </span>
                </div>
              </div>

              <div className='flex flex-col gap-3'>
                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className='w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 group'
                >
                  {loading ? (
                    <RefreshCw className='w-5 h-5 animate-spin' />
                  ) : (
                    <>
                      <Snowflake className='w-5 h-5' />
                      Use {streakData.missedDays} Freeze
                      {streakData.missedDays > 1 ? 's' : ''} to Restore
                      <ChevronRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                    </>
                  )}
                </button>

                <button
                  onClick={handleDecline}
                  disabled={loading}
                  className='w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2'
                >
                  <X className='w-4 h-4' />
                  Let it go (Start fresh)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
