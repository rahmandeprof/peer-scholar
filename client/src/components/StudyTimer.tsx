import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, BookOpen, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../contexts/ToastContext';

type TimerMode = 'study' | 'test' | 'rest';

const MODES: Record<TimerMode, { label: string; minutes: number; color: string; icon: React.ElementType }> = {
  study: { label: 'Focus', minutes: 25, color: 'bg-primary-500', icon: BookOpen },
  test: { label: 'Test', minutes: 5, color: 'bg-yellow-500', icon: CheckCircle },
  rest: { label: 'Rest', minutes: 10, color: 'bg-blue-500', icon: Coffee },
};

export function StudyTimer({ onSessionComplete }: { onSessionComplete?: () => void }) {
  const [mode, setMode] = useState<TimerMode>('study');
  const [timeLeft, setTimeLeft] = useState(MODES.study.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const { success } = useToast();

  const handleComplete = useCallback(async () => {
    setIsActive(false);
    if (sessionId) {
      try {
        await api.post('/study/end', { sessionId });
        if (onSessionComplete) onSessionComplete();
      } catch (err) {
        // console.error('Failed to end session', err);
      }
    }
    
    // Show completion notification and suggest next mode
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
    
    // Transition to next mode but don't auto-start
    setMode(nextMode);
    setSessionId(null);
  }, [sessionId, onSessionComplete, mode, success]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      void handleComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, handleComplete]);

  const handleStart = async () => {
    try {
      if (!sessionId) {
        const res = await api.post('/study/start', { type: mode });
        setSessionId(res.data.id);
      }
      setIsActive(true);
    } catch (err) {
      // console.error('Failed to start session', err);
    }
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].minutes * 60);
    setSessionId(null);
  };

  // Effect to update time when mode changes manually
  useEffect(() => {
    setTimeLeft(MODES[mode].minutes * 60);
    setIsActive(false);
    setSessionId(null);
  }, [mode]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const CurrentIcon = MODES[mode].icon;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-auto border border-primary-100">
      <div className="flex justify-center space-x-4 mb-8">
        {(Object.keys(MODES) as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={twMerge(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              mode === m 
                ? "bg-primary-100 text-primary-800 ring-2 ring-primary-500" 
                : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      <div className="text-center mb-8">
        <div className="relative inline-flex items-center justify-center">
            <div className={twMerge("absolute inset-0 rounded-full opacity-20 blur-xl", MODES[mode].color)}></div>
            <div className="relative text-8xl font-bold text-gray-800 font-mono tracking-tighter">
                {formatTime(timeLeft)}
            </div>
        </div>
        <div className="flex items-center justify-center mt-4 text-gray-500">
            <CurrentIcon className="w-5 h-5 mr-2" />
            <span className="uppercase tracking-widest text-sm font-semibold">{MODES[mode].label} Mode</span>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {!isActive ? (
          <button
            onClick={handleStart}
            className="flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-primary-200"
          >
            <Play className="w-6 h-6 mr-2" fill="currentColor" />
            Start
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-yellow-200"
          >
            <Pause className="w-6 h-6 mr-2" fill="currentColor" />
            Pause
          </button>
        )}
        
        <button
          onClick={handleReset}
          className="p-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
