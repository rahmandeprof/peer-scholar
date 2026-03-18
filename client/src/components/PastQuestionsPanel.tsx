import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tag,
  MessageSquare,
  Trash2,
  FileText,
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface Annotation {
  id: string;
  selectedText: string;
  pageNumber?: number;
  year?: string;
  session?: string;
  noteContent?: string;
  contextBefore?: string;
  contextAfter?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  type: 'note' | 'pq';
  createdAt: string;
}

interface PastQuestionsPanelProps {
  materialId: string;
  isOpen: boolean;
  onClose: () => void;
  onJumpToPage?: (page: number) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  currentUserId?: string;
}

export function PastQuestionsPanel({
  materialId,
  isOpen,
  onClose,
  onJumpToPage,
  containerRef,
  currentUserId,
}: PastQuestionsPanelProps) {
  const toast = useToast();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pq' | 'note'>('all');
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAnnotations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/materials/${materialId}/annotations`);
      setAnnotations(res.data);
    } catch {
      console.error('Failed to fetch annotations');
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (isOpen) {
      fetchAnnotations();
    }
    return () => {
      // Cleanup highlight timer when panel closes
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      clearTemporaryHighlights();
    };
  }, [isOpen, fetchAnnotations]);

  const clearTemporaryHighlights = () => {
    const marks = document.querySelectorAll('mark[data-temp-highlight]');
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

  const temporaryHighlight = (searchText: string): boolean => {
    const container = containerRef?.current;
    if (!container || !searchText) return false;

    // Clear any existing temporary highlights
    clearTemporaryHighlights();

    const normalizedSearch = searchText.replace(/\s+/g, ' ').toLowerCase();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (
          node.parentElement?.tagName === 'MARK' &&
          node.parentElement?.hasAttribute('data-temp-highlight')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const content = (node as Text).textContent || '';
      const normalizedContent = content.replace(/\s+/g, ' ').toLowerCase();
      const idx = normalizedContent.indexOf(normalizedSearch);

      if (idx !== -1) {
        try {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, Math.min(idx + searchText.length, content.length));

          const mark = document.createElement('mark');
          mark.setAttribute('data-temp-highlight', 'true');
          mark.style.backgroundColor = 'rgba(250, 204, 21, 0.5)';
          mark.style.borderRadius = '2px';
          mark.style.transition = 'background-color 0.3s ease';
          mark.style.outline = '2px solid rgba(250, 204, 21, 0.8)';
          mark.style.outlineOffset = '1px';

          range.surroundContents(mark);

          // Scroll to the highlight
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Auto-remove after 4 seconds with fade
          highlightTimerRef.current = setTimeout(() => {
            mark.style.backgroundColor = 'transparent';
            mark.style.outline = 'none';
            setTimeout(() => {
              clearTemporaryHighlights();
            }, 300);
          }, 4000);
        } catch {
          // surroundContents can fail if range crosses element boundaries
        }
        return true; // Highlight attempted (or succeeded)
      }
    }
    return false; // Not found
  };

  const handleNavigate = (annotation: Annotation) => {
    if (annotation.pageNumber && onJumpToPage) {
      onJumpToPage(annotation.pageNumber);
      onClose(); // Close immediately for responsive feel
      
      // Wait for page render, then highlight
      setTimeout(() => {
        const success = temporaryHighlight(annotation.selectedText);
        if (!success) {
          toast.error('Could not locate exact text on page');
        }
      }, 500);
    } else {
      const success = temporaryHighlight(annotation.selectedText);
      if (success) {
        onClose();
      } else {
        toast.error('Could not locate exact text on page');
      }
    }
  };

  const handleDelete = async (annotationId: string) => {
    try {
      await api.delete(
        `/materials/${materialId}/annotations/${annotationId}`,
      );
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      toast.success('Annotation deleted');
    } catch {
      toast.error('Failed to delete annotation');
    }
  };

  const filteredAnnotations = annotations.filter((a) => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const pqCount = annotations.filter((a) => a.type === 'pq').length;
  const noteCount = annotations.filter((a) => a.type === 'note').length;

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-[80] bg-black/20'
        onClick={onClose}
      />

      {/* Panel */}
      <div className='fixed top-0 bottom-0 right-0 w-80 max-w-[90vw] z-[90] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col animate-slide-left select-none'>
        <style>{`
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-left { animation: slideLeft 0.25s ease-out forwards; }
        `}</style>

        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700'>
          <div className='flex items-center gap-2'>
            <Tag className='w-4 h-4 text-yellow-600 dark:text-yellow-400' />
            <span className='font-semibold text-gray-900 dark:text-white text-sm'>
              Annotations
            </span>
            <span className='text-xs text-gray-400'>
              ({annotations.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
          >
            <X className='w-4 h-4 text-gray-400' />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className='flex px-3 pt-2 pb-1 gap-1'>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({annotations.length})
          </button>
          <button
            onClick={() => setFilter('pq')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filter === 'pq'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
            }`}
          >
            Past Questions ({pqCount})
          </button>
          <button
            onClick={() => setFilter('note')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filter === 'note'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
            }`}
          >
            Notes ({noteCount})
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-3 space-y-2'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400'></div>
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className='text-center py-8 text-gray-400 dark:text-gray-500'>
              <FileText className='w-8 h-8 mx-auto mb-2 opacity-50' />
              <p className='text-sm'>No annotations yet</p>
              <p className='text-xs mt-1'>
                Select text in the document to tag past questions or add notes
              </p>
            </div>
          ) : (
            filteredAnnotations.map((ann) => (
              <div
                key={ann.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer group ${
                  ann.type === 'pq'
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                }`}
                onClick={() => handleNavigate(ann)}
              >
                {/* Type badge + actions */}
                <div className='flex items-center justify-between mb-1.5'>
                  <div className='flex items-center gap-1.5'>
                    {ann.type === 'pq' ? (
                      <span className='inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-yellow-700 dark:text-yellow-400'>
                        <Tag className='w-3 h-3 mr-0.5' />
                        PQ
                      </span>
                    ) : (
                      <span className='inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400'>
                        <MessageSquare className='w-3 h-3 mr-0.5' />
                        Note
                      </span>
                    )}
                    {ann.pageNumber && (
                      <span className='text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded'>
                        p. {ann.pageNumber}
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    {currentUserId && ann.user.id === currentUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ann.id);
                        }}
                        className='p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500'
                        title='Delete Annotation'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected text */}
                <p
                  className='text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 italic'
                  title={ann.selectedText}
                >
                  &ldquo;{ann.selectedText}&rdquo;
                </p>

                {/* Note content (for notes) */}
                {ann.noteContent && (
                  <p className='mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2'>
                    {ann.noteContent}
                  </p>
                )}

                {/* Metadata */}
                <div className='mt-1.5 flex items-center justify-between text-[10px] text-gray-400'>
                  <span>
                    {ann.type === 'pq' && ann.year && (
                      <>
                        {ann.year}
                        {ann.session && ` • ${ann.session}`}
                        {' • '}
                      </>
                    )}
                    {ann.user.firstName}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
