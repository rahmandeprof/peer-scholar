import { QuizHistory } from './QuizHistory';
// Sub-components available for future integration:
// import { ProfileHeader, ProfileTabs, DataUsageSettings } from './profile';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

import {
  User,
  X,
  Trophy,
  Shield,
  Mail,
  Building,
  GraduationCap,
  Save,
  AlertTriangle,
  Share,
  Wifi,
  Zap,
  ChevronRight,
  Briefcase,
  Layers,
  HelpCircle,
  MoreVertical,
  Moon,
  Sun,
} from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';
import { OptimizedImage } from './OptimizedImage';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useModalBack } from '../hooks/useModalBack';

interface UserProfileProps {
  onClose: () => void;
}

export function UserProfile({ onClose }: UserProfileProps) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Handle back button closing
  useModalBack(true, onClose, 'user-profile');

  if (!user) return null;
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'quizzes' | 'data'>(
    'profile',
  );
  const { preferences, updatePreferences, isLowBandwidth, connectionType } =
    useNetwork();
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    faculty: user?.faculty?.name ?? (user?.faculty as unknown as string) ?? '',
    department:
      user?.department?.name ?? (user?.department as unknown as string) ?? '',
    yearOfStudy: user?.yearOfStudy ?? 1,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    // Check if device is iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    };

    checkStandalone();
    checkIOS();
  }, []);

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

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      // @ts-ignore
      window.deferredPrompt = e;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
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

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowWarningModal(true);
  };

  const confirmUpdate = async () => {
    setLoading(true);
    try {
      await api.patch('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      toast.success('Profile updated successfully');
      await refreshUser();
      setIsEditing(false);
      setShowWarningModal(false);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
      setShowWarningModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-[90%] md:w-full max-w-md max-h-[90vh] overflow-y-auto animate-pop-in'>
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
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'profile'
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
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'quizzes'
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
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'data'
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

        <div className='p-6 h-[420px] overflow-y-auto'>
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
                        Automatically play videos when loaded
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

                <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
                  <div className='flex items-center'>
                    <div className='w-5 h-5 mr-3 flex items-center justify-center'>
                      {theme === 'dark' ? (
                        <Moon className='w-4 h-4 text-blue-400' />
                      ) : (
                        <Sun className='w-4 h-4 text-orange-400' />
                      )}
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        Dark Mode
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {theme === 'dark' ? 'On' : 'Off'}
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      className='sr-only peer'
                      checked={theme === 'dark'}
                      onChange={toggleTheme}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Install App Button */}
                {!isStandalone && (
                  <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
                    <div className='flex items-center'>
                      <div className='w-5 h-5 mr-3 flex items-center justify-center'>
                        <span className='text-lg'>📱</span>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          Install App
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          Add to home screen for offline access
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isIOS) {
                          setShowIOSModal(true);
                        } else {
                          // Check for In-App Browser
                          const userAgent =
                            window.navigator.userAgent.toLowerCase();
                          const isInApp =
                            userAgent.includes('instagram') ||
                            userAgent.includes('fbav') || // Facebook
                            userAgent.includes('fban') || // Facebook
                            userAgent.includes('line') ||
                            userAgent.includes('wv') || // Android WebView
                            (userAgent.includes('linkedin') &&
                              !userAgent.includes('desktop')); // LinkedIn mobile

                          if (isInApp) {
                            toast.error(
                              'Browser not supported. Please open this link in Chrome or Safari to install the app.',
                              5000,
                            );
                            return;
                          }

                          // @ts-ignore
                          const promptEvent = window.deferredPrompt;
                          if (promptEvent) {
                            promptEvent.prompt();
                            promptEvent.userChoice.then((choiceResult: any) => {
                              if (choiceResult.outcome === 'accepted') {
                                console.log('User accepted the install prompt');
                              }
                              // @ts-ignore
                              window.deferredPrompt = null;
                            });
                          } else {
                            // If no prompt event, it might be installed or not supported,
                            // but if we are here, we are likely in a browser that supports it but hasn't fired the event yet
                            // or we are in a standard browser.
                            // Show the manual install guide.
                            setShowManualInstall(true);
                          }
                        }
                      }}
                      className='px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors'
                    >
                      Install
                    </button>
                  </div>
                )}
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

              <div className='flex flex-wrap justify-center gap-3 mb-6'>
                <div className='bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center min-w-0 max-w-[180px] flex-shrink'>
                  <Trophy className='w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2' />
                  <div>
                    <div className='w-full'>
                      <div className='flex justify-between items-end mb-1'>
                        <p className='text-xs text-yellow-600 dark:text-yellow-400 font-medium uppercase tracking-wider'>
                          Reputation
                        </p>
                        <span className='text-xs font-bold text-yellow-700 dark:text-yellow-300'>
                          {(user.reputation || 0) % 500} / 500 XP
                        </span>
                      </div>
                      <p className='text-lg font-bold text-yellow-700 dark:text-yellow-300 leading-none mb-2'>
                        {user.reputation || 0}
                      </p>
                      {/* Level Progress Bar */}
                      <div className='w-full h-1.5 bg-yellow-200 dark:bg-yellow-900/50 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-yellow-500 rounded-full transition-all duration-500'
                          style={{
                            width: `${((user.reputation || 0) % 500) / 5}%`,
                          }}
                        />
                      </div>
                      <p className='text-[10px] text-yellow-600/80 dark:text-yellow-400/80 mt-1 text-right'>
                        To Level {Math.floor((user.reputation || 0) / 500) + 1}
                      </p>
                    </div>
                  </div>
                </div>
                {user.isVerified && (
                  <div className='bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center flex-shrink-0'>
                    <Shield className='w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0' />
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
                    className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all'
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
                    className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all'
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
                    className='w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  />
                  <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                    {user.isVerified ? (
                      <div className='group relative'>
                        <Shield className='w-5 h-5 text-green-500' />
                        <div className='absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'>
                          Verified
                        </div>
                      </div>
                    ) : (
                      <div className='group relative'>
                        <AlertTriangle className='w-5 h-5 text-red-500' />
                        <div className='absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'>
                          Unverified
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {!user.isVerified && (
                  <button
                    type='button'
                    onClick={async () => {
                      try {
                        await api.post('/auth/resend-verification');
                        toast.success('Verification email sent!');
                      } catch (err) {
                        toast.error('Failed to send verification email');
                      }
                    }}
                    className='mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center'
                  >
                    Resend Verification Link
                  </button>
                )}
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

              {/* Mobile Menu Hub */}
              <div className='space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800'>
                <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2'>
                  Menu Hub
                </h3>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate('/tools/gp-calculator');
                  }}
                  className='w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group'
                >
                  <div className='flex items-center'>
                    <div className='w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-3 group-hover:scale-110 transition-transform'>
                      <Briefcase className='w-4 h-4' />
                    </div>
                    <span className='font-medium text-gray-900 dark:text-gray-100'>
                      Tools
                    </span>
                  </div>
                  <ChevronRight className='w-4 h-4 text-gray-400' />
                </button>

                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('quizzes');
                  }}
                  className='w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group'
                >
                  <div className='flex items-center'>
                    <div className='w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform'>
                      <Layers className='w-4 h-4' />
                    </div>
                    <span className='font-medium text-gray-900 dark:text-gray-100'>
                      My Flashcards
                    </span>
                  </div>
                  <ChevronRight className='w-4 h-4 text-gray-400' />
                </button>

                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href =
                      'mailto:abdulrahmanabdulsalam93@gmail.com';
                  }}
                  className='w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group'
                >
                  <div className='flex items-center'>
                    <div className='w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform'>
                      <HelpCircle className='w-4 h-4' />
                    </div>
                    <span className='font-medium text-gray-900 dark:text-gray-100'>
                      Feedback & Support
                    </span>
                  </div>
                  <ChevronRight className='w-4 h-4 text-gray-400' />
                </button>
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
                      className='px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    >
                      Close
                    </button>
                    <button
                      type='button'
                      onClick={handleEditClick}
                      className='px-6 py-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors flex items-center shadow-lg shadow-primary-500/20'
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type='button'
                      onClick={handleCancel}
                      className='px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      disabled={loading}
                      className='px-6 py-3 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors flex items-center disabled:opacity-50 shadow-lg shadow-primary-500/20'
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

      {/* Warning Modal */}
      {showWarningModal && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-500/50 animate-in fade-in zoom-in duration-200'>
            <div className='text-center mb-6'>
              <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400'>
                <AlertTriangle className='w-8 h-8' />
              </div>
              <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                Are you sure?
              </h3>
              <p className='text-gray-600 dark:text-gray-400 text-sm'>
                You will <strong>not</strong> be able to change your Faculty,
                Department, or Year of Study again for <strong>9 months</strong>
                .
              </p>
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-2'>
                Please check your details carefully before confirming.
              </p>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <button
                onClick={() => setShowWarningModal(false)}
                className='py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                disabled={loading}
                className='py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center'
              >
                {loading ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Install Modal (iOS & Android Fallback) */}
      {(showIOSModal || showManualInstall) && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200'>
            <div className='text-center mb-6'>
              <div className='w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-3xl'>📱</span>
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                {isIOS ? 'Install on iOS' : 'Install App'}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 text-sm mb-4'>
                {isIOS
                  ? 'To install PeerToLearn on your iPhone or iPad:'
                  : 'To install PeerToLearn on your device:'}
              </p>
              <ol className='text-left text-sm text-gray-600 dark:text-gray-400 space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl'>
                <li className='flex items-start'>
                  <span className='font-bold mr-2'>1.</span>
                  <span>
                    Tap the <Share className='w-4 h-4 inline mx-1' /> or{' '}
                    <MoreVertical className='w-4 h-4 inline mx-1' /> menu button
                    in your browser.
                  </span>
                </li>
                <li className='flex items-start'>
                  <span className='font-bold mr-2'>2.</span>
                  <span>
                    Scroll down and select <strong>"Add to Home Screen"</strong>{' '}
                    or <strong>"Install App"</strong>.
                  </span>
                </li>
              </ol>
            </div>
            <button
              onClick={() => {
                setShowIOSModal(false);
                setShowManualInstall(false);
              }}
              className='w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors'
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
