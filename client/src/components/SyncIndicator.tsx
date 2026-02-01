import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { getPendingResultsCount } from '../lib/offlineQuizStore';
import { getUnsyncedReadingTime } from '../lib/offlineReadingTracker';
import { getPendingCount as getSyncQueueCount } from '../lib/syncQueue';

type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

export function SyncIndicator() {
  const { isOnline } = useNetwork();
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkPending = async () => {
      if (!isOnline) {
        setStatus('offline');
        return;
      }

      const quizPending = await getPendingResultsCount();
      const readingPending = getUnsyncedReadingTime() > 0 ? 1 : 0;
      const syncQueuePending = await getSyncQueueCount();
      const total = quizPending + readingPending + syncQueuePending;

      setPendingCount(total);
      setStatus(total > 0 ? 'pending' : 'synced');
    };

    checkPending();

    // Check every 10 seconds
    const interval = setInterval(checkPending, 10000);

    // Also check when coming back online
    const handleOnline = () => {
      setStatus('syncing');
      setTimeout(checkPending, 3000); // Check after sync has a chance to complete
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [isOnline]);

  // Don't show anything if synced
  if (status === 'synced') return null;

  const getIcon = () => {
    switch (status) {
      case 'offline':
        return <CloudOff className='w-4 h-4' />;
      case 'syncing':
        return <RefreshCw className='w-4 h-4 animate-spin' />;
      case 'pending':
        return <Cloud className='w-4 h-4' />;
      default:
        return <Check className='w-4 h-4' />;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'offline':
        return 'Offline - changes saved locally';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return `${pendingCount} pending sync${pendingCount !== 1 ? 's' : ''}`;
      default:
        return 'All synced';
    }
  };

  const getColorClass = () => {
    switch (status) {
      case 'offline':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'syncing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    }
  };

  return (
    <div
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 px-3 py-2 rounded-full flex items-center gap-2 text-xs font-medium shadow-lg ${getColorClass()}`}
    >
      {getIcon()}
      <span className='hidden sm:inline'>{getMessage()}</span>
    </div>
  );
}

export default SyncIndicator;
