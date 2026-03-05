import { useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

interface PublicNoteHighlight {
  id: string;
  selectedText: string;
  pageNumber?: number;
  note: string;
  user: { firstName: string; lastName: string };
}

/**
 * Hook that highlights text in the DOM that has been annotated with public notes.
 * It walks the text nodes inside the given container and wraps matching text
 * with a styled <mark> element.
 */
export function usePublicNoteHighlights(
  containerRef: React.RefObject<HTMLElement | null>,
  materialId: string,
  pageNumber?: number,
) {
  const highlightsRef = useRef<PublicNoteHighlight[]>([]);

  // Fetch public notes for this material
  const fetchAndApply = useCallback(async () => {
    try {
      const res = await api.get(`/materials/${materialId}/public-notes`);
      const notes: PublicNoteHighlight[] = res.data;

      // Filter by page if applicable
      highlightsRef.current = pageNumber
        ? notes.filter((n) => !n.pageNumber || n.pageNumber === pageNumber)
        : notes;

      applyHighlights();
    } catch {
      // Silently fail – highlights are non-critical
    }
  }, [materialId, pageNumber]);

  // Walk the DOM, find matching text, wrap with <mark>
  const applyHighlights = useCallback(() => {
    const container = containerRef.current;
    if (!container || highlightsRef.current.length === 0) return;

    // Remove any previously applied highlights
    clearHighlights(container);

    for (const note of highlightsRef.current) {
      const searchText = note.selectedText.trim();
      if (!searchText || searchText.length < 3) continue;

      highlightTextInNode(container, searchText, note);
    }
  }, [containerRef]);

  const clearHighlights = (container: HTMLElement) => {
    const marks = container.querySelectorAll('mark[data-public-note]');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(
          document.createTextNode(mark.textContent || ''),
          mark,
        );
        parent.normalize();
      }
    });
  };

  // Find and highlight matching text in child text nodes
  const highlightTextInNode = (
    container: HTMLElement,
    searchText: string,
    note: PublicNoteHighlight,
  ) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip nodes inside marks we already created
        if (
          node.parentElement?.tagName === 'MARK' &&
          node.parentElement?.hasAttribute('data-public-note')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Try to find the searchText across consecutive text nodes
    const normalizedSearch = searchText.replace(/\s+/g, ' ').toLowerCase();

    for (const textNode of textNodes) {
      const content = textNode.textContent || '';
      const normalizedContent = content.replace(/\s+/g, ' ').toLowerCase();
      const idx = normalizedContent.indexOf(normalizedSearch);

      if (idx !== -1) {
        // Found a match within a single text node
        const range = document.createRange();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + searchText.length);

        const mark = document.createElement('mark');
        mark.setAttribute('data-public-note', note.id);
        mark.setAttribute(
          'title',
          `${note.user.firstName}: ${note.note.substring(0, 80)}${note.note.length > 80 ? '...' : ''}`,
        );
        mark.style.backgroundColor = 'rgba(45, 212, 191, 0.25)'; // teal highlight
        mark.style.borderBottom = '2px solid rgba(45, 212, 191, 0.6)';
        mark.style.borderRadius = '2px';
        mark.style.cursor = 'pointer';
        mark.style.transition = 'background-color 0.2s ease';
        mark.addEventListener('mouseenter', () => {
          mark.style.backgroundColor = 'rgba(45, 212, 191, 0.45)';
        });
        mark.addEventListener('mouseleave', () => {
          mark.style.backgroundColor = 'rgba(45, 212, 191, 0.25)';
        });

        try {
          range.surroundContents(mark);
        } catch {
          // surroundContents fails if range crosses element boundaries — skip
        }

        break; // Only highlight first occurrence per note
      }
    }
  };

  useEffect(() => {
    // Small delay to wait for content to render
    const timer = setTimeout(() => {
      fetchAndApply();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchAndApply]);

  // Re-apply when page changes (for PDFs)
  useEffect(() => {
    if (pageNumber !== undefined) {
      const timer = setTimeout(() => {
        fetchAndApply();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pageNumber, fetchAndApply]);

  return { refetchHighlights: fetchAndApply };
}
