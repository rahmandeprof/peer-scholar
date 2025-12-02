import React, { useState, useEffect } from 'react';
import { Loader2, GraduationCap } from 'lucide-react';

const LOADING_MESSAGES = [
  'Gathering knowledge...',
  'Consulting the archives...',
  'Preparing your study materials...',
  'Connecting with the scholar network...',
  'Sharpening pencils...',
];

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-fade-in'>
      <div className='relative mb-8'>
        <div className='absolute inset-0 bg-primary-100 dark:bg-primary-900/30 rounded-full animate-ping opacity-20'></div>
        <div className='relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-xl border border-gray-100 dark:border-gray-700'>
          <div className='relative w-12 h-12'>
            <Loader2 className='absolute inset-0 w-full h-full text-primary-600 animate-spin' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <GraduationCap className='w-6 h-6 text-primary-600 animate-bounce' />
            </div>
          </div>
        </div>
      </div>

      <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
        {message || LOADING_MESSAGES[currentMessageIndex]}
      </h3>
      <p className='text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto'>
        Please wait while we fetch the latest updates for you.
      </p>
    </div>
  );
};
