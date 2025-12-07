import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { Loader2, ArrowRight } from 'lucide-react';

interface LoginProps {
  onSwitch: () => void;
}

export function Login({ onSwitch }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.access_token, res.data.user);
    } catch (err: unknown) {
      // console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Invalid credentials';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md p-6 md:p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          Welcome Back
        </h1>
        <p className='text-gray-500 dark:text-gray-400'>
          Sign in to continue your studies
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

        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Password
          </label>
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            placeholder='••••••••'
          />
        </div>

        <div className='w-full flex justify-end'>
          <Link
            to='/forgot-password'
            className='text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 block py-1'
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? (
            <Loader2 className='w-5 h-5 animate-spin' />
          ) : (
            <>
              Sign In <ArrowRight className='w-4 h-4 ml-2' />
            </>
          )}
        </button>

        <div className='relative flex items-center justify-center my-4'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-200 dark:border-gray-700'></div>
          </div>
          <span className='relative px-4 bg-white dark:bg-gray-800 text-sm text-gray-500'>
            Or continue with
          </span>
        </div>

        <button
          type='button'
          onClick={() => {
            const redirect = location.state?.from?.pathname;
            if (redirect) {
              localStorage.setItem('login_redirect', redirect);
            }
            window.location.href = `${api.defaults.baseURL}/auth/google`;
          }}
          className='w-full py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center'
        >
          <img
            src='https://www.google.com/favicon.ico'
            alt='Google'
            className='w-5 h-5 mr-2'
          />
          Sign in with Google
        </button>
      </form>

      <p className='text-center text-sm text-gray-500 dark:text-gray-400'>
        Don't have an account?{' '}
        <button
          onClick={onSwitch}
          className='text-primary-600 hover:underline font-medium'
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
