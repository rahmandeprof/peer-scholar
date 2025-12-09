import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { useTimerSettings } from '../hooks/useTimerSettings';
import { TimerSettingsModal } from './TimerSettingsModal';

type TimerMode = 'study' | 'test' | 'rest';

const MODE_LABELS: Record<TimerMode, { label: string; color: string }> = {
  study: { label: 'Focus Time', color: 'text-primary-600' },
  test: { label: 'Test Mode', color: 'text-orange-500' },
  rest: { label: 'Rest Break', color: 'text-blue-500' },
};

export function CompactTimer({ onComplete }: { onComplete?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { settings } = useTimerSettings();

  const [mode, setMode] = useState<TimerMode>('study');
  const [timeLeft, setTimeLeft] = useState(settings.studyDuration);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { success } = useToast();
  const { socket } = useSocket();
  const [isSynced, setIsSynced] = useState(false);

  // Get duration for current mode from settings
  const getDurationForMode = (m: TimerMode): number => {
    switch (m) {
      case 'study': return settings.studyDuration;
      case 'test': return settings.testDuration;
      case 'rest': return settings.restDuration;
    }
  };

  // Update timer when settings change and timer is not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(getDurationForMode(mode));
    }
  }, [settings, mode, isActive]);

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
          setTimeLeft(getDurationForMode(data.mode));
        }
      });
    }
  }, [socket, settings]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

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
      setTimeLeft(getDurationForMode(nextMode));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, success, onComplete, settings]);

  const toggleTimer = () => {
    setIsActive(!isActive);
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
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 transition-all hover:border-primary-500/50 relative group">
        {isSynced && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" title="Synced with partner" />
        )}

        <button
          onClick={toggleTimer}
          className={`mr-2 flex items-center justify-center transition-colors ${isActive
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
              className={`text-sm font-bold font-mono ${MODE_LABELS[mode].color} ${!isActive ? 'cursor-pointer hover:opacity-80' : ''}`}
              title={`${MODE_LABELS[mode].label} - Click to edit`}
            >
              {formatTime(timeLeft)}
            </span>
          )}
        </div>

        {/* Mode Toggle */}
        <button
          onClick={() => {
            const modes: TimerMode[] = ['study', 'test', 'rest'];
            const nextIdx = (modes.indexOf(mode) + 1) % modes.length;
            const nextMode = modes[nextIdx];
            setMode(nextMode);
            setTimeLeft(getDurationForMode(nextMode));
            setIsActive(false);
          }}
          className="ml-2 w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-primary-500 transition-colors"
          title={`Current: ${MODE_LABELS[mode].label} (Click to switch)`}
        />

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
          title="Timer Settings"
        >
          <Settings className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      <TimerSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

