import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, User, Plus } from 'lucide-react';
import { useState } from 'react';
import { UserProfile } from './UserProfile';
import { UploadModal } from './UploadModal';
import { ConfirmationModal } from './ConfirmationModal';
import { usePartnerRequests } from '../hooks/usePartnerRequests';
import { useAuth } from '../contexts/AuthContext';

export function BottomNav() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { pendingCount } = usePartnerRequests();
  const { logout } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center flex-1 h-full space-y-0.5 transition-all duration-200 active:scale-95 ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-500 dark:text-gray-400'
    }`;

  const navLinkInner = (isActive: boolean) =>
    `flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-colors ${
      isActive ? 'bg-primary-100 dark:bg-primary-900/40' : ''
    }`;

  return (
    <>
      {/* Bottom Navigation */}
      <div className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 flex items-center z-50 safe-area-pb'>
        {/* Left nav items */}
        <NavLink to='/dashboard' className={navLinkClass}>
          {({ isActive }) => (
            <div className={navLinkInner(isActive)}>
              <LayoutDashboard className='w-5 h-5' />
              <span className='text-[10px] font-semibold'>Home</span>
            </div>
          )}
        </NavLink>
        <NavLink to='/department' className={navLinkClass}>
          {({ isActive }) => (
            <div className={navLinkInner(isActive)}>
              <BookOpen className='w-5 h-5' />
              <span className='text-[10px] font-semibold'>Library</span>
            </div>
          )}
        </NavLink>

        {/* Center FAB Upload Button */}
        <div className='flex items-center justify-center px-2'>
          <button
            onClick={() => setUploadOpen(true)}
            className='w-14 h-14 -mt-6 bg-gradient-to-tr from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform'
            aria-label='Upload material'
          >
            <Plus className='w-7 h-7 text-white' strokeWidth={2.5} />
          </button>
        </div>

        {/* Right nav items */}
        <NavLink to='/study-partner' className={navLinkClass}>
          {({ isActive }) => (
            <div className={`${navLinkInner(isActive)} relative`}>
              <div className='relative'>
                <Users className='w-5 h-5' />
                {pendingCount > 0 && (
                  <span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1'>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className='text-[10px] font-semibold'>Partner</span>
            </div>
          )}
        </NavLink>

        <button
          onClick={() => setProfileOpen(true)}
          className='flex flex-col items-center justify-center flex-1 h-full space-y-0.5 text-gray-500 dark:text-gray-400 active:scale-95 transition-all duration-200'
        >
          <div className='flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl'>
            <User className='w-5 h-5' />
            <span className='text-[10px] font-semibold'>Profile</span>
          </div>
        </button>
      </div>

      {/* Modals */}
      {/* Modals */}
      {profileOpen && (
        <UserProfile
          onClose={() => setProfileOpen(false)}
          onLogout={() => {
            setProfileOpen(false);
            setLogoutConfirmOpen(true);
          }}
        />
      )}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={() => setUploadOpen(false)}
      />
      <ConfirmationModal
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={logout}
        title='Sign Out'
        message='Are you sure you want to sign out? You will need to log in again to access your account.'
        confirmText='Sign Out'
        isDangerous={true}
      />
    </>
  );
}
