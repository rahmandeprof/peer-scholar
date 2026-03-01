import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, login } = useAuth();

  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const loginSignal = searchParams.get('login');

    if (loginSignal === 'success') {
      // Fetch the token and user data from the new session endpoint
      api
        .get('/auth/session')
        .then((res) => {
          const { access_token, user } = res.data;

          if (access_token && user) {
            login(access_token, user);
          } else {
            throw new Error('Missing token or user data in session response');
          }

          const redirect = localStorage.getItem('login_redirect');
          if (redirect) {
            localStorage.removeItem('login_redirect');
            navigate(redirect, { replace: true });
          } else {
            // Replaced manual navigation with login()'s internal replaceState
          }
        })
        .catch((err) => {
          console.error('Failed to init session after google login', err);
          navigate('/?error=auth_failed', { replace: true });
        });
    } else {
      // Legacy or error
      const error = searchParams.get('error');
      if (error) {
        navigate(`/?error=${error}`, { replace: true });
      } else {
        navigate('/?error=unknown', { replace: true });
      }
    }
  }, [searchParams, refreshUser, navigate]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
      <div className='text-center'>
        <BorderSpinner size='lg' className='text-primary-600 mx-auto mb-4' />
        <p className='text-gray-600 dark:text-gray-400'>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
