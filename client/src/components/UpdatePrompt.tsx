import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Component that shows a toast when a new version of the app is available.
 * Uses native service worker update detection instead of vite-plugin-pwa hooks.
 */
export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

  useEffect(() => {
    // Only run in browser with service worker support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      // New service worker activated, reload to get new content
      window.location.reload();
    };

    const detectUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowPrompt(true);
          return;
        }

        // Listen for new service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New version available
                setWaitingWorker(newWorker);
                setShowPrompt(true);
              }
            });
          }
        });

        // Periodically check for updates (every 30 minutes)
        const checkInterval = setInterval(
          () => {
            registration.update();
          },
          30 * 60 * 1000,
        );

        return () => clearInterval(checkInterval);
      } catch (error) {
        console.warn('Service worker update detection failed:', error);
      }
    };

    // Listen for controller changes (when skipWaiting is called)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );

    detectUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting and become active
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      className='fixed bottom-20 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[9999] 
      bg-primary-600 text-white px-4 py-3 rounded-xl shadow-xl 
      flex flex-row items-center gap-3 animate-slide-up md:max-w-sm'
    >
      <RefreshCw className='w-5 h-5 flex-shrink-0' />
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium'>New version available!</p>
        <p className='text-xs text-primary-100 truncate'>
          Refresh to get the latest features.
        </p>
      </div>
      <div className='flex gap-2 flex-shrink-0'>
        <button
          onClick={handleDismiss}
          className='text-xs px-2 py-1.5 hover:bg-primary-500 rounded transition-colors'
        >
          Later
        </button>
        <button
          onClick={handleUpdate}
          className='text-xs px-3 py-1.5 bg-white text-primary-600 font-medium rounded hover:bg-primary-50 transition-colors'
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
