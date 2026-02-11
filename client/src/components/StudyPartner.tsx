import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Check, X, Clock, Swords, Send, Copy, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/errorUtils';
import confetti from 'canvas-confetti';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPush, isPushEnabled } from '../lib/pushNotifications';

interface PartnerData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string;
  currentStreak: number;
  lastActivity: string;
  combinedStreak: number;
  lastSeen?: string;
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
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sentRequests, setSentRequests] = useState<PartnerRequest[]>([]);
  const [pendingChallenge, setPendingChallenge] = useState<{ senderId: string; materialId: string } | null>(null);

  const fetchData = async () => {
    try {
      const [partnersRes, requestsRes, sentRes] = await Promise.all([
        api.get('/users/partner'),
        api.get('/users/partner/requests'),
        api.get('/users/partner/sent'),
      ]);
      setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
      setRequests(requestsRes.data);
      setSentRequests(sentRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load partner data'));
    }
  };

  useEffect(() => {
    void fetchData();

    // Refresh partner data every 60s for fresh online status
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_invite', () => {
        toast.info('You received a study invite!');
        fetchData();
      });

      socket.on('receive_challenge', (data: { senderId: string; materialId: string }) => {
        setPendingChallenge(data);
      });

      socket.on('start_challenge', (data: { challengeId: string; materialId: string; questions: any[] }) => {
        toast.success('Challenge Accepted! Entering Arena...');
        navigate(`/arena/${data.challengeId}`, { state: { questions: data.questions } });
      });

      return () => {
        socket.off('receive_invite');
        socket.off('receive_challenge');
        socket.off('start_challenge');
      };
    }
  }, [socket, toast]);

  const [notFoundEmail, setNotFoundEmail] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    setNotFoundEmail(null);
    try {
      const res = await api.post('/users/partner/invite', { email: inviteEmail });
      toast.success('Invite sent successfully!');

      if (socket && res.data.receiverId) {
        socket.emit('invite_user', { senderId: user?.id, receiverId: res.data.receiverId });
      }

      setInviteEmail('');
      fetchData();

      // Request push notification permission after first invite
      const pushEnabled = await isPushEnabled();
      if (!pushEnabled) {
        const subscribed = await subscribeToPush();
        if (subscribed) {
          toast.success('Push notifications enabled!');
        }
      }
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

      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('not found') || lowerMessage.includes('no user') || lowerMessage.includes('does not exist')) {
        setNotFoundEmail(inviteEmail);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/signup?ref=${user?.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied! Share it with your friend.');
    setNotFoundEmail(null);
    setInviteEmail('');
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await api.delete(`/users/partner/invite/${id}`);
      toast.success('Invite cancelled');
      setSentRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to cancel invite'));
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
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to process request'));
    }
  };

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Offline';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 5 * 60 * 1000) return 'Online';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleNudge = async (partnerId: string) => {
    try {
      await api.post(`/users/partner/nudge/${partnerId}`);
      toast.success('Nudge sent! ⚡');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send nudge');
    }
  };

  const handleChallenge = (partnerId: string) => {
    const pathParts = window.location.pathname.split('/');
    const materialId = pathParts.includes('materials') ? pathParts[pathParts.indexOf('materials') + 1] : null;

    if (!materialId) {
      toast.error('Open a material to challenge a friend!');
      return;
    }

    if (socket) {
      socket.emit('challenge_request', {
        senderId: user?.id,
        receiverId: partnerId,
        materialId
      });
      toast.success('Challenge sent! Waiting for acceptance...');
    }
  };

  return (
    <div className='max-w-5xl mx-auto p-4 md:p-6 h-full overflow-y-auto'>
      {/* Two-column layout on desktop */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>

        {/* Left Column - Invite & Actions */}
        <div className='lg:col-span-1 space-y-4'>
          {/* Invite Card - Always Visible */}
          <div className='bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-lg'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='p-2 bg-white/20 rounded-xl'>
                <UserPlus className='w-5 h-5' />
              </div>
              <div>
                <h2 className='font-bold text-lg'>Invite Friend</h2>
                <p className='text-primary-100 text-xs'>Study together, grow together</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className='space-y-3'>
              <div className='relative'>
                <UserPlus className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60' />
                <input
                  type='text'
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setNotFoundEmail(null); }}
                  placeholder="Username or email"
                  className='w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/20 placeholder-white/60 text-white border border-white/20 focus:border-white/40 focus:ring-0 outline-none text-sm'
                />
              </div>
              <button
                type='submit'
                disabled={loading || !inviteEmail}
                className='w-full py-2.5 bg-white text-primary-600 rounded-xl font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {loading ? 'Sending...' : <><Send className='w-4 h-4' /> Send Invite</>}
              </button>
            </form>

            {notFoundEmail && (
              <div className='mt-3 p-3 bg-white/10 rounded-xl border border-white/20'>
                <p className='text-xs text-white/80 mb-2'>
                  {notFoundEmail.includes('@')
                    ? <><strong>{notFoundEmail}</strong> isn't on PeerToLearn yet.</>
                    : <>No user found with username <strong>{notFoundEmail}</strong>. Try their email instead!</>}
                </p>
                {notFoundEmail.includes('@') && (
                  <button
                    onClick={handleCopyInviteLink}
                    className='flex items-center gap-2 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors'
                  >
                    <Copy className='w-3 h-3' /> Copy Invite Link
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50'>
            <h3 className='font-bold text-gray-900 dark:text-gray-100 text-sm mb-3'>Your Network</h3>
            <div className='grid grid-cols-2 gap-3'>
              <div className='text-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl'>
                <div className='text-2xl font-bold text-primary-600 dark:text-primary-400'>{partners.length}</div>
                <div className='text-xs text-gray-500'>Partners</div>
              </div>
              <div className='text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl'>
                <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>{requests.length}</div>
                <div className='text-xs text-gray-500'>Pending</div>
              </div>
            </div>
          </div>

          {/* Pending Requests - Compact */}
          {requests.length > 0 && (
            <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden'>
              <div className='p-3 border-b border-gray-200/50 dark:border-gray-700/50'>
                <h3 className='font-bold text-gray-900 dark:text-gray-100 text-sm'>Pending Requests</h3>
              </div>
              <div className='divide-y divide-gray-200/50 dark:divide-gray-700/50'>
                {requests.map((req) => (
                  <div key={req.id} className='p-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm'>
                        {req.sender.firstName?.[0] || '?'}
                      </div>
                      <div>
                        <div className='font-medium text-gray-900 dark:text-gray-100 text-sm'>
                          {req.sender.firstName} {req.sender.lastName?.[0]}.
                        </div>
                      </div>
                    </div>
                    <div className='flex gap-1'>
                      <button
                        onClick={() => handleResponse(req.id, true)}
                        className='p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors'
                      >
                        <Check className='w-4 h-4' />
                      </button>
                      <button
                        onClick={() => handleResponse(req.id, false)}
                        className='p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests - Compact */}
          {sentRequests.length > 0 && (
            <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden'>
              <div className='p-3 border-b border-gray-200/50 dark:border-gray-700/50'>
                <h3 className='font-bold text-gray-900 dark:text-gray-100 text-sm'>Sent Requests</h3>
              </div>
              <div className='divide-y divide-gray-200/50 dark:divide-gray-700/50'>
                {sentRequests.map((req) => (
                  <div key={req.id} className='p-3 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm'>
                        {(req as any).receiver?.firstName?.[0] || '?'}
                      </div>
                      <span className='text-sm text-gray-700 dark:text-gray-300'>
                        {(req as any).receiver?.firstName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelInvite(req.id)}
                      className='text-xs text-gray-500 hover:text-red-500 transition-colors'
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Partners List */}
        <div className='lg:col-span-2'>
          {partners.length > 0 ? (
            <div className='space-y-3'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2'>
                <Users className='w-5 h-5 text-primary-500' />
                Study Partners
                <span className='text-sm font-normal text-gray-500'>({partners.length})</span>
              </h2>

              <div className='space-y-3'>
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 hover:shadow-md transition-all'
                  >
                    {/* Mobile: Vertical Stack / Desktop: Horizontal */}
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                      {/* Partner Info Row */}
                      <div className='flex items-center gap-3'>
                        <div className='relative flex-shrink-0'>
                          <div className='w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg'>
                            {partner.firstName[0]}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${formatLastSeen(partner.lastSeen) === 'Online' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                        </div>
                        <div className='min-w-0'>
                          <h3 className='font-bold text-gray-900 dark:text-gray-100 truncate'>
                            {partner.firstName} {partner.lastName}
                          </h3>
                          <div className='flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500'>
                            <span className='flex items-center gap-1'>
                              <span className='w-2 h-2 bg-green-400 rounded-full flex-shrink-0'></span>
                              {partner.currentStreak} day streak
                            </span>
                            <span className='flex items-center gap-1'>
                              <Clock className='w-3 h-3 flex-shrink-0' />
                              {formatLastSeen(partner.lastSeen)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Combined Streak Badge - Hidden on mobile */}
                      <div className='hidden md:block text-center bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-xl flex-shrink-0'>
                        <div className='text-2xl font-bold text-primary-600 dark:text-primary-400'>
                          {partner.combinedStreak}
                        </div>
                        <div className='text-xs text-gray-500'>Combined</div>
                      </div>

                      {/* Actions - Full width on mobile */}
                      <div className='flex items-center gap-2 sm:flex-shrink-0'>
                        <button
                          onClick={() => handleNudge(partner.id)}
                          className='flex-1 sm:flex-none px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center gap-1'
                          title='Send Nudge'
                        >
                          <span>⚡</span> Nudge
                        </button>
                        <button
                          onClick={() => handleChallenge(partner.id)}
                          className='flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:from-red-600 hover:to-orange-600 transition-colors shadow-sm flex items-center justify-center gap-1'
                          title='Challenge to Quiz'
                        >
                          <span>⚔️</span> Challenge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className='flex flex-col items-center justify-center h-full min-h-[400px] text-center'>
              <div className='w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-3xl flex items-center justify-center mb-6'>
                <Users className='w-10 h-10' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                No Study Partners Yet
              </h2>
              <p className='text-gray-500 max-w-sm mb-6'>
                Invite friends to study together. Track streaks, send nudges, and challenge each other to quizzes!
              </p>
              <div className='flex items-center gap-2 text-primary-600 dark:text-primary-400'>
                <ChevronRight className='w-4 h-4' />
                <span className='text-sm font-medium'>Use the invite form to get started</span>
              </div>
            </div>
          )
          }
        </div >
      </div >

      {/* Challenge Request Modal */}
      {
        pendingChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-yellow-500/50 animate-in fade-in zoom-in duration-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 dark:text-yellow-400">
                  <Swords className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Challenge Incoming!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  You have been challenged to a quiz battle!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPendingChallenge(null)}
                  className="py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    if (socket) {
                      socket.emit('challenge_response', {
                        senderId: pendingChallenge.senderId,
                        receiverId: user?.id,
                        materialId: pendingChallenge.materialId,
                        accept: true
                      });
                      toast.success('Challenge Accepted!');
                      setPendingChallenge(null);
                    }
                  }}
                  className="py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-colors shadow-lg"
                >
                  Accept!
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
