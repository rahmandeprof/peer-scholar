import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const MODES = {
  study: { minutes: 25, label: 'Focus Time', color: 'text-primary-600' },
  test: { minutes: 5, label: 'Test Mode', color: 'text-orange-500' },
  rest: { minutes: 10, label: 'Rest Break', color: 'text-blue-500' },
};

type TimerMode = keyof typeof MODES;

export function CompactTimer() {
  const [mode, setMode] = useState<TimerMode>('study');
  const [timeLeft, setTimeLeft] = useState(MODES.study.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { success } = useToast();

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Show completion notification and transition to next mode
      let nextMode: TimerMode;
      let message: string;
      
      if (mode === 'study') {
        nextMode = 'test';
        message = '🎯 Focus session complete! Time for a quick test.';
      } else if (mode === 'test') {
        nextMode = 'rest';
        message = '✅ Test complete! Take a well-deserved rest break.';
      } else {
        nextMode = 'study';
        message = '☕ Rest complete! Ready for another focus session?';
      }
      
      success(message, 6000);
      setMode(nextMode);
      setTimeLeft(MODES[nextMode].minutes * 60);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, success]);

  const toggleTimer = () => setIsActive(!isActive);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col">
          <button 
            onClick={() => {
              const modes: TimerMode[] = ['study', 'test', 'rest'];
              const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
              const nextMode = modes[nextIdx];
              setMode(nextMode);
              setTimeLeft(MODES[nextMode].minutes * 60);
              setIsActive(false);
            }}
            className={`text-xs font-medium uppercase tracking-wider hover:opacity-80 ${MODES[mode].color}`}
          >
            {MODES[mode].label}
          </button>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">
            {formatTime(timeLeft)}
          </span>
        </div>
        
        <button
          onClick={toggleTimer}
          className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
            isActive 
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
              : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>
    </div>
  );
}
