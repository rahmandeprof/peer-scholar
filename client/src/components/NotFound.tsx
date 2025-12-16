import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export function NotFound() {
    return (
        <div className='min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
            {/* Logo */}
            <img
                src='/wordmark-black.png'
                alt='PeerToLearn'
                className='h-12 mb-8 dark:hidden'
            />
            <img
                src='/wordmark-blue.png'
                alt='PeerToLearn'
                className='h-12 mb-8 hidden dark:block'
            />

            {/* 404 Icon */}
            <div className='relative mb-6'>
                <div className='text-9xl font-bold text-gray-200 dark:text-gray-800 select-none'>
                    404
                </div>
                <Search className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-primary-500' />
            </div>

            {/* Message */}
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center'>
                Page Not Found
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md'>
                Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Actions - Mobile friendly */}
            <div className='flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md'>
                <Link
                    to='/dashboard'
                    className='flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20 active:scale-95'
                >
                    <Home className='w-5 h-5' />
                    Go to Dashboard
                </Link>
                <button
                    onClick={() => window.history.back()}
                    className='flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95'
                >
                    <ArrowLeft className='w-5 h-5' />
                    Go Back
                </button>
            </div>
        </div>
    );
}

export default NotFound;
