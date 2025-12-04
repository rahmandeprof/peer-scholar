import { QuizHistory } from './QuizHistory';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UNILORIN_FACULTIES } from '../data/unilorin-faculties';
import {
  User,
  X,
  Trophy,
  Shield,
  Mail,
  Building,
  GraduationCap,
  Save,
  Wifi,
  Zap,
} from 'lucide-react';
import api from '../lib/api';
import { useNetwork } from '../contexts/NetworkContext';
import { OptimizedImage } from './OptimizedImage';

interface UserProfileProps {
  onClose: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, refreshUser } = useAuth();

  if (!user) return null;
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'quizzes' | 'data'>(
    'profile',
  );
  const { preferences, updatePreferences, isLowBandwidth, connectionType } =
    useNetwork();

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    faculty: user?.faculty?.name ?? (user?.faculty as unknown as string) ?? '',
    department:
      user?.department?.name ?? (user?.department as unknown as string) ?? '',
    yearOfStudy: user?.yearOfStudy ?? 1,
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        faculty:
          user.faculty?.name ?? (user.faculty as unknown as string) ?? '',
        department:
          user.department?.name ?? (user.department as unknown as string) ?? '',
        yearOfStudy: user.yearOfStudy ?? 1,
      });
    }
  }, [user, isEditing]);

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        faculty:
          user.faculty?.name ?? (user.faculty as unknown as string) ?? '',
        department:
          user.department?.name ?? (user.department as unknown as string) ?? '',
        yearOfStudy: user.yearOfStudy ?? 1,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      await api.patch('/users/academic-profile', {
        facultyId: formData.faculty, // Backend handles string mapping if needed or we send name
        departmentId: formData.department,
        yearOfStudy: formData.yearOfStudy,
      });

      toast.success('Profile updated successfully');
      await refreshUser();
      setIsEditing(false);
      onClose();
    } catch {
      toast.error('Failed to update profile');
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
            My Profile
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-100 dark:border-gray-800'>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'profile'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Profile Details
            {activeTab === 'profile' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full' />
            )}
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'quizzes'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Quiz History
            {activeTab === 'quizzes' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full' />
            )}
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'data'
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Data Usage
            {activeTab === 'data' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full' />
            )}
          </button>
        </div>

        <div className='p-6'>
          {activeTab === 'quizzes' ? (
            <QuizHistory />
          ) : activeTab === 'data' ? (
            <div className='space-y-6'>
              <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800'>
                <div className='flex items-center mb-2'>
                  <Wifi className='w-5 h-5 text-blue-600 dark:text-blue-400 mr-2' />
                  <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
                    Current Network
                  </h3>
                </div>
                <p className='text-sm text-blue-700 dark:text-blue-300 mb-1'>
                  Connection Type:{' '}
                  <span className='font-bold uppercase'>{connectionType}</span>
                </p>
                <p className='text-sm text-blue-700 dark:text-blue-300'>
                  Status:{' '}
                  <span className='font-bold'>
                    {isLowBandwidth ? 'Low Bandwidth Mode ⚡' : 'Standard Mode'}
                  </span>
                </p>
              </div>

              <div className='space-y-4'>
                <h3 className='font-medium text-gray-900 dark:text-gray-100'>
                  Preferences
                </h3>

                <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center'>
                    <Zap className='w-5 h-5 text-yellow-500 mr-3' />
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        High Quality Images
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        Always load HD images (uses more data)
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      className='sr-only peer'
                      checked={preferences.highQualityImages}
                      onChange={(e) =>
                        updatePreferences({
                          highQualityImages: e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center'>
                    <div className='w-5 h-5 mr-3 flex items-center justify-center'>
                      <span className='text-lg'>▶️</span>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        Auto-play Videos
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        Play videos automatically in feed
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      className='sr-only peer'
                      checked={preferences.autoPlayVideos}
                      onChange={(e) =>
                        updatePreferences({ autoPlayVideos: e.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='flex justify-center mb-6'>
                <div className='w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 text-3xl font-bold overflow-hidden'>
                  {user.image ? (
                    <OptimizedImage
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
                    disabled={!isEditing}
                    className='w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed'
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
                    disabled={!isEditing}
                    className='w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed'
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
                <div className='relative group'>
                  <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <select
                    value={formData.faculty}
                    disabled
                    className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed appearance-none'
                  >
                    <option value={formData.faculty}>{formData.faculty}</option>
                  </select>
                  {/* Tooltip */}
                  <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
                    Contact Support to request a transfer
                    <div className='absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900'></div>
                  </div>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Department
                </label>
                <div className='relative group'>
                  <Building className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <select
                    value={formData.department}
                    disabled
                    className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed appearance-none'
                  >
                    <option value={formData.department}>
                      {formData.department}
                    </option>
                  </select>
                  {/* Tooltip */}
                  <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10'>
                    Contact Support to request a transfer
                    <div className='absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900'></div>
                  </div>
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
                    disabled={!isEditing}
                    className='w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed'
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
                {!isEditing ? (
                  <>
                    <button
                      type='button'
                      onClick={onClose}
                      className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    >
                      Close
                    </button>
                    <button
                      type='button'
                      onClick={() => setIsEditing(true)}
                      className='px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center'
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type='button'
                      onClick={handleCancel}
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
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
