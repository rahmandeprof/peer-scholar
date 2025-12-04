import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { UNILORIN_FACULTIES } from '../data/unilorin-faculties';
import { Loader2, GraduationCap, Building, School } from 'lucide-react';

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    school: 'University of Ilorin', // Default for now
    faculty: '',
    department: '',
    yearOfStudy: 1,
  });

  useEffect(() => {
    // If user already has all data, redirect to dashboard
    if (
      user?.school &&
      user?.faculty &&
      user?.department &&
      user?.yearOfStudy
    ) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch('/users/academic-profile', {
        schoolId: formData.school, // Backend should handle string or ID
        facultyId: formData.faculty,
        departmentId: formData.department,
        yearOfStudy: formData.yearOfStudy,
      });

      await refreshUser();
      toast.success('Profile completed! Welcome to your dashboard.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4'>
      <div className='w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800'>
        <div className='text-center mb-8'>
          <div className='w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
            <GraduationCap className='w-8 h-8 text-primary-600 dark:text-primary-400' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            Welcome to peerStudent!
          </h1>
          <p className='text-gray-500 dark:text-gray-400'>
            Let's get you settled. To show you the right notes and quizzes, we
            need to know where you study.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* School */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <School className='w-4 h-4 mr-2 text-gray-400' />
              School
            </label>
            <select
              value={formData.school}
              onChange={(e) =>
                setFormData({ ...formData, school: e.target.value })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
              required
            >
              <option value='University of Ilorin'>University of Ilorin</option>
              {/* Add more schools later */}
            </select>
          </div>

          {/* Faculty */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <Building className='w-4 h-4 mr-2 text-gray-400' />
              Faculty
            </label>
            <select
              value={formData.faculty}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  faculty: e.target.value,
                  department: '',
                })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
              required
            >
              <option value=''>Select Faculty</option>
              {UNILORIN_FACULTIES.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <Building className='w-4 h-4 mr-2 text-gray-400' />
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              disabled={!formData.faculty}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
              required
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

          {/* Level */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <GraduationCap className='w-4 h-4 mr-2 text-gray-400' />
              Level
            </label>
            <select
              value={formData.yearOfStudy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearOfStudy: parseInt(e.target.value),
                })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
              required
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  {y}00 Level
                </option>
              ))}
            </select>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20'
          >
            {loading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              'Finish Setup'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
