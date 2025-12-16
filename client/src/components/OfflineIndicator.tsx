import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';

export function OfflineIndicator() {
    const { isOnline } = useNetwork();

    if (isOnline) return null;

    return (
        <div className='fixed top-0 left-0 right-0 z-[1100] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-slide-down'>
            <WifiOff className='w-4 h-4' />
            <span>You're offline</span>
            <button
                onClick={() => window.location.reload()}
                className='ml-2 p-1 hover:bg-amber-600 rounded transition-colors active:scale-95'
                title='Retry'
            >
                <RefreshCw className='w-4 h-4' />
            </button>
        </div>
    );
}

export default OfflineIndicator;
