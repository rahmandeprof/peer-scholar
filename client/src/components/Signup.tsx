import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { Loader2, ArrowRight } from 'lucide-react';

import { UNILORIN_FACULTIES } from '../data/unilorin-faculties';

interface SignupProps {
  onSwitch: () => void;
}

export function Signup({ onSwitch }: SignupProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    schoolId: 'University of Ilorin',
    faculty: '',
    department: '',
    yearOfStudy: 1,
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      login(res.data.access_token, res.data.user);
    } catch (err: any) {
      // Extract meaningful error message from API response
      let errorMessage = 'Registration failed. Please try again.';

      if (err.response?.data?.message) {
        // Handle array of messages (validation errors)
        const apiMessage = err.response.data.message;
        if (Array.isArray(apiMessage)) {
          errorMessage = apiMessage.join('. ');
        } else {
          errorMessage = apiMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 my-8'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
          Create Account
        </h1>
        <p className='text-gray-500 dark:text-gray-400'>
          Join the scholar community
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              First Name
            </label>
            <input
              required
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Last Name
            </label>
            <input
              required
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Email
          </label>
          <input
            required
            type='email'
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
          />
        </div>

        <div className='space-y-2'>
          <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Password
          </label>
          <input
            required
            type='password'
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2 col-span-2'>
            <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 mb-4'>
              <p>
                We need this to connect you with classmates and materials
                specific to your department.
              </p>
            </div>

            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              School
            </label>
            <select
              required
              value={formData.schoolId}
              onChange={(e) =>
                setFormData({ ...formData, schoolId: e.target.value })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
            >
              <option value='University of Ilorin'>University of Ilorin</option>
            </select>
          </div>

          <div className='space-y-2 col-span-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Faculty
            </label>
            <select
              required
              value={formData.faculty}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  faculty: e.target.value,
                  department: '',
                });
              }}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
            >
              <option value=''>Select Faculty</option>
              {UNILORIN_FACULTIES.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Department
            </label>
            <select
              required
              disabled={!formData.faculty}
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
            >
              <option value=''>Select Department</option>
              {formData.faculty &&
                UNILORIN_FACULTIES.find(
                  (f) => f.name === formData.faculty,
                )?.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Year
            </label>
            <select
              value={formData.yearOfStudy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearOfStudy: parseInt(e.target.value),
                })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary-500 outline-none'
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type='submit'
          disabled={
            loading ||
            !formData.schoolId ||
            !formData.faculty ||
            !formData.department
          }
          className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? (
            <Loader2 className='w-5 h-5 animate-spin' />
          ) : (
            <>
              Create Account <ArrowRight className='w-4 h-4 ml-2' />
            </>
          )}
        </button>

        <div className='relative flex items-center justify-center my-4'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-gray-200 dark:border-gray-700'></div>
          </div>
          <span className='relative px-4 bg-white dark:bg-gray-800 text-sm text-gray-500'>
            Or sign up with
          </span>
        </div>

        <button
          type='button'
          onClick={() =>
            (window.location.href = `${api.defaults.baseURL}/auth/google`)
          }
          className='w-full py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center'
        >
          <img
            src='https://www.google.com/favicon.ico'
            alt='Google'
            className='w-5 h-5 mr-2'
          />
          Sign up with Google
        </button>
      </form>

      <p className='text-center text-sm text-gray-500 dark:text-gray-400'>
        Already have an account?{' '}
        <button
          onClick={onSwitch}
          className='text-primary-600 hover:underline font-medium'
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
