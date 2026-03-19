import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Copy,
  Share2,
  Medal,
  Info,
  Users,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';

interface Contest {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  prizeConfig: any;
  rules: any;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  qualifiedCount: number;
  lastQualifiedAt: string;
}

interface MyStats {
  isActive: boolean;
  qualifiedCount: number;
  rank: number | null;
  contestId?: string;
  contestName?: string;
  endDate?: string;
  prizeConfig?: any;
}

export function ContestDashboard() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myStats, setMyStats] = useState<MyStats>({
    isActive: false,
    qualifiedCount: 0,
    rank: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const activeRes = await api.get('/contests/active');
      setContest(activeRes.data);

      if (activeRes.data) {
        const [statsRes, boardRes] = await Promise.all([
          api.get('/contests/active/my-stats'),
          api.get('/contests/active/leaderboard'),
        ]);

        setMyStats(statsRes.data);
        setLeaderboard(boardRes.data || []);
      }
    } catch (err: any) {
      // If 404, it means no active contest. We can swallow it safely.
      if (err.response?.status !== 404) {
        console.error('Failed to load contest data', err);
        setError('Could not load contest data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Poll leaderboard every 15 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Handle Referrals tracking event analytics if standard mixpanel/amplitude isn't available
  const logAnalytics = (event: string) => {
    console.log(`[ANALYTICS] Event Triggered: ${event}`);
  };

  useEffect(() => {
    logAnalytics('contest_dashboard_viewed');
  }, []);

  const referralLink = `${window.location.origin}/signup?ref=${user?.referralCode || ''}`;

  const handleCopyLink = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(referralLink);
      success('Referral link copied to clipboard!');
      logAnalytics('referral_link_copied');
    } else {
      toastError('Referral code not available. Please try refreshing.');
    }
  };

  const handleShareLink = async () => {
    if (!user?.referralCode) return;

    const shareData = {
      title: 'Join me on PeerToLearn',
      text: 'Sign up for PeerToLearn using my referral link to study smarter!',
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        logAnalytics('referral_link_shared');
      } catch (err) {
        console.warn('Native share failed, falling back to copy', err);
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-12 min-h-[50vh]'>
        <BorderSpinner size='lg' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8 flex flex-col items-center text-center'>
        <AlertCircle className='w-12 h-12 text-red-500 mb-4' />
        <h2 className='text-xl font-bold mb-2'>Oops!</h2>
        <p className='text-gray-500 max-w-md'>{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className='mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700'
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className='p-8 max-w-4xl mx-auto'>
        <div className='bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-xl border border-gray-100 dark:border-gray-700'>
          <Trophy className='w-20 h-20 text-gray-300 mx-auto mb-6' />
          <h2 className='text-3xl font-extrabold text-gray-900 dark:text-white mb-4'>
            No Active Contest
          </h2>
          <p className='text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto'>
            There are currently no active referral contests. Check back later
            for upcoming opportunities to win amazing prizes just by sharing
            PeerToLearn with your peers!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pb-24'>
      {/* Header Banner */}
      <div className='relative overflow-hidden bg-gradient-to-br from-indigo-600 via-primary-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl'>
        <div className='absolute top-0 right-0 p-8 opacity-20 transform translate-x-8 -translate-y-8'>
          <Trophy className='w-64 h-64' />
        </div>

        <div className='relative z-10 max-w-2xl'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-6'>
            <span className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
            LIVE CONTEST
          </div>
          <h1 className='text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg text-white'>
            {contest.name}
          </h1>
          <p className='text-lg md:text-xl text-primary-100 mb-8 max-w-lg leading-relaxed'>
            Invite your peers to join and complete their first study session.
            Climb the leaderboard to win exclusive tech prizes!
          </p>

          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden p-1 min-w-[300px] shadow-inner transition-colors hover:bg-white/15'>
              <div className='flex-1 truncate px-4 font-mono text-sm opacity-90 text-white'>
                {referralLink}
              </div>
              <button
                onClick={handleCopyLink}
                className='p-3 bg-white text-primary-700 rounded-lg font-bold shadow-lg hover:bg-gray-50 hover:scale-105 transition-all flex items-center gap-2'
              >
                <Copy className='w-4 h-4' />
                <span className='hidden sm:inline'>Copy</span>
              </button>
            </div>

            <button
              onClick={handleShareLink}
              className='p-4 bg-purple-500/80 backdrop-blur-md border border-purple-400/50 rounded-xl font-bold shadow-lg hover:bg-purple-500 hover:scale-105 transition-all flex items-center justify-center gap-2 text-white'
            >
              <Share2 className='w-5 h-5' />
              <span className='sm:hidden'>Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Main Leaderboard Column */}
        <div className='lg:col-span-8 flex flex-col gap-6'>
          {/* User Stats Card */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative'>
            <div className='absolute -right-6 -bottom-6 opacity-5'>
              <Medal className='w-48 h-48' />
            </div>

            <div className='relative z-10 flex items-center gap-4'>
              <div className='w-16 h-16 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg'>
                #{myStats.rank || '-'}
              </div>
              <div>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase'>
                  Your Current Rank
                </p>
                <h3 className='text-3xl font-extrabold text-gray-900 dark:text-white'>
                  {myStats.rank ? `Top ${myStats.rank}` : 'Unranked'}
                </h3>
              </div>
            </div>

            <div className='relative z-10 flex items-center gap-4'>
              <div className='text-right'>
                <p className='text-sm text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase'>
                  Valid Referrals
                </p>
                <h3 className='text-3xl font-extrabold text-gray-900 dark:text-white'>
                  {myStats.qualifiedCount}
                </h3>
              </div>
              <div className='w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-800'>
                <Users className='w-8 h-8' />
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex-1'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900'>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                <Trophy className='w-6 h-6 text-amber-500' />
                Live Leaderboard
              </h3>
              <div className='flex items-center gap-2 text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full'>
                <span className='w-2 h-2 rounded-full bg-amber-500 animate-pulse'></span>
                Live Updates
              </div>
            </div>

            <div className='divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar p-2'>
              {leaderboard.length === 0 ? (
                <div className='p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-4'>
                  <Users className='w-12 h-12 opacity-50' />
                  <p>
                    The leaderboard is currently empty. Be the first to secure a
                    spot!
                  </p>
                </div>
              ) : (
                leaderboard.map((entry) => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center justify-between p-4 rounded-xl mb-1 transition-colors ${
                        isMe
                          ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className='flex items-center gap-4'>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                            entry.rank === 1
                              ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 ring-4 ring-yellow-500/20'
                              : entry.rank === 2
                                ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900 ring-4 ring-gray-400/20'
                                : entry.rank === 3
                                  ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white ring-4 ring-amber-700/20'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {entry.rank}
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${isMe ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}
                          >
                            {entry.firstName} {entry.lastName}
                            {isMe && (
                              <span className='ml-2 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full'>
                                You
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold text-lg text-gray-900 dark:text-white'>
                          {entry.qualifiedCount}
                        </span>
                        <span className='text-xs text-gray-500 uppercase font-semibold'>
                          pts
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className='lg:col-span-4 flex flex-col gap-6'>
          {/* Rules Card */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-900'>
              <Info className='w-5 h-5 text-purple-600 dark:text-purple-400' />
              <h3 className='font-bold text-gray-900 dark:text-white'>
                How to Qualify
              </h3>
            </div>
            <div className='p-6 space-y-4'>
              <div className='flex gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold'>
                  1
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    Share your link
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Friends must sign up using your unique referral link.
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold'>
                  2
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    Verify Email
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Your friend must verify their email address and complete
                    onboarding.
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 font-bold'>
                  3
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    Meaningful Action
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Your friend must complete an anti-idle protected study
                    session.
                  </p>
                </div>
              </div>
              <div className='mt-6 pt-4 border-t border-gray-100 dark:border-gray-700'>
                <p className='text-xs text-gray-400 italic'>
                  Fraudulent accounts (self-referrals, spam emails) will be
                  automatically disqualified and may result in account
                  suspension.
                </p>
              </div>
            </div>
          </div>

          {/* Prizes Card */}
          {contest.prizeConfig && (
            <div className='bg-gradient-to-b from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-amber-200 dark:border-gray-700 overflow-hidden'>
              <div className='p-5 border-b border-amber-100 dark:border-gray-700 flex items-center gap-2 bg-amber-100/50 dark:bg-gray-800'>
                <Trophy className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                <h3 className='font-bold text-gray-900 dark:text-white'>
                  Contest Prizes
                </h3>
              </div>
              <div className='p-6 space-y-4'>
                {Object.entries(contest.prizeConfig).map(
                  ([rankings, prize]: any, i) => (
                    <div
                      key={i}
                      className='flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-gray-700 shadow-sm'
                    >
                      <div className='w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold mb-1'>
                        {rankings}
                      </div>
                      <div className='font-semibold text-gray-800 dark:text-gray-200'>
                        {prize}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
