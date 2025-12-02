import { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Mail, Shield } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import confetti from 'canvas-confetti';

interface PartnerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string;
  currentStreak: number;
  lastActivity: string;
  combinedStreak: number;
}

interface PartnerRequest {
  id: string;
  sender: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function StudyPartner() {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [sentRequests, setSentRequests] = useState<PartnerRequest[]>([]);

  const fetchData = async () => {
    try {
      const [partnersRes, requestsRes, sentRes] = await Promise.all([
        api.get('/users/partner'),
        api.get('/users/partner/requests'),
        api.get('/users/partner/sent'),
      ]);
      // Ensure we handle both array (new) and object (old cache?) if any
      // But we changed backend, so it should be array.
      setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
      setRequests(requestsRes.data);
      setSentRequests(sentRes.data);
    } catch {
      // console.error('Failed to fetch partner data', err);
      // toast.error('Failed to load partner data');
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      await api.post('/users/partner/invite', { email: inviteEmail });
      toast.success('Invite sent successfully!');
      setInviteEmail('');
      fetchData();
    } catch (err: unknown) {
      let message = 'Failed to send invite';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          message = parsed.message || message;
        } catch {
          message = err.message || message;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await api.delete(`/users/partner/invite/${id}`);
      toast.success('Invite cancelled');
      setSentRequests((prev) => prev.filter((req) => req.id !== id));
    } catch {
      toast.error('Failed to cancel invite');
    }
  };

  const handleResponse = async (id: string, accept: boolean) => {
    try {
      await api.post(`/users/partner/${accept ? 'accept' : 'reject'}/${id}`);
      if (accept) {
        toast.success('Study Partner accepted! 🎉');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10B981', '#F59E0B'],
        });
      } else {
        toast.success('Request rejected');
      }
      fetchData();
    } catch {
      toast.error('Failed to process request');
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-8 h-full overflow-y-auto'>
      {partners.length > 0 ? (
        <div className='grid gap-6 md:grid-cols-2'>
          {partners.map((partner) => (
            <div
              key={partner.id}
              className='bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden'
            >
              <div className='absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none' />

              <div className='flex items-center justify-between mb-8 relative z-10'>
                <div className='flex items-center space-x-4'>
                  <div className='p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner'>
                    <Users className='w-8 h-8' />
                  </div>
                  <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                      Study Partner
                    </h2>
                    <p className='text-primary-100 font-medium text-sm'>
                      Together you go further
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-4xl font-bold tracking-tighter'>
                    {partner.combinedStreak}
                  </div>
                  <div className='text-primary-100 text-xs font-bold uppercase tracking-wider'>
                    Combined Streak
                  </div>
                </div>
              </div>

              <div className='space-y-6 relative z-10'>
                <div className='bg-white/10 rounded-2xl p-6 backdrop-blur-md border border-white/10'>
                  <h3 className='text-lg font-bold mb-4 flex items-center'>
                    <Shield className='w-5 h-5 mr-2' />
                    {partner.firstName} {partner.lastName}
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex items-center text-primary-100 font-medium'>
                      <span className='w-2.5 h-2.5 bg-green-400 rounded-full mr-2 shadow-[0_0_8px_rgba(74,222,128,0.6)]'></span>
                      {partner.currentStreak} day streak
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-3xl mb-6 shadow-sm'>
            <UserPlus className='w-10 h-10' />
          </div>
          <h2 className='text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight'>
            Find a Study Partner
          </h2>
          <p className='text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto'>
            Boost your motivation by tracking streaks together with a peer.
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-8'>
          <div className='p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30'>
            <h3 className='font-bold text-gray-900 dark:text-gray-100'>
              Pending Requests
            </h3>
          </div>
          <div className='divide-y divide-gray-200/50 dark:divide-gray-700/50'>
            {requests.map((req) => (
              <div
                key={req.id}
                className='p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors'
              >
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg'>
                    {req.sender.firstName?.[0] || '?'}
                  </div>
                  <div>
                    <div className='font-bold text-gray-900 dark:text-gray-100'>
                      {req.sender.firstName} {req.sender.lastName}
                    </div>
                    <div className='text-sm text-gray-500'>
                      {req.sender.email}
                    </div>
                  </div>
                </div>
                <div className='flex space-x-2'>
                  <button
                    onClick={() => handleResponse(req.id, true)}
                    className='p-2.5 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors shadow-sm'
                  >
                    <Check className='w-5 h-5' />
                  </button>
                  <button
                    onClick={() => handleResponse(req.id, false)}
                    className='p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors shadow-sm'
                  >
                    <X className='w-5 h-5' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentRequests.length > 0 && (
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-8'>
          <div className='p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30'>
            <h3 className='font-bold text-gray-900 dark:text-gray-100'>
              Sent Requests
            </h3>
          </div>
          <div className='divide-y divide-gray-200/50 dark:divide-gray-700/50'>
            {sentRequests.map((req) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <div
                key={req.id}
                className='p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors'
              >
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-lg'>
                    {(req as any).receiver?.firstName?.[0] || '?'}
                  </div>
                  <div>
                    <div className='font-bold text-gray-900 dark:text-gray-100'>
                      {(req as any).receiver?.firstName}{' '}
                      {(req as any).receiver?.lastName}
                    </div>
                    <div className='text-sm text-gray-500'>
                      {(req as any).receiver?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(req.id)}
                  className='px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium'
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8'>
        <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-6'>
          Invite a Friend
        </h3>
        <form onSubmit={handleInvite} className='flex gap-4'>
          <div className='relative flex-1'>
            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='email'
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter friend's email"
              className='w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
            />
          </div>
          <button
            type='submit'
            disabled={loading || !inviteEmail}
            className='px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none'
          >
            {loading ? 'Sending...' : 'Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
