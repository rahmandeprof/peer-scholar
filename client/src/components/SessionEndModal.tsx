import { useEffect, useRef } from 'react';
import { Trophy, BookOpen, ArrowRight } from 'lucide-react';

interface SessionEndModalProps {
  isOpen: boolean;
  onStartQuiz: () => void;
  onContinueReading: () => void;
}

export function SessionEndModal({
  isOpen,
  onStartQuiz,
  onContinueReading,
}: SessionEndModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
          Great Work! 25 Minutes Complete.
        </h2>

        <p className='text-gray-600 dark:text-gray-300 mb-8 leading-relaxed'>
          You've earned a break, but first—let's lock in what you just read with
          a 5-minute active recall session.
        </p>

        <div className='space-y-3'>
          <button
            onClick={onStartQuiz}
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
