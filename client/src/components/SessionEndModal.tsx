import { useEffect, useRef, useState } from 'react';
import { Trophy, BookOpen, ArrowRight } from 'lucide-react';

interface SessionEndModalProps {
  isOpen: boolean;
  onStartQuiz: (pageLimit?: number) => void;
  onContinueReading: () => void;
}

export function SessionEndModal({
  isOpen,
  onStartQuiz,
  onContinueReading,
}: SessionEndModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pageLimit, setPageLimit] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Play sound
      if (audioRef.current) {
        audioRef.current
          .play()
          .catch((e) => console.log('Audio play failed', e));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300'>
      <audio
        ref={audioRef}
        src='https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
        preload='auto'
      />
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-200 dark:border-gray-700 transform transition-all scale-100'>
        <div className='w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6'>
          <Trophy className='w-8 h-8 text-purple-600 dark:text-purple-400' />
        </div>

        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-3'>
          Great Work! Session Complete.
        </h2>

        <p className='text-gray-600 dark:text-gray-300 mb-6 leading-relaxed'>
          You've earned a break, but first—let's lock in what you just read with
          a 5-minute active recall session.
        </p>

        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Which page did you reach? (Optional)
          </label>
          <input
            type='number'
            value={pageLimit}
            onChange={(e) => setPageLimit(e.target.value)}
            placeholder='e.g. 10'
            className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none'
          />
          <p className='text-xs text-gray-500 mt-1'>
            We'll limit the quiz to content up to this page.
          </p>
        </div>

        <div className='space-y-3'>
          <button
            onClick={() => onStartQuiz(pageLimit ? parseInt(pageLimit) : undefined)}
            className='w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 transition-all flex items-center justify-center'
          >
            <BookOpen className='w-5 h-5 mr-2' />
            Start 5-Minute Quiz
          </button>

          <button
            onClick={onContinueReading}
            className='w-full py-3 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl font-medium transition-colors flex items-center justify-center'
          >
            Continue Reading
            <ArrowRight className='w-4 h-4 ml-2' />
          </button>
        </div>
      </div>
    </div>
  );
}
