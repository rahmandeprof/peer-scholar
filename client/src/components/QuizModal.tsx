import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Trophy,
  ArrowRight,
  Loader2,
  Sparkles,
  Lightbulb,
  Settings,
  Info,
  BookOpen,
  Target,
  Zap,
  WifiOff,
} from 'lucide-react';
import api from '../lib/api';
import { useModalBack } from '../hooks/useModalBack';
import { cacheQuiz, getCachedQuiz, savePendingResult } from '../lib/offlineQuizStore';
import { useToast } from '../contexts/ToastContext';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
}

// Support both old format (correctAnswer) and new format (id, type, answer, hint)
interface Question {
  id?: string;
  type?: string;
  question: string;
  options: string[];
  correctAnswer?: string;  // Old format
  answer?: string;         // New format
  explanation?: string;
  hint?: string;
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// Helper to get correct answer from either format
const getCorrectAnswer = (q: Question): string => q.answer || q.correctAnswer || '';

export function QuizModal({ isOpen, onClose, materialId }: QuizModalProps) {
  useModalBack(isOpen, onClose, 'quiz-modal');
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [animating, setAnimating] = useState(false);

  // Quiz configuration state
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');
  const [showConfig, setShowConfig] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [questionCount, setQuestionCount] = useState(5);
  // const [topic, setTopic] = useState(''); // Reserved for future topic-specific quiz filtering

  // Offline mode tracking
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Upgrading status tracking
  const [isUpgrading, setIsUpgrading] = useState(false);
  const pollingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOptionsRef = React.useRef<{
    startPage?: number;
    endPage?: number;
    diff?: Difficulty;
    count?: number;
  } | undefined>(undefined);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchQuiz();
    } else {
      // Clear polling when modal closes
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      resetQuiz();
    }
  }, [isOpen, materialId]);

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
    setIsCorrect(null);
    setLoading(false);
    setError(null);
    setShowConfig(true);
    setPageStart('');
    setPageEnd('');
    setDifficulty('intermediate');
    setQuestionCount(5);
    setIsOfflineMode(false);
    setIsUpgrading(false);
    // setTopic(''); // Reserved for future topic-specific quiz filtering
  };

  const fetchQuiz = async (options?: {
    startPage?: number;
    endPage?: number;
    regenerate?: boolean;
    diff?: Difficulty;
    count?: number;
  }) => {
    setLoading(true);
    setError(null);
    setShowConfig(false);
    setIsOfflineMode(false);
    setIsUpgrading(false);
    lastOptionsRef.current = options;

    // Clear any existing polling
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const url = `/chat/quiz/${materialId}`;

      // Send params in POST body
      const body: Record<string, unknown> = {};
      if (options?.startPage) body.pageStart = options.startPage;
      if (options?.endPage) body.pageEnd = options.endPage;
      if (options?.regenerate) body.regenerate = true;
      if (options?.diff) body.difficulty = options.diff;
      if (options?.count) body.questionCount = options.count;

      const res = await api.post(url, body);

      // Handle upgrading status - material is being upgraded to v2
      if (res.data && res.data.status === 'upgrading') {
        setIsUpgrading(true);
        setLoading(false);
        // Poll again after 3 seconds
        pollingRef.current = setTimeout(() => {
          fetchQuiz(lastOptionsRef.current);
        }, 3000);
        return;
      }

      // Check for valid quiz data (should be an array)
      if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
        setError('No questions could be generated for this material. The content may be too short or not suitable for quiz generation.');
      } else {
        setQuestions(res.data);
        // Cache for offline use (auto-cache strategy)
        cacheQuiz(materialId, res.data, 'Quiz');
      }
    } catch (err: any) {
      // If offline or network error, try loading from cache
      if (!navigator.onLine || err.message?.includes('Network') || err.code === 'ERR_NETWORK') {
        console.log('Offline or network error, trying cache...');
        const cached = await getCachedQuiz(materialId);
        if (cached) {
          setQuestions(cached.questions);
          setIsOfflineMode(true);
          console.log(`Loaded ${cached.questions.length} cached questions for offline use`);
          return;
        }
      }

      const message = err.response?.data?.message || 'Failed to generate quiz. Please try again.';
      setError(message);
      console.error('Failed to fetch quiz:', message);
    } finally {
      if (!isUpgrading) {
        setLoading(false);
      }
    }
  };

  const handleStartQuiz = () => {
    const start = pageStart ? parseInt(pageStart) : undefined;
    const end = pageEnd ? parseInt(pageEnd) : undefined;
    fetchQuiz({ startPage: start, endPage: end, diff: difficulty, count: questionCount });
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return; // Prevent changing answer
    setSelectedOption(option);

    const correct = option === getCorrectAnswer(questions[currentQuestionIndex]);
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
    }
  };

  const saveResult = async (finalScore: number) => {
    try {
      await api.post('/chat/quiz/result', {
        materialId,
        score: finalScore,
        totalQuestions: questions.length,
      });
      // toast.success('Quiz result saved!'); // Optional: don't spam user if not needed, but good for feedback
    } catch (err) {
      console.error('Failed to save quiz result', err);
      // If offline, save locally for later sync
      if (!navigator.onLine) {
        await savePendingResult(materialId, finalScore, questions.length);
        console.log('Quiz result saved locally for offline sync');
      } else {
        toast.error('Failed to save quiz result. Your score may not be recorded.');
      }
    }
  };

  const handleNextQuestion = () => {
    setAnimating(true);
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
        saveResult(score);
      }
      setAnimating(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-opacity duration-300'>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-slide-in { animation: slideIn 0.4s ease-out forwards; }
        .animate-pop-in { animation: popIn 0.3s ease-out forwards; }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ffd700;
          top: -20px;
          opacity: 0;
        }
      `}</style>

      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden relative flex flex-col animate-pop-in'>
        {/* Header */}
        <div className='flex-shrink-0 flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800'>
          <div className='flex items-center space-x-2'>
            <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400'>
              <Trophy className='w-5 h-5' />
            </div>
            <span className='font-bold text-lg text-gray-900 dark:text-gray-100'>
              Quick Quiz
            </span>
            {isOfflineMode && (
              <span className='flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full'>
                <WifiOff className='w-3 h-3' />
                Offline
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='flex-1 min-h-0 overflow-y-auto p-6 md:p-8'>
          {/* Configuration Panel - Show before generating */}
          {showConfig && !loading && questions.length === 0 && !error ? (
            <div className='flex flex-col items-center py-4 md:py-8'>
              <div className='w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 md:mb-6'>
                <Settings className='w-7 h-7 md:w-8 md:h-8 text-purple-600 dark:text-purple-400' />
              </div>

              <h3 className='text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center'>
                Configure Your Quiz
              </h3>
              <p className='text-sm md:text-base text-gray-500 dark:text-gray-400 text-center mb-6 px-4 max-w-sm'>
                Customize your quiz experience
              </p>

              <div className='w-full max-w-md space-y-5 px-2'>
                {/* Difficulty Selection - Mobile-first touch-friendly cards */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    Difficulty Level
                  </label>
                  <div className='grid grid-cols-3 gap-2 md:gap-3'>
                    {[
                      { value: 'beginner', label: 'Easy', icon: BookOpen, color: 'green' },
                      { value: 'intermediate', label: 'Medium', icon: Target, color: 'yellow' },
                      { value: 'advanced', label: 'Hard', icon: Zap, color: 'red' },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSelected = difficulty === option.value;
                      const colorClasses = {
                        green: isSelected
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300',
                        yellow: isSelected
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300',
                        red: isSelected
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-red-300',
                      }[option.color];

                      return (
                        <button
                          key={option.value}
                          onClick={() => setDifficulty(option.value as Difficulty)}
                          className={`flex flex-col items-center p-3 md:p-4 rounded-xl border-2 transition-all active:scale-95 ${colorClasses}`}
                        >
                          <Icon className={`w-5 h-5 md:w-6 md:h-6 mb-1 ${isSelected ? '' : 'text-gray-400'}`} />
                          <span className={`text-xs md:text-sm font-medium ${isSelected ? '' : 'text-gray-600 dark:text-gray-400'}`}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Count - Touch-friendly stepper */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    Number of Questions: <span className='text-purple-600 dark:text-purple-400 font-bold'>{questionCount}</span>
                  </label>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => setQuestionCount(Math.max(3, questionCount - 1))}
                      className='w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:border-purple-400 active:scale-95 transition-all'
                    >
                      −
                    </button>
                    <input
                      type='range'
                      min='3'
                      max='15'
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className='flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600'
                    />
                    <button
                      onClick={() => setQuestionCount(Math.min(15, questionCount + 1))}
                      className='w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:border-purple-400 active:scale-95 transition-all'
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Page Range Inputs - Collapsible on mobile */}
                <details className='group'>
                  <summary className='flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    <span>Page Range (Optional)</span>
                    <span className='text-xs text-gray-400 group-open:hidden'>Expand</span>
                  </summary>
                  <div className='flex items-center gap-3 mt-3'>
                    <input
                      type='number'
                      value={pageStart}
                      onChange={(e) => setPageStart(e.target.value)}
                      placeholder='From'
                      min='1'
                      inputMode='numeric'
                      className='flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none text-center'
                    />
                    <span className='text-gray-400'>to</span>
                    <input
                      type='number'
                      value={pageEnd}
                      onChange={(e) => setPageEnd(e.target.value)}
                      placeholder='To'
                      min='1'
                      inputMode='numeric'
                      className='flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 outline-none text-center'
                    />
                  </div>
                </details>

                {/* Tip */}
                <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl'>
                  <div className='flex items-start gap-2'>
                    <Info className='w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5' />
                    <p className='text-xs text-blue-700 dark:text-blue-300'>
                      <strong>Tip:</strong> Questions are generated from document segments. Try different difficulty levels for variety!
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button - Fixed at bottom on mobile */}
              <div className='w-full max-w-md px-2 mt-6'>
                <button
                  onClick={handleStartQuiz}
                  className='w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] flex items-center justify-center gap-2'
                >
                  <Sparkles className='w-5 h-5' />
                  Generate Quiz
                </button>
              </div>
            </div>
          ) : isUpgrading ? (
            <div className='flex flex-col items-center justify-center py-20'>
              <div className='relative'>
                <div className='absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse'></div>
                <Sparkles className='w-12 h-12 text-indigo-600 animate-bounce relative z-10' />
              </div>
              <p className='mt-6 text-gray-600 dark:text-gray-400 font-medium animate-pulse'>
                Preparing this material for smart study...
              </p>
              <p className='mt-2 text-sm text-gray-500 dark:text-gray-500'>
                This only happens once. Please wait a moment.
              </p>
            </div>
          ) : loading ? (
            <div className='flex flex-col items-center justify-center py-20'>
              <div className='relative'>
                <div className='absolute inset-0 bg-purple-500 blur-xl opacity-20 rounded-full animate-pulse'></div>
                <Loader2 className='w-12 h-12 text-purple-600 animate-spin relative z-10' />
              </div>
              <p className='mt-6 text-gray-600 dark:text-gray-400 font-medium animate-pulse'>
                Generating your quiz...
              </p>
            </div>
          ) : showResult ? (
            <div className='text-center py-10 relative overflow-hidden'>
              {/* Confetti Effect */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className='confetti-piece'
                  style={{
                    left: `${Math.random() * 100}%`,
                    animation: `confetti ${2 + Math.random() * 3}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: [
                      '#FFD700',
                      '#FF6B6B',
                      '#4ECDC4',
                      '#45B7D1',
                      '#96CEB4',
                    ][Math.floor(Math.random() * 5)],
                  }}
                />
              ))}

              <div className='inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full mb-8 animate-pop-in shadow-lg'>
                <Trophy className='w-16 h-16 text-yellow-500 dark:text-yellow-400 drop-shadow-sm' />
              </div>

              <h2
                className='text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 animate-slide-in'
                style={{ animationDelay: '0.1s' }}
              >
                {score === questions.length
                  ? 'Perfect Score!'
                  : score > questions.length / 2
                    ? 'Great Job!'
                    : 'Quiz Completed!'}
              </h2>

              <p
                className='text-xl text-gray-600 dark:text-gray-400 mb-10 animate-slide-in'
                style={{ animationDelay: '0.2s' }}
              >
                You scored{' '}
                <span className='font-bold text-purple-600 dark:text-purple-400 text-2xl'>
                  {score}
                </span>{' '}
                out of{' '}
                <span className='font-bold text-2xl'>{questions.length}</span>
              </p>

              <div
                className='flex justify-between gap-3 w-full animate-slide-in'
                style={{ animationDelay: '0.3s' }}
              >
                <button
                  onClick={onClose}
                  className='flex-1 px-2 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm md:text-base hover:bg-gray-200 dark:hover:bg-gray-700 transition-all whitespace-nowrap'
                >
                  Close
                </button>
                <button
                  onClick={resetQuiz}
                  className='flex-1 px-2 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-medium text-sm md:text-base hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all whitespace-nowrap'
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    resetQuiz();
                    fetchQuiz({ regenerate: true }); // regenerate=true for fresh questions
                  }}
                  className='flex-1 px-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm md:text-base hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center whitespace-nowrap'
                >
                  <Sparkles className='w-4 h-4 mr-1.5' />
                  New Questions
                </button>
              </div>

              {/* Change Settings Link */}
              <button
                onClick={() => {
                  setQuestions([]);
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setShowResult(false);
                  setSelectedOption(null);
                  setIsCorrect(null);
                  setShowConfig(true);
                }}
                className='mt-4 text-sm text-purple-600 dark:text-purple-400 hover:underline transition-all'
              >
                ⚙️ Change difficulty or settings
              </button>
            </div>
          ) : questions.length > 0 ? (
            <div
              className={`transition-opacity duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              <div className='flex justify-between items-center mb-8'>
                <span className='text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className='flex space-x-1.5'>
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 w-8 rounded-full transition-all duration-300 ${idx < currentQuestionIndex
                        ? 'bg-purple-600'
                        : idx === currentQuestionIndex
                          ? 'bg-purple-400 w-12'
                          : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    />
                  ))}
                </div>
              </div>

              <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 leading-relaxed'>
                {questions[currentQuestionIndex].question}
              </h3>

              <div className='space-y-4 mb-8'>
                {questions[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrectAnswer =
                    option === questions[currentQuestionIndex].correctAnswer;

                  let buttonClass =
                    'w-full p-5 text-left rounded-2xl border-2 transition-all duration-200 flex justify-between items-center group relative overflow-hidden ';

                  if (selectedOption) {
                    if (isSelected) {
                      buttonClass += isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 shadow-md'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-md';
                    } else if (isCorrectAnswer) {
                      buttonClass +=
                        'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 shadow-md';
                    } else {
                      buttonClass +=
                        'border-gray-100 dark:border-gray-800 opacity-40 grayscale';
                    }
                  } else {
                    buttonClass +=
                      'border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:shadow-md transform hover:-translate-y-0.5';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(option)}
                      disabled={selectedOption !== null}
                      className={buttonClass}
                      style={{ transitionDelay: `${idx * 50}ms` }}
                    >
                      <span className='font-medium text-lg relative z-10'>
                        {option}
                      </span>
                      {selectedOption && isSelected && (
                        <div className='relative z-10 p-1 rounded-full bg-white/20'>
                          {isCorrect ? (
                            <Check className='w-6 h-6 text-green-600' />
                          ) : (
                            <X className='w-6 h-6 text-red-600' />
                          )}
                        </div>
                      )}
                      {selectedOption && !isSelected && isCorrectAnswer && (
                        <div className='relative z-10 p-1 rounded-full bg-white/20'>
                          <Check className='w-6 h-6 text-green-600' />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Display */}
              {selectedOption && questions[currentQuestionIndex].explanation && (
                <div className={`p-4 rounded-xl mb-6 animate-slide-in ${isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  }`}>
                  <div className='flex items-start gap-3'>
                    <div className={`p-2 rounded-lg ${isCorrect
                      ? 'bg-green-100 dark:bg-green-800/30'
                      : 'bg-amber-100 dark:bg-amber-800/30'
                      }`}>
                      <Lightbulb className={`w-5 h-5 ${isCorrect
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-amber-600 dark:text-amber-400'
                        }`} />
                    </div>
                    <div>
                      <p className={`font-medium mb-1 ${isCorrect
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-amber-700 dark:text-amber-300'
                        }`}>
                        {isCorrect ? '🎉 Great job!' : '💡 Learn from this:'}
                      </p>
                      <p className='text-gray-700 dark:text-gray-300 text-sm leading-relaxed'>
                        {questions[currentQuestionIndex].explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedOption && (
                <div className='flex justify-end animate-slide-in'>
                  <button
                    onClick={handleNextQuestion}
                    className='flex items-center px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold transition-all hover:scale-105 shadow-xl hover:shadow-2xl'
                  >
                    {currentQuestionIndex < questions.length - 1
                      ? 'Next Question'
                      : 'See Results'}
                    <ArrowRight className='w-5 h-5 ml-2' />
                  </button>
                </div>
              )}
            </div>
          ) : error?.includes('UNSUPPORTED') ? (
            <div className='text-center py-10'>
              <div className='inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6'>
                <svg className='w-10 h-10 text-gray-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                Unsupported Document
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-4 max-w-sm mx-auto'>
                This document could not be processed for quiz generation.
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-500 mb-8 max-w-sm mx-auto'>
                It may be a scanned image, password-protected, or in an unsupported format.
              </p>
              <button
                onClick={onClose}
                className='px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium'
              >
                Close
              </button>
            </div>
          ) : error?.includes('PROCESSING') ? (
            <div className='text-center py-10'>
              <div className='inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-6 animate-pulse'>
                <svg className='w-10 h-10 text-amber-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                Still Processing
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto'>
                This material is still being analyzed. Please wait a moment and try again.
              </p>
              <div className='flex justify-center gap-3'>
                <button
                  onClick={onClose}
                  className='px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium'
                >
                  Close
                </button>
                <button
                  onClick={() => fetchQuiz()}
                  className='px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium'
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className='text-center py-10'>
              <div className='inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6'>
                <AlertCircle className='w-10 h-10 text-red-500' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                Oops!
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto'>
                {error || 'Failed to load quiz. Please try again.'}
              </p>
              <div className='flex justify-center gap-3'>
                <button
                  onClick={onClose}
                  className='px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium'
                >
                  Close
                </button>
                <button
                  onClick={() => fetchQuiz()}
                  className='px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium'
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
