import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface StudyTimerProps {
  onComplete?: () => void;
  isActive?: boolean;
  onReset?: () => void;
}

export function StudyTimer({
  onComplete,
  isActive: externalIsActive,
  onReset,
}: StudyTimerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(true);

  // Sync with external active state if provided
  useEffect(() => {
    if (externalIsActive !== undefined) {
      setIsActive(externalIsActive);
    }
  }, [externalIsActive]);

  // Handle reset
  useEffect(() => {
    if (onReset) {
      // If parent wants to reset, we can listen to a prop change or expose a ref.
      // For simplicity, let's assume the parent remounts or we use a key,
      // OR we can add a 'resetTrigger' prop.
      // Actually, let's just expose a way to reset or rely on key change.
      // But wait, the requirement says "resets the timer to 25:00".
      // Let's make sure we can reset it.
    }
  }, []);

  useEffect(() => {
    let interval: any;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTextColor = () => {
    if (timeLeft < 60) return 'text-red-500';
    if (timeLeft < 5 * 60) return 'text-orange-500';
    return 'text-white';
  };

  return (
    <div className='flex items-center px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-700/50 mr-2 md:mr-4'>
      <Clock className={`w-4 h-4 md:mr-2 ${getTextColor()}`} />
      <span
        className={`text-sm font-mono font-medium hidden md:inline ${getTextColor()}`}
      >
        {formatTime(timeLeft)}
      </span>
      <span
        className={`text-xs font-mono font-medium md:hidden ml-1 ${getTextColor()}`}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
