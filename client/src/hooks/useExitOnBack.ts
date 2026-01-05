import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook that implements "exit on back" behavior for the home screen.
 * 
 * When the user is on the dashboard (home), pressing back should:
 * - In PWA: Close the app or show "Press back again to exit"
 * - In browser: Navigate out of the app (to previous site or blank)
 * 
 * This prevents confusing navigation loops where back goes to previous
 * in-app routes instead of exiting.
 */
export function useExitOnBack(isHomePage: boolean) {
    const location = useLocation();
    const hasReplacedHistory = useRef(false);
    const lastBackPressTime = useRef(0);

    useEffect(() => {
        if (!isHomePage) {
            hasReplacedHistory.current = false;
            return;
        }

        // Only run once when landing on home
        if (hasReplacedHistory.current) return;

        // Clear navigation history by replacing current state
        // This makes "back" exit the app instead of going to previous routes
        const clearHistoryStack = () => {
            // Replace current history entry with home as the first entry
            window.history.replaceState(
                { isHome: true, timestamp: Date.now() },
                '',
                location.pathname
            );
            hasReplacedHistory.current = true;
        };

        // Small delay to ensure navigation completed
        const timer = setTimeout(clearHistoryStack, 100);

        return () => clearTimeout(timer);
    }, [isHomePage, location.pathname]);

    useEffect(() => {
        if (!isHomePage) return;

        const handlePopState = (event: PopStateEvent) => {
            const now = Date.now();
            const isHomeState = event.state?.isHome;

            // If we're on home and user presses back
            if (isHomePage && !isHomeState) {
                // Check if this is a double-back (within 2 seconds)
                if (now - lastBackPressTime.current < 2000) {
                    // PWA: Try to close, or navigate away
                    if (window.matchMedia('(display-mode: standalone)').matches) {
                        // In PWA, closing window doesn't work well, so navigate to about:blank
                        window.location.href = 'about:blank';
                    } else {
                        // In browser, go back to previous site
                        window.history.back();
                    }
                } else {
                    // First back press - push state back and show hint (via toast)
                    lastBackPressTime.current = now;
                    window.history.pushState(
                        { isHome: true, timestamp: now },
                        '',
                        location.pathname
                    );

                    // Dispatch event for toast notification
                    window.dispatchEvent(new CustomEvent('back-to-exit', {
                        detail: { message: 'Press back again to exit' }
                    }));
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isHomePage, location.pathname]);
}

/**
 * Simple version: Just clears history stack without double-back behavior.
 * Use this if you just want back to exit immediately.
 */
export function useClearHistoryOnMount() {
    const location = useLocation();
    const hasCleared = useRef(false);

    useEffect(() => {
        if (hasCleared.current) return;

        // Replace history to make this the "first" entry
        window.history.replaceState(null, '', location.pathname);
        hasCleared.current = true;
    }, [location.pathname]);
}
