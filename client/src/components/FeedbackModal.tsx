import { useState, useEffect } from 'react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/errorUtils';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
    const { user } = useAuth();
    const toast = useToast();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Please enter your feedback');
            return;
        }

        setLoading(true);
        try {
            await api.post('/feedback', { message: message.trim() });
            toast.success('Thank you for your feedback!');
            setMessage('');
            onClose();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to submit feedback'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end md:items-center justify-center p-0 md:p-4'>
            <div className='bg-white dark:bg-gray-900 w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-xl animate-slide-up md:animate-pop-in max-h-[85vh] flex flex-col'>
                {/* Header */}
                <div className='flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800'>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                        <MessageSquare className='w-5 h-5 mr-2 text-primary-600' />
                        Send Feedback
                    </h2>
                    <button
                        onClick={onClose}
                        className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
                    >
                        <X className='w-5 h-5 text-gray-500' />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className='flex-1 flex flex-col p-4 md:p-6'>
                    {/* User email display */}
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
                            Your Email
                        </label>
                        <div className='px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-600 dark:text-gray-400 text-sm'>
                            {user?.email || 'Not available'}
                        </div>
                    </div>

                    {/* Feedback textarea */}
                    <div className='flex-1 mb-4'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                            Your Feedback
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder='Tell us what you think, report a bug, or suggest a feature...'
                            maxLength={2000}
                            rows={5}
                            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400'
                            autoFocus
                        />
                        <div className='flex justify-end mt-1'>
                            <span className='text-xs text-gray-400'>
                                {message.length}/2000
                            </span>
                        </div>
                    </div>

                    {/* Submit button */}
                    <button
                        type='submit'
                        disabled={loading || !message.trim()}
                        className='w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20'
                    >
                        {loading ? (
                            <>
                                <Loader2 className='w-5 h-5 animate-spin' />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className='w-5 h-5' />
                                Send Feedback
                            </>
                        )}
                    </button>

                    <p className='text-xs text-gray-400 text-center mt-3'>
                        Your feedback helps us improve PeerToLearn for everyone.
                    </p>
                </form>
            </div>
        </div>
    );
}
