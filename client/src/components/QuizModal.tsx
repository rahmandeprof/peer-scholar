import { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Trophy,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '../lib/api';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

export function QuizModal({ isOpen, onClose, materialId }: QuizModalProps) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchQuiz();
    } else {
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
  };

  const fetchQuiz = async (bypassCache = false) => {
    setLoading(true);
    try {
      const cacheKey = `cached_quiz_${materialId}`;
      
      if (!bypassCache) {
        // Check cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setQuestions(JSON.parse(cached));
          setLoading(false);
          return;
        }
      } else {
        // Clear cache if bypassing
        localStorage.removeItem(cacheKey);
      }

      const res = await api.post(`/chat/quiz/${materialId}`);
      setQuestions(res.data);

      // Cache it
      localStorage.setItem(cacheKey, JSON.stringify(res.data));
    } catch {
      // console.error('Failed to fetch quiz', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return; // Prevent changing answer
    setSelectedOption(option);

    const correct = option === questions[currentQuestionIndex].correctAnswer;
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
      // toast.error('Failed to save quiz result');
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

      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col animate-pop-in'>
        {/* Header */}
        <div className='flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800'>
          <div className='flex items-center space-x-2'>
            <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400'>
              <Trophy className='w-5 h-5' />
            </div>
            <span className='font-bold text-lg text-gray-900 dark:text-gray-100'>
              Quick Quiz
            </span>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 md:p-8'>
          {loading ? (
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
                className='flex justify-center flex-wrap gap-4 animate-slide-in'
                style={{ animationDelay: '0.3s' }}
              >
                <button
                  onClick={onClose}
                  className='px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all'
                >
                  Close
                </button>
                <button
                  onClick={resetQuiz}
                  className='px-6 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all'
                >
                  Retry
                </button>
                <button
                  onClick={() => {
                    resetQuiz();
                    fetchQuiz(true);
                  }}
                  className='px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-purple-500/25 flex items-center'
                >
                  <Sparkles className='w-4 h-4 mr-2' />
                  New Quiz
                </button>
              </div>
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
                      className={`h-2 w-8 rounded-full transition-all duration-300 ${
                        idx < currentQuestionIndex
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
          ) : (
            <div className='text-center py-10'>
              <div className='inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6'>
                <AlertCircle className='w-10 h-10 text-red-500' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                Oops!
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-8'>
                Failed to load quiz. Please try again.
              </p>
              <button
                onClick={onClose}
                className='px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium'
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
