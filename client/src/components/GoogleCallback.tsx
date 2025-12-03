import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        login(token, user);

        const redirect = localStorage.getItem('login_redirect');
        if (redirect) {
          localStorage.removeItem('login_redirect');
          navigate(redirect);
        } else {
          navigate('/');
        }
      } catch {
        // console.error('Failed to parse user data', err);
        navigate('/login?error=auth_failed');
      }
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
      <div className='text-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary-600 mx-auto mb-4' />
        <p className='text-gray-600 dark:text-gray-400'>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
