import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';

export function VerifyPending() {
  const { user, logout, refreshUser } = useAuth();
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success('Verification email sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refreshUser();
      // If still not verified after refresh, show message
      toast.info('Email not yet verified. Please check your inbox.');
    } catch {
      toast.error('Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-950'>
      <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700'>
        {/* Icon */}
        <div className='flex justify-center'>
          <div className='w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center'>
            <Mail className='w-10 h-10 text-primary-600 dark:text-primary-400' />
          </div>
        </div>

        {/* Header */}
        <div className='text-center space-y-2'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Verify Your Email
          </h1>
          <p className='text-gray-500 dark:text-gray-400'>
            We sent a verification link to:
          </p>
          <p className='font-medium text-gray-900 dark:text-gray-100'>
            {user?.email}
          </p>
        </div>

        {/* Instructions */}
        <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800'>
          <p className='text-sm text-blue-700 dark:text-blue-300'>
            Click the link in your email to verify your account. Once verified,
            you'll have full access to PeerToLearn.
          </p>
        </div>

        {/* Actions */}
        <div className='space-y-3'>
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50'
          >
            {checking ? (
              <BorderSpinner size='md' />
            ) : (
              <>
                <RefreshCw className='w-4 h-4 mr-2' />
                I've Verified - Continue
              </>
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className='w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50'
          >
            {resending ? (
              <BorderSpinner size='md' />
            ) : (
              <>
                <Mail className='w-4 h-4 mr-2' />
                Resend Verification Email
              </>
            )}
          </button>

          <button
            onClick={logout}
            className='w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors flex items-center justify-center'
          >
            <LogOut className='w-4 h-4 mr-2' />
            Sign Out
          </button>
        </div>

        {/* Help text */}
        <p className='text-center text-xs text-gray-400 dark:text-gray-500'>
          Didn't receive the email? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  );
}

export default VerifyPending;
