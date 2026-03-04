import { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Called when user taps "Add Note" — parent should open note modal */
  onAddNote?: (selection: SelectionData) => void;
  /** Called when user taps "Tag PQ" — parent should open PQ modal */
  onTagPq?: (selection: SelectionData) => void;
}

/* ───────────── Component ───────────── */

export function SelectionToolbar({
  onAddNote,
  onTagPq,
}: SelectionToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
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
  }>({
    currentQuestion: 0,
    selectedOption: null,
    isCorrect: null,
    showExplanation: false,
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  /* ── Selection detection ── */
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout>;

    const handleSelectionChange = () => {
      clearTimeout(debounceId);

      // Longer delay on mobile to let native handles settle
      const delay = isMobile ? 350 : 100;

      debounceId = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          if (!result) {
            setPosition(null);
            setSelectionData(null);
          }
          return;
        }

        const text = selection.toString().trim();
        if (!text || text.length < 3) return;

        // If selection text changed, clear old result
        setSelectedText((prev) => {
          if (prev !== text) {
            setResult(null);
            setQuizData(null);
          }
          return text;
        });

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Context extraction for annotations
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

        setSelectionData({ text, rect, contextBefore, contextAfter });

        // Desktop: position above selection
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10 + window.scrollY,
        });
      }, delay);
    };

    // selectionchange fires reliably on both mobile and desktop
    document.addEventListener('selectionchange', handleSelectionChange);
    // Also listen for mouseup/touchend as backup triggers
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);

    return () => {
      clearTimeout(debounceId);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
    };
  }, [result, isMobile]);

  /* ── Close on outside click (desktop only, mobile uses explicit close) ── */
  useEffect(() => {
    if (isMobile) return; // Don't auto-close on mobile — native selection handles fire touch events

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dismissMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  /* ── Handlers ── */

  const dismissMenu = useCallback(() => {
    setPosition(null);
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
          });
          setResult({ type: action, content: '' });
        } catch (e) {
          console.error('Failed to parse quiz', e);
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
    }));
  };

  const nextQuestion = () => {
    if (!quizData) return;
    if (quizState.currentQuestion < quizData.length - 1) {
      setQuizState({
        currentQuestion: quizState.currentQuestion + 1,
        selectedOption: null,
        isCorrect: null,
        showExplanation: false,
      });
    } else {
      dismissMenu();
    }
  };

  if (!position && !selectionData) return null;
  // On mobile, show if we have selection data (position is only used for desktop)
  if (!isMobile && !position) return null;

  /* ───────── Result / Quiz panel ───────── */
  const resultPanel = result ? (
    <div className='w-full p-4 pb-8 md:pb-4'>
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
          className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2'
        >
          <X className='w-5 h-5' />
        </button>
      </div>

      {result.type === 'quiz' && quizData ? (
        <div className='animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[60vh] overflow-y-auto'>
          <div className='mb-3'>
            <span className='text-xs font-medium text-gray-500 uppercase tracking-wider'>
              Question {quizState.currentQuestion + 1} of {quizData.length}
            </span>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100 mt-1'>
              {quizData[quizState.currentQuestion].question}
            </p>
          </div>

          <div className='space-y-2 mb-3'>
            {quizData[quizState.currentQuestion].options.map((option, idx) => {
              const isSelected = quizState.selectedOption === option;
              const isCorrectAnswer =
                option === quizData[quizState.currentQuestion].correctAnswer;

              let btnClass =
                'w-full text-left text-sm p-3 md:p-2 rounded-md border transition-colors ';

              if (quizState.selectedOption) {
                if (isSelected) {
                  btnClass += quizState.isCorrect
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300';
                } else if (isCorrectAnswer) {
                  btnClass +=
                    'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300';
                } else {
                  btnClass +=
                    'border-gray-200 text-gray-400 dark:border-gray-700';
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
            })}
          </div>

          {quizState.showExplanation && (
            <div className='mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs text-blue-700 dark:text-blue-300 flex items-start'>
              <AlertCircle className='w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0' />
              {quizData[quizState.currentQuestion].explanation}
            </div>
          )}

          {quizState.selectedOption && (
            <button
              onClick={nextQuestion}
              className='w-full py-3 md:py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:opacity-90 transition-opacity'
            >
              {quizState.currentQuestion < quizData.length - 1
                ? 'Next Question'
                : 'Finish Quiz'}
            </button>
          )}
        </div>
      ) : (
        <div className='text-sm text-gray-700 dark:text-gray-300 max-h-[50vh] overflow-y-auto whitespace-pre-wrap'>
          {result.content}
        </div>
      )}
    </div>
  ) : null;

  /* ───────── Action buttons ───────── */
  const actionButtons = (
    <>
      {/* Annotation actions */}
      {(onAddNote || onTagPq) && (
        <>
          <div className='flex flex-row p-2 md:p-1 space-x-1'>
            {onAddNote && selectionData && (
              <button
                onClick={() => onAddNote(selectionData)}
                disabled={loading}
                className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex-1 md:flex-none'
              >
                <PenLine className='w-4 h-4 mr-2 text-blue-500' />
                Add Note
              </button>
            )}
            {onTagPq && selectionData && (
              <button
                onClick={() => onTagPq(selectionData)}
                disabled={loading}
                className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex-1 md:flex-none'
              >
                <Tag className='w-4 h-4 mr-2 text-yellow-500' />
                Tag PQ
              </button>
            )}
          </div>
          <div className='border-t border-gray-200 dark:border-gray-700 mx-2' />
        </>
      )}

      {/* AI actions */}
      <div className='grid grid-cols-2 md:flex md:flex-row p-2 md:p-1 gap-1 md:gap-0 md:space-x-1'>
        <button
          onClick={() => handleAction('simplify')}
          disabled={loading}
          className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Sparkles className='w-4 h-4 mr-2 text-yellow-500' />
          )}
          Simplify
        </button>
        <button
          onClick={() => handleAction('mnemonic')}
          disabled={loading}
          className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Brain className='w-4 h-4 mr-2 text-purple-500' />
          )}
          Mnemonic
        </button>
        <button
          onClick={() => handleAction('keywords')}
          disabled={loading}
          className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Key className='w-4 h-4 mr-2 text-blue-500' />
          )}
          Keywords
        </button>
        <button
          onClick={() => handleAction('quiz')}
          disabled={loading}
          className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors'
        >
          {loading ? (
            <BorderSpinner size='sm' />
          ) : (
            <Clipboard className='w-4 h-4 mr-2 text-green-500' />
          )}
          Quiz Me
        </button>
      </div>
    </>
  );

  /* ───────── Render ───────── */
  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-200
        ${
          isMobile
            ? 'w-full bottom-0 left-0 right-0 rounded-t-2xl animate-slide-up'
            : 'rounded-lg'
        }
      `}
      style={
        !isMobile && position
          ? {
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)',
            }
          : undefined
      }
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>

      {/* Arrow — desktop only */}
      {!isMobile && (
        <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700' />
      )}

      {/* Mobile drag handle + close */}
      {isMobile && (
        <div className='w-full flex items-center justify-between px-4 pt-3 pb-1'>
          <div className='w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full' />
          <button
            onClick={dismissMenu}
            className='p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
          >
            <X className='w-4 h-4 text-gray-400' />
          </button>
        </div>
      )}

      {/* Mobile selected text preview */}
      {isMobile && selectedText && !result && (
        <div className='px-4 pb-2'>
          <p className='text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1'>
            "{selectedText}"
          </p>
        </div>
      )}

      {result ? resultPanel : actionButtons}

      {/* Mobile safe area padding */}
      {isMobile && <div className='h-4' />}
    </div>
  );
}
