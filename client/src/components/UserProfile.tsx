import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  X,
  User,
  Save,
  Mail,
  Building,
  GraduationCap,
  Trophy,
  Shield,
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { UNILORIN_FACULTIES } from '../data/unilorin-faculties';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    faculty: '',
    department: '',
    yearOfStudy: 1,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        faculty:
          typeof user.faculty === 'string'
            ? user.faculty
            : (user.faculty as any)?.name || '',
        department:
          typeof user.department === 'string'
            ? user.department
            : (user.department as any)?.name || '',
        yearOfStudy: user.yearOfStudy || 1,
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`/users/${user.id}`, formData);
      toast.success('Profile updated successfully');
      onClose();
      window.location.reload();
    } catch {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop-in'>
        <div className='flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
            <User className='w-5 h-5 mr-2 text-primary-600' />
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='flex justify-center mb-6'>
            <div className='w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-3xl font-bold overflow-hidden'>
              {user.image ? (
                <img
                  src={user.image}
                  alt='Profile'
                  className='w-full h-full object-cover'
                />
              ) : (
                <span>
                  {(user.firstName?.[0] || '').toUpperCase()}
                  {(user.lastName?.[0] || '').toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className='flex justify-center mb-6 space-x-4'>
            <div className='bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center'>
              <Trophy className='w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2' />
              <div>
                <p className='text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase tracking-wider'>
                  Reputation
                </p>
                <p className='text-lg font-bold text-yellow-700 dark:text-yellow-300'>
                  {user.reputation || 0}
                </p>
              </div>
            </div>
            {user.isVerified && (
              <div className='bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center'>
                <Shield className='w-5 h-5 text-blue-600 dark:text-blue-400 mr-2' />
                <div>
                  <p className='text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider'>
                    Status
                  </p>
                  <p className='text-lg font-bold text-blue-700 dark:text-blue-300'>
                    Verified
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                First Name
              </label>
              <input
                type='text'
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className='w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Last Name
              </label>
              <input
                type='text'
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className='w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
                required
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Email
            </label>
            <div className='relative'>
              <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <input
                type='email'
                value={user.email}
                disabled
                className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed'
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Username
            </label>
            <div className='relative'>
              <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <input
                type='text'
                value={user.email ? user.email.split('@')[0] : 'user'}
                disabled
                className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed'
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Faculty
            </label>
            <div className='relative'>
              <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <select
                value={formData.faculty}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    faculty: e.target.value,
                    department: '',
                  });
                }}
                className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none appearance-none'
              >
                <option value=''>Select Faculty</option>
                {UNILORIN_FACULTIES.map((faculty) => (
                  <option key={faculty.name} value={faculty.name}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Department
            </label>
            <div className='relative'>
              <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-50'
                disabled={!formData.faculty}
              >
                <option value=''>Select Department</option>
                {formData.faculty &&
                  UNILORIN_FACULTIES.find(
                    (f) => f.name === formData.faculty,
                  )?.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Year of Study
            </label>
            <div className='relative'>
              <GraduationCap className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <select
                value={formData.yearOfStudy}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    yearOfStudy: parseInt(e.target.value),
                  })
                }
                className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none appearance-none'
              >
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    Year {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='pt-4 flex justify-end space-x-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading}
              className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center disabled:opacity-50'
            >
              <Save className='w-4 h-4 mr-2' />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
