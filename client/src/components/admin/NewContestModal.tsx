import { useState } from 'react';
import { X, Plus, Trash2, Calendar, Trophy } from 'lucide-react';
import { BorderSpinner } from '../Skeleton';
import api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface NewContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewContestModal({
  isOpen,
  onClose,
  onSuccess,
}: NewContestModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rules, setRules] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dynamic prizes state
  const [prizes, setPrizes] = useState<Array<{ rank: string; reward: string }>>(
    [
      { rank: '1st', reward: '' },
      { rank: '2nd', reward: '' },
      { rank: '3rd', reward: '' },
    ],
  );

  if (!isOpen) return null;

  const handleAddPrize = () => {
    setPrizes([...prizes, { rank: `${prizes.length + 1}th`, reward: '' }]);
  };

  const handleRemovePrize = (index: number) => {
    const newPrizes = [...prizes];
    newPrizes.splice(index, 1);
    setPrizes(newPrizes);
  };

  const handlePrizeChange = (
    index: number,
    field: 'rank' | 'reward',
    value: string,
  ) => {
    const newPrizes = [...prizes];
    newPrizes[index][field] = value;
    setPrizes(newPrizes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !startDate || !endDate) {
      toast.error('Name, start date, and end date are required');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    // Convert prizes array to Record<string, string> JSON for the backend
    const prizeConfig: Record<string, string> = {};
    prizes.forEach((p) => {
      if (p.rank && p.reward) {
        prizeConfig[p.rank] = p.reward;
      }
    });

    setLoading(true);
    try {
      await api.post('/contests', {
        name,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        rules,
        isActive,
        prizeConfig:
          Object.keys(prizeConfig).length > 0 ? prizeConfig : undefined,
      });

      toast.success('Contest created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create contest:', err);
      toast.error(err.response?.data?.message || 'Failed to create contest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in'>
      <div
        className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center'>
              <Trophy className='w-5 h-5 text-amber-600 dark:text-amber-500' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Create Referral Contest
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Launch a new competition to drive user growth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
          <form id='contest-form' onSubmit={handleSubmit} className='space-y-6'>
            {/* Basic Info */}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Contest Name *
                </label>
                <input
                  type='text'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g., Spring 2026 Mega Referral Drive'
                  required
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Brief description of the contest goals and vibe'
                  rows={2}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500'
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' /> Start Date *
                  </label>
                  <input
                    type='datetime-local'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' /> End Date *
                  </label>
                  <input
                    type='datetime-local'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500'
                  />
                </div>
              </div>
            </div>

            {/* Prizes Configuration */}
            <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-gray-900 dark:text-white'>
                  Prize Structure
                </h3>
                <button
                  type='button'
                  onClick={handleAddPrize}
                  className='text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 flex items-center'
                >
                  <Plus className='w-4 h-4 mr-1' /> Add Prize
                </button>
              </div>

              {prizes.length === 0 ? (
                <p className='text-sm text-gray-500 dark:text-gray-400 italic text-center py-2'>
                  No prizes configured. This will be a leaderboard-only contest.
                </p>
              ) : (
                <div className='space-y-3'>
                  {prizes.map((prize, idx) => (
                    <div key={idx} className='flex items-center gap-3'>
                      <input
                        type='text'
                        value={prize.rank}
                        onChange={(e) =>
                          handlePrizeChange(idx, 'rank', e.target.value)
                        }
                        placeholder='e.g. 1st, Top 5, etc.'
                        className='w-1/3 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm'
                      />
                      <input
                        type='text'
                        value={prize.reward}
                        onChange={(e) =>
                          handlePrizeChange(idx, 'reward', e.target.value)
                        }
                        placeholder='e.g. $500, MacBook, etc.'
                        className='flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm'
                      />
                      <button
                        type='button'
                        onClick={() => handleRemovePrize(idx)}
                        className='p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rules and Activation */}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Contest Rules (Markdown supported)
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder='1. Only verified referrals count...'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 font-mono text-sm'
                />
              </div>

              <label className='flex items-center gap-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                <input
                  type='checkbox'
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className='w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500'
                />
                <div>
                  <div className='font-medium text-gray-900 dark:text-white'>
                    Set as Active Contest Immediately
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    This will replace any currently active contest on the
                    platform.
                  </div>
                </div>
              </label>
            </div>
          </form>
        </div>

        <div className='p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 shrink-0'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-5 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            type='submit'
            form='contest-form'
            disabled={loading}
            className='px-5 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 min-w-[120px] flex items-center justify-center'
          >
            {loading ? <BorderSpinner size='sm' /> : 'Create Contest'}
          </button>
        </div>
      </div>
    </div>
  );
}
