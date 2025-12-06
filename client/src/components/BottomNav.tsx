import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, MessageSquare, User } from 'lucide-react';
import { useState } from 'react';
import { UserProfile } from './UserProfile';

export function BottomNav() {
  const [profileOpen, setProfileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${
      isActive
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    }`;

  return (
    <>
      <div className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 z-50 pb-safe'>
        <NavLink to='/dashboard' className={navLinkClass}>
          <LayoutDashboard className='w-6 h-6' />
          <span className='text-[10px] font-medium'>Home</span>
        </NavLink>
        <NavLink to='/department' className={navLinkClass}>
          <BookOpen className='w-6 h-6' />
          <span className='text-[10px] font-medium'>Library</span>
        </NavLink>
        <NavLink to='/study-partner' className={navLinkClass}>
          <Users className='w-6 h-6' />
          <span className='text-[10px] font-medium'>Partner</span>
        </NavLink>
        <NavLink to='/chat' className={navLinkClass}>
          <MessageSquare className='w-6 h-6' />
          <span className='text-[10px] font-medium'>AI Chat</span>
        </NavLink>
        <button
          onClick={() => setProfileOpen(true)}
          className='flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        >
          <User className='w-6 h-6' />
          <span className='text-[10px] font-medium'>Profile</span>
        </button>
      </div>

      {profileOpen && <UserProfile onClose={() => setProfileOpen(false)} />}
    </>
  );
}
