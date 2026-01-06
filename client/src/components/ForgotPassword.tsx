import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { BorderSpinner } from './Skeleton';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success(
        'If your email is registered, you will receive a reset link.',
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center'>
        <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
          <ArrowRight className='w-8 h-8 text-green-600 dark:text-green-400' />
        </div>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
          Check your email
        </h2>
        <p className='text-gray-500 dark:text-gray-400'>
          We've sent a password reset link to <strong>{email}</strong>
        </p>
        <Link
          to='/'
          className='inline-flex items-center text-primary-600 hover:text-primary-700 font-medium'
        >
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          Forgot Password
        </h1>
        <p className='text-gray-500 dark:text-gray-400'>
          Enter your email to receive a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Email
          </label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            placeholder='student@university.edu'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? (
            <BorderSpinner size='md' />
          ) : (
            <>
              Send Reset Link <ArrowRight className='w-4 h-4 ml-2' />
            </>
          )}
        </button>

        <div className='text-center'>
          <Link
            to='/'
            className='text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
          >
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
