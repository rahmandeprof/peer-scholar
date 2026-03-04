import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Auto-hides the header on mobile when the user scrolls down,
 * and shows it again when scrolling up or tapping.
 *
 * Only activates on viewports < 768px.
 *
 * Listens for scroll events on the ref'd container using capture
 * phase so it catches scrolls from nested scrollable children
 * (TextFileViewer, PDFViewer).
 */
export function useAutoHideHeader() {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const lastScrollEl = useRef<EventTarget | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Dead zone: ignore scrolls smaller than this (prevents flicker)
  const DEAD_ZONE = 8;

  const onScroll = useCallback(
    (e: Event) => {
      if (!isMobile) return;

      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== 'number') return;

      // If we switched to a different scroll container, reset baseline
      if (lastScrollEl.current !== target) {
        lastScrollEl.current = target;
        lastScrollTop.current = target.scrollTop;
        return;
      }

      const currentScrollTop = target.scrollTop;
      const delta = currentScrollTop - lastScrollTop.current;

      // Only act outside the dead zone
      if (Math.abs(delta) > DEAD_ZONE) {
        if (delta > 0 && currentScrollTop > 60) {
          // Scrolling DOWN past the header height → hide
          setHeaderVisible(false);
        } else if (delta < 0) {
          // Scrolling UP → show
          setHeaderVisible(true);
        }
        lastScrollTop.current = currentScrollTop;
      }
    },
    [isMobile],
  );

  // Tap-to-toggle: if user taps content without scrolling, show header
  const tapScrollStart = useRef(0);

  const onTouchStart = useCallback(() => {
    if (!isMobile) return;
    const el = lastScrollEl.current as HTMLElement | null;
    tapScrollStart.current = el?.scrollTop ?? 0;
  }, [isMobile]);

  const onTouchEnd = useCallback(() => {
    if (!isMobile) return;
    const el = lastScrollEl.current as HTMLElement | null;
    const currentScroll = el?.scrollTop ?? 0;
    const delta = Math.abs(currentScroll - tapScrollStart.current);
    // If virtually no scroll happened, it was a tap → toggle header
    if (delta < 3) {
      setHeaderVisible((prev) => !prev);
    }
  }, [isMobile]);

  // Attach listeners using capture phase to catch nested scrolls
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !isMobile) return;

    // Capture phase so we see scroll events from nested children
    container.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll, {
        capture: true,
      } as EventListenerOptions);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [onScroll, onTouchStart, onTouchEnd, isMobile]);

  return {
    /** Whether the header should be visible */
    headerVisible,
    /** Attach this ref to the wrapper around scrollable content */
    scrollRef,
    /** Force-show the header (e.g. when opening menus) */
    showHeader: useCallback(() => setHeaderVisible(true), []),
  };
}
