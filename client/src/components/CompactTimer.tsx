import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';

const MODES = {
  study: { minutes: 25, label: 'Focus Time', color: 'text-primary-600' },
  test: { minutes: 5, label: 'Test Mode', color: 'text-orange-500' },
  rest: { minutes: 10, label: 'Rest Break', color: 'text-blue-500' },
};

type TimerMode = keyof typeof MODES;

export function CompactTimer({ onComplete }: { onComplete?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<TimerMode>('study');
  const [timeLeft, setTimeLeft] = useState(MODES.study.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { success } = useToast();
  const { socket } = useSocket();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (socket) {
      socket.on('timer_update', (data: { action: string; time?: number; mode?: TimerMode }) => {
        setIsSynced(true);
        if (data.action === 'start') {
          setIsActive(true);
        } else if (data.action === 'pause') {
          setIsActive(false);
        } else if (data.action === 'update' && data.time !== undefined) {
          setTimeLeft(data.time);
        } else if (data.action === 'mode' && data.mode) {
          setMode(data.mode);
          setTimeLeft(MODES[data.mode].minutes * 60);
        }
      });
    }
  }, [socket]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => {
          const newTime = t - 1;
          return newTime;
        });
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
        if (onComplete) onComplete();
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
  }, [isActive, timeLeft, mode, success, onComplete]);

  const toggleTimer = () => {
    const newState = !isActive;
    setIsActive(newState);
    
    if (socket && isSynced) {
      // Broadcast state - Simplified for now without strict room tracking in this component
      // Ideally we should emit to the active room.
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeClick = () => {
    if (!isActive) {
      setIsEditing(true);
      setCustomMinutes(Math.floor(timeLeft / 60).toString());
    }
  };

  const handleTimeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const minutes = parseInt(customMinutes);
    if (!isNaN(minutes) && minutes > 0) {
      setTimeLeft(minutes * 60);
      setIsEditing(false);
    } else {
      setIsEditing(false); // Revert if invalid
    }
  };

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md relative">
      {isSynced && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" title="Synced with partner" />
      )}
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
          {isEditing ? (
            <form onSubmit={handleTimeSubmit} className="w-16">
              <input
                ref={inputRef}
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onBlur={() => handleTimeSubmit()}
                className="w-full text-xl font-bold font-mono text-gray-900 dark:text-gray-100 bg-transparent border-b border-primary-500 outline-none p-0"
                min="1"
              />
            </form>
          ) : (
            <span 
              onClick={handleTimeClick}
              className={`text-xl font-bold font-mono text-gray-900 dark:text-gray-100 ${!isActive ? 'cursor-pointer hover:text-primary-600 dark:hover:text-primary-400' : ''}`}
              title={!isActive ? "Click to edit duration" : ""}
            >
              {formatTime(timeLeft)}
            </span>
          )}
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
