/**
 * Save for Offline Button Component
 * Allows users to explicitly save materials for offline access
 */
import { useState, useEffect } from 'react';
import { Download, Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import {
  isMaterialOffline,
  saveMaterialOffline,
  deleteMaterialOffline,
} from '../lib/offlineStorage';
import api from '../lib/api';

interface SaveOfflineButtonProps {
  materialId: string;
  materialTitle: string;
  /** Compact mode for smaller cards */
  compact?: boolean;
  /** Optional callback when offline status changes */
  onStatusChange?: (isOffline: boolean) => void;
}

export function SaveOfflineButton({
  materialId,
  materialTitle,
  compact = false,
  onStatusChange,
}: SaveOfflineButtonProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if material is already saved offline
  useEffect(() => {
    isMaterialOffline(materialId).then((offline) => {
      setIsOffline(offline);
      setChecking(false);
    });
  }, [materialId]);

  const handleToggleOffline = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    try {
      if (isOffline) {
        // Remove from offline storage
        await deleteMaterialOffline(materialId);
        setIsOffline(false);
        onStatusChange?.(false);
      } else {
        // Download and save for offline
        const response = await api.get(`/materials/${materialId}/download`, {
          responseType: 'blob',
        });
        await saveMaterialOffline(
          materialId,
          materialTitle,
          response.data as Blob,
          true, // user-saved
        );
        setIsOffline(true);
        onStatusChange?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle offline status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div
        className={`${compact ? 'p-1' : 'p-2'} text-gray-400`}
        title='Checking offline status...'
      >
        <Loader2
          className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handleToggleOffline}
        disabled={loading}
        className={`p-1 rounded transition-colors ${
          isOffline
            ? 'text-cyan-500 hover:text-cyan-600'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        title={
          isOffline ? 'Available offline (tap to remove)' : 'Save for offline'
        }
      >
        {loading ? (
          <Loader2 className='w-4 h-4 animate-spin' />
        ) : isOffline ? (
          <Check className='w-4 h-4' />
        ) : (
          <Download className='w-4 h-4' />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleOffline}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
        isOffline
          ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title={
        isOffline ? 'Remove from offline storage' : 'Save for offline access'
      }
    >
      {loading ? (
        <>
          <Loader2 className='w-5 h-5 animate-spin' />
          <span className='text-sm'>
            {isOffline ? 'Removing...' : 'Saving...'}
          </span>
        </>
      ) : isOffline ? (
        <>
          <Cloud className='w-5 h-5' />
          <span className='text-sm'>Available Offline</span>
        </>
      ) : (
        <>
          <CloudOff className='w-5 h-5' />
          <span className='text-sm'>Save Offline</span>
        </>
      )}
    </button>
  );
}

/**
 * Small badge indicator showing offline status
 */
export function OfflineBadge({ materialId }: { materialId: string }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    isMaterialOffline(materialId).then(setIsOffline);
  }, [materialId]);

  if (!isOffline) return null;

  return (
    <div
      className='absolute top-2 right-2 p-1 bg-cyan-500/90 text-white rounded-full'
      title='Available offline'
    >
      <Cloud className='w-3 h-3' />
    </div>
  );
}

export default SaveOfflineButton;
