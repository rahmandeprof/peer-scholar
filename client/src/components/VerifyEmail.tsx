import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage('Email verified successfully! Redirecting...');
        await refreshUser();
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
            'Verification failed. The link may be invalid or expired.',
        );
      }
    };

    verify();
  }, [token, navigate, refreshUser]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300'>
        <div className='flex justify-center mb-6'>
          {status === 'loading' && (
            <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400'>
              <BorderSpinner size='lg' />
            </div>
          )}
          {status === 'success' && (
            <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400'>
              <CheckCircle className='w-8 h-8' />
            </div>
          )}
          {status === 'error' && (
            <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400'>
              <XCircle className='w-8 h-8' />
            </div>
          )}
        </div>

        <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
          {status === 'loading'
            ? 'Verifying Email'
            : status === 'success'
              ? 'Verified!'
              : 'Verification Failed'}
        </h2>

        <p className='text-gray-600 dark:text-gray-400 mb-6'>{message}</p>

        {status === 'error' && (
          <button
            onClick={() => navigate('/dashboard')}
            className='px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors'
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
