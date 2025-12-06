import { useState, useEffect } from 'react';
import { Check, Plus, X, Target } from 'lucide-react';

interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

export function StudySessionGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');

  // Load from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('study_session_goals');
    if (saved) {
      try {
        setGoals(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse goals', e);
      }
    }
  }, []);

  // Save to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('study_session_goals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;

    const goal: Goal = {
      id: Date.now().toString(),
      text: newGoal.trim(),
      completed: false,
    };

    setGoals([...goals, goal]);
    setNewGoal('');
  };

  const toggleGoal = (id: string) => {
    setGoals(
      goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)),
    );
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  return (
    <div className='p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm'>
      <div className='flex items-center mb-4'>
        <div className='p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3'>
          <Target className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
        </div>
        <h3 className='font-bold text-gray-900 dark:text-gray-100 text-sm'>
          Session Goals
        </h3>
      </div>

      <form onSubmit={addGoal} className='mb-4 relative'>
        <input
          type='text'
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder='Add a goal...'
          className='w-full pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all'
        />
        <button
          type='submit'
          disabled={!newGoal.trim()}
          className='absolute right-1.5 top-1.5 p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors disabled:opacity-50'
        >
          <Plus className='w-4 h-4' />
        </button>
      </form>

      <div className='space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar'>
        {goals.length === 0 && (
          <p className='text-xs text-gray-400 text-center py-2 italic'>
            No goals set for this session.
          </p>
        )}
        {goals.map((goal) => (
          <div
            key={goal.id}
            className='group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
          >
            <div className='flex items-center flex-1 min-w-0 mr-2'>
              <button
                onClick={() => toggleGoal(goal.id)}
                className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors mr-3 ${
                  goal.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                }`}
              >
                {goal.completed && <Check className='w-3 h-3' />}
              </button>
              <span
                className={`text-sm truncate transition-all ${
                  goal.completed
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {goal.text}
              </span>
            </div>
            <button
              onClick={() => deleteGoal(goal.id)}
              className='opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all'
            >
              <X className='w-3 h-3' />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
