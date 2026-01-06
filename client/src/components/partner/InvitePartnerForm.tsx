import { memo, useState, type FormEvent } from 'react';
import { Mail, UserPlus } from 'lucide-react';
import { BorderSpinner } from '../Skeleton';

interface InvitePartnerFormProps {
  onInvite: (email: string) => Promise<void>;
}

export const InvitePartnerForm = memo<InvitePartnerFormProps>(
  ({ onInvite }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!email.trim() || loading) return;

      setLoading(true);
      try {
        await onInvite(email.trim());
        setEmail('');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6'>
        <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center'>
          <UserPlus className='w-5 h-5 mr-2 text-primary-500' />
          Invite a Friend
        </h3>
        <form
          onSubmit={handleSubmit}
          className='flex flex-col sm:flex-row gap-3'
        >
          <div className='relative flex-1'>
            <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter friend's email"
              className='w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
              disabled={loading}
            />
          </div>
          <button
            type='submit'
            disabled={loading || !email.trim()}
            className='px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 active:scale-95 touch-manipulation disabled:cursor-not-allowed'
          >
            {loading ? (
              <BorderSpinner size='md' />
            ) : (
              <>
                <UserPlus className='w-5 h-5' />
                <span className='hidden sm:inline'>Send Invite</span>
                <span className='sm:hidden'>Invite</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  },
);

InvitePartnerForm.displayName = 'InvitePartnerForm';
