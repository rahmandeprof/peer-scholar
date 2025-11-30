import { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Mail, Shield } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface PartnerStats {
  partner: {
    firstName: string;
    lastName: string;
    currentStreak: number;
    lastActivity: string;
  };
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
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchData = async () => {
    try {
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/users/partner'),
        api.get('/users/partner/requests'),
      ]);
      setStats(statsRes.data);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error('Failed to fetch partner data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      await api.post('/users/partner/invite', { email: inviteEmail });
      toast.success('Invite sent successfully!');
      setInviteEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (id: string, accept: boolean) => {
    try {
      await api.post(`/users/partner/${accept ? 'accept' : 'reject'}/${id}`);
      toast.success(accept ? 'Partner request accepted!' : 'Request rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to process request');
    }
  };

  if (stats) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Study Partner</h2>
                <p className="text-indigo-100">Together you go further</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{stats.combinedStreak}</div>
              <div className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Combined Streak</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Your Partner
              </h3>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{stats.partner.firstName} {stats.partner.lastName}</div>
                <div className="flex items-center text-indigo-100">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  {stats.partner.currentStreak} day streak
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium mb-2">Keep it up!</p>
                <p className="text-indigo-100 text-sm">Study together to increase your combined streak.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Find a Study Partner</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Boost your motivation by tracking streaks together.
        </p>
      </div>

      {requests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pending Requests</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((req) => (
              <div key={req.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                    {req.sender.firstName[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {req.sender.firstName} {req.sender.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{req.sender.email}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleResponse(req.id, true)}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleResponse(req.id, false)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invite a Friend</h3>
        <form onSubmit={handleInvite} className="flex gap-4">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter friend's email"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inviteEmail}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
