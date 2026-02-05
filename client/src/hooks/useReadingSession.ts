import { useRef, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { accumulateReadingTime } from '../lib/offlineReadingTracker';

interface UseReadingSessionOptions {
  sessionId: string | null;
  materialId: string | undefined;
  initialSeconds?: number;
}

interface UseReadingSessionReturn {
  getElapsedSeconds: () => number;
  sessionStartTimeRef: React.RefObject<number>;
  readingSecondsRef: React.RefObject<number>;
}

/**
 * Hook to manage reading session tracking with:
 * - 30-second heartbeat updates
 * - Visibility change handling (pauses when tab hidden)
 * - sendBeacon cleanup on page unload
 * - Offline fallback accumulation
 */
export function useReadingSession({
  sessionId,
  materialId,
  initialSeconds = 0,
}: UseReadingSessionOptions): UseReadingSessionReturn {
  const readingSecondsRef = useRef(initialSeconds);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const sessionStartTimeRef = useRef<number>(
    sessionId ? Date.now() - initialSeconds * 1000 : 0,
  );

  // Update start time when session changes
  useEffect(() => {
    if (sessionId) {
      sessionStartTimeRef.current = Date.now() - initialSeconds * 1000;
      readingSecondsRef.current = initialSeconds;
    }
  }, [sessionId, initialSeconds]);

  // Get elapsed seconds accounting for paused time
  const getElapsedSeconds = useCallback(() => {
    if (!sessionStartTimeRef.current) return 0;
    const totalElapsed = Date.now() - sessionStartTimeRef.current;
    return Math.floor(Math.max(0, totalElapsed) / 1000);
  }, []);

  // Main heartbeat and cleanup effect
  useEffect(() => {
    if (!sessionId || !sessionStartTimeRef.current) return;

    // Track if we're paused due to visibility
    let isPaused = false;
    let pausedAt = 0;
    let totalPausedTime = 0;

    const getAccurateElapsedSeconds = () => {
      const totalElapsed = Date.now() - sessionStartTimeRef.current;
      const activeTime =
        totalElapsed - totalPausedTime - (isPaused ? Date.now() - pausedAt : 0);
      return Math.floor(Math.max(0, activeTime) / 1000);
    };

    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (isPaused) return;

        const elapsedSeconds = getAccurateElapsedSeconds();
        readingSecondsRef.current = elapsedSeconds;

        // Send heartbeat to backend (or accumulate locally if offline)
        if (navigator.onLine) {
          api
            .post('/study/reading/heartbeat', {
              sessionId,
              seconds: elapsedSeconds,
            })
            .catch(console.error);
        }
        // Always accumulate locally as fallback
        if (materialId) {
          accumulateReadingTime(materialId, 30);
        }
      }, 30000); // Every 30 seconds
    };

    // Handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        pausedAt = Date.now();
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        if (isPaused) {
          totalPausedTime += Date.now() - pausedAt;
          isPaused = false;
          pausedAt = 0;
          startHeartbeat();
        }
      }
    };

    // Use sendBeacon for reliable delivery on page unload
    const sendEndRequest = () => {
      const elapsedSeconds = getAccurateElapsedSeconds();
      if (elapsedSeconds >= 5) {
        // Always accumulate locally first as safety net
        if (materialId) {
          accumulateReadingTime(materialId, elapsedSeconds);
        }

        if (navigator.onLine) {
          const token = localStorage.getItem('token');
          const apiBaseUrl =
            (import.meta.env.VITE_API_URL as string | undefined) ??
            'https://peerscholar.onrender.com/v1';
          const endpointUrl = `${apiBaseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1/study/reading/end`;

          const data = JSON.stringify({
            sessionId,
            seconds: elapsedSeconds,
            _token: token,
          });

          const sent = navigator.sendBeacon(
            endpointUrl,
            new Blob([data], { type: 'application/json' }),
          );
          if (!sent) {
            api
              .post('/study/reading/end', {
                sessionId,
                seconds: elapsedSeconds,
              })
              .catch(console.error);
          }
        }
      }
    };

    const handleBeforeUnload = () => sendEndRequest();

    // Start
    startHeartbeat();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendEndRequest();
    };
  }, [sessionId, materialId]);

  return {
    getElapsedSeconds,
    sessionStartTimeRef,
    readingSecondsRef,
  };
}
