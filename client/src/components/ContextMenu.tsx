import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Brain,
  Key,
  X,
  Loader2,
  Clipboard,
  Check,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';

interface ContextMenuProps {
  onClose?: () => void;
}

type ActionType = 'simplify' | 'mnemonic' | 'keywords' | 'quiz';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export function ContextMenu({ onClose }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: ActionType;
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

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (!result) setPosition(null); // Only hide if no result is showing
        return;
      }

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      // Position above the selection
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10 + window.scrollY,
      });
    };

    // Listen for mouseup to detect selection end
    document.addEventListener('mouseup', handleSelection);
    // Also listen for keyup (shift+arrow selection)
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [result]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPosition(null);
        setResult(null);
        setQuizData(null);
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = async (action: ActionType) => {
    if (!selectedText) return;

    setLoading(true);
    try {
      const res = await api.post('/chat/context-action', {
        text: selectedText,
        action,
      });

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
        } catch (e) {
          console.error('Failed to parse quiz', e);
          setResult({
            type: action,
            content:
              'Failed to generate a valid quiz. Try selecting a smaller text chunk.',
          });
        }
      } else {
        setResult({ type: action, content: res.data.result });
      }

      // Ensure we keep the menu open by setting result type even for quiz
      if (action === 'quiz') {
        setResult({ type: action, content: '' }); // Content handled by quizData
      }
    } catch (error) {
      console.error('Context action failed', error);
      // Optionally show error toast
    } finally {
      setLoading(false);
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
      // End of quiz
      setResult(null);
      setQuizData(null);
      setPosition(null);
    }
  };

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-200
        md:rounded-lg md:w-auto
        w-full bottom-0 left-0 right-0 rounded-t-2xl md:bottom-auto md:left-auto md:right-auto md:top-auto
        animate-slide-up md:animate-none
      `}
      style={{
        left: window.innerWidth >= 768 ? position.x : 0,
        top: window.innerWidth >= 768 ? position.y : 'auto',
        transform: window.innerWidth >= 768 ? 'translate(-50%, -100%)' : 'none',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
      {/* Arrow - Desktop Only */}
      <div className='hidden md:block absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700' />

      {/* Mobile Drag Handle */}
      <div className='md:hidden w-full flex justify-center pt-3 pb-1'>
        <div className='w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full' />
      </div>

      {result ? (
        <div className='w-full md:w-80 p-4 pb-8 md:pb-4'>
          {/* ... existing result content ... */}
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
              onClick={() => {
                setResult(null);
                setQuizData(null);
                setPosition(null);
              }}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {result.type === 'quiz' && quizData ? (
            <div className='animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[60vh] overflow-y-auto'>
              {/* ... quiz content ... */}
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
                  },
                )}
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
      ) : (
        <div className='flex flex-col md:flex-row p-2 md:p-1 space-y-2 md:space-y-0 md:space-x-1 pb-8 md:pb-1'>
          <button
            onClick={() => handleAction('simplify')}
            disabled={loading}
            className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors w-full md:w-auto'
          >
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Sparkles className='w-4 h-4 mr-2 text-yellow-500' />
            )}
            Simplify
          </button>
          <div className='hidden md:block w-px bg-gray-200 dark:bg-gray-700 my-1' />
          <button
            onClick={() => handleAction('mnemonic')}
            disabled={loading}
            className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors w-full md:w-auto'
          >
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Brain className='w-4 h-4 mr-2 text-purple-500' />
            )}
            Mnemonic
          </button>
          <div className='hidden md:block w-px bg-gray-200 dark:bg-gray-700 my-1' />
          <button
            onClick={() => handleAction('keywords')}
            disabled={loading}
            className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors w-full md:w-auto'
          >
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Key className='w-4 h-4 mr-2 text-blue-500' />
            )}
            Keywords
          </button>
          <div className='hidden md:block w-px bg-gray-200 dark:bg-gray-700 my-1' />
          <button
            onClick={() => handleAction('quiz')}
            disabled={loading}
            className='flex items-center justify-center md:justify-start px-3 py-3 md:py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors w-full md:w-auto'
          >
            {loading ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Clipboard className='w-4 h-4 mr-2 text-green-500' />
            )}
            Quiz Me
          </button>
        </div>
      )}
    </div>
  );
}
