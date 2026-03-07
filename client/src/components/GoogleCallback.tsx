import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BorderSpinner } from './Skeleton';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        login(token, user);

        // Handle redirect
        const redirect = localStorage.getItem('login_redirect');
        if (redirect) {
          localStorage.removeItem('login_redirect');
          navigate(redirect, { replace: true });
        } else {
          // If no redirect is stored, go to dashboard by default
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Failed to parse auth callback data', err);
        navigate('/?error=auth_failed', { replace: true });
      }
    } else {
      // Legacy or error
      const error = searchParams.get('error');
      if (error) {
        navigate(`/?error=${error}`, { replace: true });
      } else {
        navigate('/?error=unknown', { replace: true });
      }
    }
  }, [searchParams, login, navigate]);

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
