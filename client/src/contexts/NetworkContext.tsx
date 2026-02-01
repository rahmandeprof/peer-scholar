import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { syncPendingActions, getPendingCount } from '../lib/syncQueue';

interface NetworkPreferences {
  autoPlayVideos: boolean;
  highQualityImages: boolean;
}

interface NetworkContextType {
  isOnline: boolean;
  isLowBandwidth: boolean;
  connectionType: string;
  saveData: boolean;
  preferences: NetworkPreferences;
  updatePreferences: (prefs: Partial<NetworkPreferences>) => void;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('4g');
  const [saveData, setSaveData] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<NetworkPreferences>(() => {
    const saved = localStorage.getItem('network_preferences');
    return saved
      ? JSON.parse(saved)
      : {
          autoPlayVideos: false,
          highQualityImages: false, // Default to false (smart mode)
        };
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

      if (conn) {
        setConnectionType(conn.effectiveType || '4g');
        setSaveData(conn.saveData || false);
      }
    };

    updateNetworkStatus();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (conn) {
      conn.addEventListener('change', updateNetworkStatus);
      return () => conn.removeEventListener('change', updateNetworkStatus);
    }
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      console.log('[Network] Back online, syncing pending actions...');
      await syncPendingActions();
      const count = await getPendingCount();
      setPendingSyncCount(count);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track pending sync count
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Check pending count on mount
  useEffect(() => {
    getPendingCount().then(setPendingSyncCount);
  }, []);

  // Manual trigger sync
  const triggerSync = useCallback(async () => {
    if (!isOnline) return;
    await syncPendingActions();
    const count = await getPendingCount();
    setPendingSyncCount(count);
  }, [isOnline]);

  const updatePreferences = (prefs: Partial<NetworkPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...prefs };
      localStorage.setItem('network_preferences', JSON.stringify(newPrefs));
      return newPrefs;
    });
  };

  // Determine if we should treat this as low bandwidth
  // True if:
  // 1. Browser reports saveData = true
  // 2. Connection is 2g or slow-2g
  // 3. User has NOT explicitly requested high quality images
  const isLowBandwidth =
    (saveData ||
      connectionType === 'slow-2g' ||
      connectionType === '2g' ||
      connectionType === '3g') &&
    !preferences.highQualityImages;

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isLowBandwidth,
        connectionType,
        saveData,
        preferences,
        updatePreferences,
        pendingSyncCount,
        triggerSync,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
