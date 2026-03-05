import { useEffect } from 'react';

/**
 * Hook that constrains text selection within PDF text layers.
 *
 * Problem: react-pdf renders text as absolutely-positioned <span> elements
 * inside `.react-pdf__Page__textContent`. On mobile (and sometimes desktop),
 * dragging a selection causes the browser to "escape" individual spans and
 * select the entire page container, resulting in a full-page highlight.
 *
 * Solution: Monitor `selectionchange` events. When the selection's ancestor
 * escapes the text layer, collapse or trim the selection back to the last
 * valid text-layer node.
 */
export function useConstrainedSelection(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const TEXT_LAYER_CLASS = 'react-pdf__Page__textContent';

    /**
     * Find the closest text layer ancestor of a node, or null if the node
     * is outside any text layer.
     */
    const getTextLayer = (node: Node | null): HTMLElement | null => {
      if (!node) return null;
      const el = node instanceof HTMLElement ? node : node.parentElement;
      return el?.closest(`.${TEXT_LAYER_CLASS}`) as HTMLElement | null;
    };

    /**
     * Find the last text node inside a given element (depth-first, right-to-left).
     */
    const getLastTextNode = (el: HTMLElement): Text | null => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let last: Text | null = null;
      let node: Node | null;
      while ((node = walker.nextNode())) {
        last = node as Text;
      }
      return last;
    };

    /**
     * Find the first text node inside a given element.
     */
    const getFirstTextNode = (el: HTMLElement): Text | null => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      return walker.nextNode() as Text | null;
    };

    let isAdjusting = false;

    const handleSelectionChange = () => {
      // Guard against re-entrant calls from our own modifications
      if (isAdjusting) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      const startTextLayer = getTextLayer(range.startContainer);
      const endTextLayer = getTextLayer(range.endContainer);

      // Both endpoints inside a text layer — selection is fine
      if (startTextLayer && endTextLayer) return;

      // Neither endpoint in a text layer — not our concern (e.g. toolbar)
      if (!startTextLayer && !endTextLayer) return;

      // Selection has escaped the text layer — constrain it
      isAdjusting = true;

      try {
        if (startTextLayer && !endTextLayer) {
          // End escaped downward/outward — clamp end to last node in text layer
          const lastText = getLastTextNode(startTextLayer);
          if (lastText) {
            range.setEnd(lastText, lastText.length);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else if (!startTextLayer && endTextLayer) {
          // Start escaped upward/outward — clamp start to first node in text layer
          const firstText = getFirstTextNode(endTextLayer);
          if (firstText) {
            range.setStart(firstText, 0);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      } catch {
        // Range manipulation can throw if nodes are removed mid-operation
      }

      // Release the guard after a tick so the browser processes the change
      requestAnimationFrame(() => {
        isAdjusting = false;
      });
    };

    // Also handle touch-specific issues: prevent the container from being
    // the selection target by stopping selectstart if it starts outside text layer
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;

      // If selection starts on the canvas or the page container (not the text layer),
      // prevent it — only allow selection that starts inside the text layer
      if (container.contains(target)) {
        const textLayer = target.closest(`.${TEXT_LAYER_CLASS}`);
        const isInTextLayer =
          !!textLayer || target.classList.contains(TEXT_LAYER_CLASS);
        const isAnnotation = target.closest('[data-public-note]');

        if (!isInTextLayer && !isAnnotation) {
          // Allow selection on elements outside our PDF container (toolbar, etc.)
          // but block it on the canvas/page wrapper to prevent page-level selection
          const isInsidePage = target.closest('.react-pdf__Page');
          if (isInsidePage) {
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    container.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      container.removeEventListener('selectstart', handleSelectStart);
    };
  }, [containerRef]);
}
