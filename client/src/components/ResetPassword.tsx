import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { ArrowRight, Check } from 'lucide-react';
import { BorderSpinner } from './Skeleton';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.warning('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      toast.success('Password reset successfully');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center'>
        <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
          <Check className='w-8 h-8 text-green-600 dark:text-green-400' />
        </div>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
          Password Reset!
        </h2>
        <p className='text-gray-500 dark:text-gray-400'>
          Your password has been successfully reset. Redirecting to login...
        </p>
        <Link
          to='/login'
          className='inline-flex items-center text-primary-600 hover:text-primary-700 font-medium mt-4'
        >
          Go to Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          Reset Password
        </h1>
        <p className='text-gray-500 dark:text-gray-400'>
          Enter your new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            New Password
          </label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            placeholder='••••••••'
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
              Reset Password <ArrowRight className='w-4 h-4 ml-2' />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
