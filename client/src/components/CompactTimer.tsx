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
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 transition-all hover:border-primary-500/50 relative group">
      {isSynced && (
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" title="Synced with partner" />
      )}
      
      <button
        onClick={toggleTimer}
        className={`mr-2 flex items-center justify-center transition-colors ${
          isActive 
            ? 'text-red-500' 
            : 'text-primary-600 dark:text-primary-400'
        }`}
      >
        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="flex items-center">
        {isEditing ? (
          <form onSubmit={handleTimeSubmit} className="w-12">
            <input
              ref={inputRef}
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onBlur={() => handleTimeSubmit()}
              className="w-full text-sm font-bold font-mono text-gray-900 dark:text-gray-100 bg-transparent border-b border-primary-500 outline-none p-0"
              min="1"
            />
          </form>
        ) : (
          <span 
            onClick={handleTimeClick}
            className={`text-sm font-bold font-mono ${MODES[mode].color} ${!isActive ? 'cursor-pointer hover:opacity-80' : ''}`}
            title={`${MODES[mode].label} - Click to edit`}
          >
            {formatTime(timeLeft)}
          </span>
        )}
      </div>

      {/* Hidden Mode Toggle (Visible on Hover or via small dot) */}
      <button 
        onClick={() => {
          const modes: TimerMode[] = ['study', 'test', 'rest'];
          const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
          const nextMode = modes[nextIdx];
          setMode(nextMode);
          setTimeLeft(MODES[nextMode].minutes * 60);
          setIsActive(false);
        }}
        className="ml-2 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-primary-500 transition-colors"
        title={`Current: ${MODES[mode].label} (Click to switch)`}
      />
    </div>
  );
}
