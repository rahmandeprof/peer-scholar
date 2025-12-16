import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../lib/api';
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


    if (token) {
      // Fetch full profile to ensure we have department/faculty info
      // This prevents the "University Modal" flicker by ensuring we know the true profile state
      axios
        .get('/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fullUser = (res.data as any).data || res.data;

          login(token, fullUser);

          const isProfileComplete =
            fullUser.department && fullUser.faculty && fullUser.yearOfStudy;

          if (isProfileComplete) {
            const redirect = localStorage.getItem('login_redirect');
            if (redirect) {
              localStorage.removeItem('login_redirect');
              navigate(redirect, { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } else {
            navigate('/complete-profile', { replace: true });
          }
        })
        .catch((err) => {
          console.error('Failed to fetch profile during google callback', err);
          navigate('/?error=auth_failed', { replace: true });
        });
    } else {
      navigate('/?error=no_token', { replace: true });
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
