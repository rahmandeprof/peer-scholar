import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Brain,
  Key,
  X,
  Clipboard,
  Check,
  AlertCircle,
  PenLine,
  Tag,
  Trophy,
} from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';

/* ───────────── Types ───────────── */

type AIAction = 'simplify' | 'mnemonic' | 'keywords' | 'quiz';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface SelectionData {
  text: string;
  rect: DOMRect;
  contextBefore: string;
  contextAfter: string;
}

interface SelectionToolbarProps {
  onAddNote?: (selection: SelectionData) => void;
  onTagPq?: (selection: SelectionData) => void;
  materialId?: string;
}

/* ───────────── Component ───────────── */

export function SelectionToolbar({
  onAddNote,
  onTagPq,
  materialId,
}: SelectionToolbarProps) {
  // Two-stage flow: bubble → sheet
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleRect, setBubbleRect] = useState<DOMRect | null>(null);
  const [isOpen, setIsOpen] = useState(false); // bottom sheet open
  const [selectedText, setSelectedText] = useState('');
  const [selectionData, setSelectionData] = useState<SelectionData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: AIAction;
    content: string;
  } | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [quizState, setQuizState] = useState<{
    currentQuestion: number;
    selectedOption: string | null;
    isCorrect: boolean | null;
    showExplanation: boolean;
    score: number;
    isFinished: boolean;
  }>({
    currentQuestion: 0,
    selectedOption: null,
    isCorrect: null,
    showExplanation: false,
    score: 0,
    isFinished: false,
  });

  const requestRef = useRef<number>(0);

  /* ── Selection detection ── */
  const isOpenRef = useRef(false);
  isOpenRef.current = isOpen;
  const showBubbleRef = useRef(false);
  showBubbleRef.current = showBubble;

  useEffect(() => {
    let pointerDebounceId: ReturnType<typeof setTimeout>;
    let selectionDebounceId: ReturnType<typeof setTimeout>;

    /**
     * Show the floating bubble near the selected text.
     */
    const showBubbleFromSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text || text.length < 3) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setBubbleRect(rect);
      setShowBubble(true);
    };

    /**
     * Fast path: mouseup / touchend.
     * Works on desktop and for the initial long-press on mobile.
     */
    const handlePointerUp = () => {
      // Don't show bubble if the bottom sheet is already open
      if (isOpenRef.current) return;
      clearTimeout(pointerDebounceId);
      pointerDebounceId = setTimeout(showBubbleFromSelection, 200);
    };

    /**
     * Slow path: selectionchange with debounce.
     * On real mobile, dragging selection handles fires selectionchange
     * rapidly but no touchend. Once the user stops dragging, no more
     * events fire for 600ms → debounce expires → show bubble.
     */
    const handleSelectionChange = () => {
      clearTimeout(selectionDebounceId);

      const selection = window.getSelection();

      // If selection was cleared, dismiss bubble but NEVER the sheet
      if (!selection || selection.isCollapsed) {
        if (showBubbleRef.current) {
          setShowBubble(false);
          setBubbleRect(null);
        }
        // We removed the isOpenRef auto-dismiss here. Once the full sheet
        // is open, it should only close via explicit user action (X or backdrop).
        return;
      }

      // If sheet is open, don't interfere
      if (isOpenRef.current) return;

      // If bubble is showing, reposition it as user adjusts selection
      if (showBubbleRef.current) {
        selectionDebounceId = setTimeout(() => {
          const s = window.getSelection();
          if (s && !s.isCollapsed) {
            const r = s.getRangeAt(0);
            setBubbleRect(r.getBoundingClientRect());
          }
        }, 300);
        return;
      }

      // No bubble, no sheet — debounce to show new bubble
      selectionDebounceId = setTimeout(showBubbleFromSelection, 600);
    };

    /**
     * Suppress native context menu within material viewers.
     */
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInViewer =
        target.closest('.react-pdf__Page__textContent') ||
        target.closest('.text-file-content') ||
        target.closest('[data-annotation-container]');
      if (isInViewer) {
        e.preventDefault();
      }
    };

    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearTimeout(pointerDebounceId);
      clearTimeout(selectionDebounceId);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [result, loading, showBubble, isOpen]);

  /**
   * Open the full bottom sheet — reads fresh selection from the DOM.
   */
  const openSheet = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 3) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const contextBefore =
      range.startContainer.textContent?.substring(
        Math.max(0, range.startOffset - 50),
        range.startOffset,
      ) || '';
    const contextAfter =
      range.endContainer.textContent?.substring(
        range.endOffset,
        Math.min(
          range.endContainer.textContent?.length || 0,
          range.endOffset + 50,
        ),
      ) || '';

    setSelectedText(text);
    setSelectionData({ text, rect, contextBefore, contextAfter });
    setResult(null);
    setQuizData(null);
    setShowBubble(false);
    setIsOpen(true);

    window.dispatchEvent(new CustomEvent('dismiss-material-menu'));
  }, []);

  /* ── Listen for dismiss event from three-dots menu ── */
  useEffect(() => {
    const handleDismiss = () => {
      dismissMenu();
    };
    window.addEventListener('dismiss-selection-toolbar', handleDismiss);
    return () =>
      window.removeEventListener('dismiss-selection-toolbar', handleDismiss);
  }, []);

  /* ── Handlers ── */

  const dismissMenu = useCallback(() => {
    setIsOpen(false);
    setShowBubble(false);
    setBubbleRect(null);
    setResult(null);
    setQuizData(null);
    setSelectionData(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleAction = async (action: AIAction) => {
    if (!selectedText) return;

    const currentRequest = ++requestRef.current;
    setLoading(true);

    try {
      const res = await api.post('/chat/context-action', {
        text: selectedText,
        action,
      });

      if (currentRequest !== requestRef.current) return;

      if (action === 'quiz') {
        try {
          const parsed = JSON.parse(res.data.result);
          setQuizData(parsed);
          setQuizState({
            currentQuestion: 0,
            selectedOption: null,
            isCorrect: null,
            showExplanation: false,
            score: 0,
            isFinished: false,
          });
          setResult({ type: action, content: '' });
        } catch {
          setResult({
            type: action,
            content:
              'Failed to generate quiz. Try selecting a smaller text chunk.',
          });
        }
      } else {
        setResult({ type: action, content: res.data.result });
      }
    } catch (error) {
      if (currentRequest !== requestRef.current) return;
      console.error('Context action failed', error);
    } finally {
      if (currentRequest === requestRef.current) {
        setLoading(false);
      }
    }
  };

  const handleQuizOptionSelect = (option: string) => {
    if (!quizData || quizState.selectedOption) return;
    const currentQ = quizData[quizState.currentQuestion];
    const isCorrect = option === currentQ.correctAnswer;
    setQuizState((prev) => ({
      ...prev,
      selectedOption: option,
      isCorrect,
      showExplanation: true,
      score: prev.score + (isCorrect ? 1 : 0),
    }));
  };

  const nextQuestion = async () => {
    if (!quizData) return;
    if (quizState.currentQuestion < quizData.length - 1) {
      setQuizState({
        ...quizState,
        currentQuestion: quizState.currentQuestion + 1,
        selectedOption: null,
        isCorrect: null,
        showExplanation: false,
      });
    } else {
      setQuizState((prev) => ({ ...prev, isFinished: true }));
      if (materialId) {
        try {
          await api.post('/chat/quiz/result', {
            materialId,
            score: quizState.score + (quizState.isCorrect ? 1 : 0),
            totalQuestions: quizData.length,
          });
        } catch (error) {
          console.error('Failed to save inline quiz result', error);
        }
      }
    }
  };

  if (!isOpen && !showBubble) return null;

  /* ───────── Result / Quiz Panel ───────── */
  const resultPanel = result ? (
    <div className='p-4 pb-6'>
      <div className='flex justify-between items-start mb-2'>
        <h3 className='font-semibold text-gray-900 dark:text-white flex items-center capitalize'>
          {result.type === 'simplify' && (
            <Sparkles className='w-4 h-4 mr-2 text-yellow-500' />
          )}
          {result.type === 'mnemonic' && (
            <Brain className='w-4 h-4 mr-2 text-purple-500' />
          )}
          {result.type === 'keywords' && (
            <Key className='w-4 h-4 mr-2 text-blue-500' />
          )}
          {result.type === 'quiz' && (
            <Clipboard className='w-4 h-4 mr-2 text-green-500' />
          )}
          {result.type === 'quiz' ? 'Quick Quiz' : result.type}
        </h3>
        <button
          onClick={dismissMenu}
          className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1'
        >
          <X className='w-5 h-5' />
        </button>
      </div>

      {result.type === 'quiz' && quizData ? (
        quizState.isFinished ? (
          <div className='animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center py-6'>
            <div className='w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mb-4'>
              <Trophy className='w-8 h-8 text-yellow-500 dark:text-yellow-400' />
            </div>
            <h4 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
              Quiz Completed!
            </h4>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>
              You scored{' '}
              <span className='font-bold text-purple-600 dark:text-purple-400 text-lg mx-1'>
                {quizState.score || 0}
              </span>{' '}
              out of {quizData.length}
            </p>
            <button
              onClick={dismissMenu}
              className='w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm'
            >
              Close
            </button>
          </div>
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[50vh] overflow-y-auto'>
            <div className='mb-3'>
              <span className='text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Question {quizState.currentQuestion + 1} of {quizData.length}
              </span>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100 mt-1'>
                {quizData[quizState.currentQuestion].question}
              </p>
            </div>

            <div className='space-y-2 mb-3'>
              {quizData[quizState.currentQuestion].options.map(
                (option, idx) => {
                  const isSelected = quizState.selectedOption === option;
                  const isCorrectAnswer =
                    option ===
                    quizData[quizState.currentQuestion].correctAnswer;

                  let btnClass =
                    'w-full text-left text-sm p-3 rounded-lg border transition-colors ';
                  if (quizState.selectedOption) {
                    if (isSelected) {
                      btnClass += quizState.isCorrect
                        ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/40 dark:border-green-600 dark:text-green-300 font-medium shadow-sm'
                        : 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/40 dark:border-red-600 dark:text-red-300 font-medium shadow-sm';
                    } else if (isCorrectAnswer) {
                      btnClass +=
                        'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/40 dark:border-green-600 dark:text-green-300 font-medium shadow-sm';
                    } else {
                      btnClass +=
                        'border-gray-100 text-gray-400 dark:border-gray-800 dark:text-gray-600 opacity-50';
                    }
                  } else {
                    btnClass +=
                      'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizOptionSelect(option)}
                      disabled={!!quizState.selectedOption}
                      className={btnClass}
                    >
                      <div className='flex items-center justify-between'>
                        <span>{option}</span>
                        {quizState.selectedOption &&
                          (isSelected || isCorrectAnswer) &&
                          (isCorrectAnswer ? (
                            <Check className='w-4 h-4' />
                          ) : (
                            <X className='w-4 h-4' />
                          ))}
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            {quizState.showExplanation && (
              <div className='mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start border border-blue-200 dark:border-blue-800'>
                <AlertCircle className='w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0' />
                {quizData[quizState.currentQuestion].explanation}
              </div>
            )}

            {quizState.selectedOption && (
              <button
                onClick={nextQuestion}
                className='w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity shadow-md'
              >
                {quizState.currentQuestion < quizData.length - 1
                  ? 'Next Question'
                  : 'Finish Quiz'}
              </button>
            )}
          </div>
        )
      ) : (
        <div className='text-sm text-gray-700 dark:text-gray-300 max-h-[50vh] overflow-y-auto whitespace-pre-wrap'>
          {result.content}
        </div>
      )}
    </div>
  ) : null;

  /* ───────── Action Buttons (3x2 grid) ───────── */
  const actionButtons = (
    <div className='p-3'>
      {/* Selected text preview */}
      {selectedText && (
        <div className='mb-3 px-1'>
          <p className='text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1'>
            &ldquo;{selectedText}&rdquo;
          </p>
        </div>
      )}

      <div className='grid grid-cols-2 gap-2'>
        {onAddNote && selectionData && (
          <button
            onClick={() => onAddNote(selectionData)}
            disabled={loading}
            className='flex flex-col items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
          >
            <PenLine className='w-5 h-5 mb-1.5' />
            Add Note
          </button>
        )}
        {onTagPq && selectionData && (
          <button
            onClick={() => onTagPq(selectionData)}
            disabled={loading}
            className='flex flex-col items-center justify-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-yellow-600 dark:text-yellow-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
          >
            <Tag className='w-5 h-5 mb-1.5' />
            Tag PQ
          </button>
        )}
        <button
          onClick={() => handleAction('simplify')}
          disabled={loading}
          className='flex flex-col items-center justify-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Sparkles className='w-5 h-5 mb-1.5' />
          )}
          Simplify
        </button>
        <button
          onClick={() => handleAction('mnemonic')}
          disabled={loading}
          className='flex flex-col items-center justify-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Brain className='w-5 h-5 mb-1.5' />
          )}
          Mnemonic
        </button>
        <button
          onClick={() => handleAction('keywords')}
          disabled={loading}
          className='flex flex-col items-center justify-center p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl text-sky-600 dark:text-sky-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Key className='w-5 h-5 mb-1.5' />
          )}
          Keywords
        </button>
        <button
          onClick={() => handleAction('quiz')}
          disabled={loading}
          className='flex flex-col items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400 text-xs font-medium min-h-[64px] active:scale-95 transition-transform'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Clipboard className='w-5 h-5 mb-1.5' />
          )}
          Quiz Me
        </button>
      </div>
    </div>
  );

  /* ───────── Render via Portal (bypasses any parent transforms/z-index) ───────── */
  return createPortal(
    <>
      {/* Floating Bubble (Stage 1) */}
      {showBubble && !isOpen && bubbleRect && (
        <div
          className='fixed z-[100] animate-pop-in cursor-pointer'
          style={{
            // Position above the selection
            top: `${Math.max(16, bubbleRect.top - 48)}px`,
            // Center horizontally relative to selection, keep on screen
            left: `${Math.max(16, Math.min(window.innerWidth - 120, bubbleRect.left + bubbleRect.width / 2 - 60))}px`,
          }}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openSheet();
            }}
            className='flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-2xl border border-gray-700 dark:border-gray-200 font-medium text-sm hover:scale-105 transition-transform'
          >
            <Sparkles className='w-4 h-4 text-yellow-400 dark:text-yellow-600' />
            Actions
          </button>
        </div>
      )}

      {/* Full Actions Sidebar (Stage 2) */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-[90] bg-black/20'
            onClick={dismissMenu}
          />

          {/* Right Sidebar - stop mouseup/touchend from reaching document listener */}
          <div
            className='fixed top-0 bottom-0 right-0 w-72 max-w-[85vw] z-[100] bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 animate-slide-left pb-[env(safe-area-inset-bottom)] flex flex-col'
            onMouseUp={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideLeft {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
              .animate-slide-left { animation: slideLeft 0.25s ease-out forwards; }
            `}</style>

            {/* Header + close */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700'>
              <span className='font-semibold text-gray-900 dark:text-white text-sm'>
                Actions
              </span>
              <button
                onClick={dismissMenu}
                className='p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              >
                <X className='w-4 h-4 text-gray-400' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto no-scrollbar'>
              {result ? resultPanel : actionButtons}
            </div>
          </div>
        </>
      )}
    </>,
    document.body,
  );
}
