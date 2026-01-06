import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Check, X, Mail, Shield, Clock, Swords } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/errorUtils';
import confetti from 'canvas-confetti';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

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
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receive_invite', () => {
        toast.info('You received a study invite!');
        fetchData();
      });

      socket.on('receive_challenge', (data: { senderId: string; materialId: string }) => {
        // Show a custom toast or modal to accept
        // For simplicity, using a toast with action (if library supports) or just a confirm dialog
        // Since standard toast might not support buttons easily without custom component,
        // I'll use a simple window.confirm for MVP or a custom toast if I can.
        // Let's try a custom toast content if the context allows, or just a separate state for "challengeRequest".

        // Actually, let's use a state to show a modal/alert in the UI.
        // But since this might happen anywhere, a global toast is better.
        // Let's assume toast supports it or we just auto-redirect to a "Challenge Pending" state?
        // No, "When accepted, redirect".

        // I'll trigger a browser notification or just a simple confirm for now to be robust.
        // "User X challenges you! Accept?"
        // If yes -> emit 'challenge_response'

        // Better: Set a state "pendingChallenge" and render a modal.
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

      // Notify via socket if connected
      if (socket && res.data.receiverId) {
        socket.emit('invite_user', { senderId: user?.id, receiverId: res.data.receiverId });
      }

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

      // Check if user was not found
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

    if (diff < 5 * 60 * 1000) return 'Online now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
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
                  <div className='flex justify-between items-start mb-4'>
                    <h3 className='text-lg font-bold flex items-center'>
                      <Shield className='w-5 h-5 mr-2' />
                      {partner.firstName} {partner.lastName}
                    </h3>
                    <div className='flex items-center text-xs bg-black/20 px-2 py-1 rounded-full'>
                      <Clock className='w-3 h-3 mr-1' />
                      {formatLastSeen(partner.lastSeen)}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center text-primary-100 font-medium'>
                      <span className='w-2.5 h-2.5 bg-green-400 rounded-full mr-2 shadow-[0_0_8px_rgba(74,222,128,0.6)]'></span>
                      {partner.currentStreak} day streak
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3 mt-4'>
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/users/partner/nudge/${partner.id}`);
                          toast.success('Nudge sent successfully! ⚡');
                        } catch (err: any) {
                          toast.error(
                            err.response?.data?.message || 'Failed to send nudge',
                          );
                        }
                      }}
                      className='py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-colors flex items-center justify-center text-sm'
                    >
                      Send Nudge ⚡
                    </button>
                    <button
                      onClick={() => {
                        // Invite to study logic
                        // Generate a room ID (e.g., sorted user IDs)
                        const roomId = [user?.id, partner.id].sort().join('_');
                        if (socket) {
                          socket.emit('join_study_room', roomId);
                          // Notify partner to join (could be a specific event or just rely on them joining)
                          // For now, let's assume we just join and wait/notify
                          toast.success('Joined study room. Waiting for partner...');
                        }
                      }}
                      className='py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-colors flex items-center justify-center text-sm'
                    >
                      Study Together 📚
                    </button>
                    <button
                      onClick={() => {
                        // Challenge logic
                        // We need a materialId to challenge on.
                        // Since StudyPartner is a page, we might not have a material context unless passed or in URL.
                        // However, the user flow is: Open Material -> Open Sidebar/Partner -> Challenge.
                        // If we are on /materials/:id, we can grab it.
                        // But StudyPartner is currently a full page route /study-partner.
                        // It should probably be a sidebar component too, but for now let's assume
                        // we can only challenge if we are "in a material context" or we prompt to select one?
                        // Simplified: Check if we have a materialId in localStorage or context?
                        // Or just prompt "Go to a material to challenge".

                        // Actually, let's check if we are in a material view context if this component is used there.
                        // If not, maybe disable or show tooltip.

                        // For this implementation, let's assume the user navigates to the material first,
                        // then opens the "Study Partner" sidebar (which we haven't fully implemented as a sidebar yet, it's a page).
                        // BUT, the requirements say "In the Peer Sidebar, add a 'Challenge' button".
                        // So I should probably assume this component is used in the sidebar or I should make it usable there.

                        // Let's just emit the event. If no materialId, the backend/frontend should handle it.
                        // Wait, the backend needs materialId to generate the quiz.
                        // I'll grab it from the URL if possible (if this component is rendered in a sidebar on /materials/:id).

                        const pathParts = window.location.pathname.split('/');
                        const materialId = pathParts.includes('materials') ? pathParts[pathParts.indexOf('materials') + 1] : null;

                        if (!materialId) {
                          toast.error('Open a material to challenge a friend!');
                          return;
                        }

                        if (socket) {
                          socket.emit('challenge_request', {
                            senderId: user?.id,
                            receiverId: partner.id,
                            materialId
                          });
                          toast.success('Challenge sent! Waiting for acceptance...');
                        }
                      }}
                      className='py-2 bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center text-sm shadow-lg'
                    >
                      Challenge ⚔️
                    </button>
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
              onChange={(e) => { setInviteEmail(e.target.value); setNotFoundEmail(null); }}
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

        {/* User not found - offer invite link */}
        {notFoundEmail && (
          <div className='mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl'>
            <p className='text-amber-800 dark:text-amber-200 mb-3'>
              <strong>{notFoundEmail}</strong> isn't on PeerToLearn yet. Share an invite link!
            </p>
            <button
              onClick={handleCopyInviteLink}
              className='px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors'
            >
              📋 Copy Invite Link
            </button>
          </div>
        )}
      </div>

      {/* Challenge Request Modal */}
      {pendingChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-yellow-500/50 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 dark:text-yellow-400">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Challenge Incoming!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                You have been challenged to a quiz battle! Do you accept?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPendingChallenge(null);
                  // Reject logic if needed
                }}
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
                    toast.success('Challenge Accepted! Preparing arena...');
                    setPendingChallenge(null);
                  }
                }}
                className="py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-yellow-500/30"
              >
                Accept Battle!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
