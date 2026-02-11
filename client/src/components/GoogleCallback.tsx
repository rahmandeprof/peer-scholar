import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BorderSpinner } from './Skeleton';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const loginSignal = searchParams.get('login');

    if (loginSignal === 'success') {
      // Backend set the cookie, now we just need to verify it and fetch user data
      refreshUser()
        .then(() => {
          // Check if we actually got a user back (implies cookie was valid)
          // refined flow: refreshUser sets user state. We can check auth state or just proceed.
          // Since refreshUser is void, we'll assume if it didn't throw/log error we might be good, 
          // but better to check if user state updates. 
          // Actually, refreshUser in AuthContext swallows errors. 
          // We can try a direct call to be sure or just navigate to dashboard and let AuthContext handle 401s.

          const redirect = localStorage.getItem('login_redirect');
          if (redirect) {
            localStorage.removeItem('login_redirect');
            navigate(redirect, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
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
