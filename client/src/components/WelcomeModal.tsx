import { useState, useEffect } from 'react';
import { X, Sparkles, BookOpen, Users, Brain } from 'lucide-react';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-pop-in border border-gray-100 dark:border-gray-800'>
        {/* Header with gradient */}
        <div className='bg-gradient-to-r from-primary-600 to-purple-600 p-6 text-white relative overflow-hidden'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none' />
          
          <button 
            onClick={handleClose}
            className='absolute top-4 right-4 p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors'
          >
            <X className='w-5 h-5' />
          </button>

          <div className='relative z-10'>
            <div className='w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 shadow-lg'>
              <Sparkles className='w-6 h-6 text-white' />
            </div>
            <h2 className='text-2xl font-bold mb-2'>Welcome to peerStudent!</h2>
            <p className='text-primary-100 text-sm'>
              Your all-in-one academic companion is ready.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          <div className='space-y-4'>
            <div className='flex items-start'>
              <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 mr-4 shrink-0'>
                <BookOpen className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900 dark:text-white text-sm'>Access Course Materials</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  Find notes, past questions, and slides tailored to your department and level.
                </p>
              </div>
            </div>

            <div className='flex items-start'>
              <div className='p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400 mr-4 shrink-0'>
                <Brain className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900 dark:text-white text-sm'>AI Study Companion</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  Generate quizzes, summaries, and flashcards instantly from any document.
                </p>
              </div>
            </div>

            <div className='flex items-start'>
              <div className='p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 mr-4 shrink-0'>
                <Users className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-gray-900 dark:text-white text-sm'>Study Together</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  Find a study partner, track streaks, and challenge friends to quizzes.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary-600/20'
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
