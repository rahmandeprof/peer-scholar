import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Trophy, ArrowRight, Loader2 } from 'lucide-react';
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

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/chat/quiz/${materialId}`);
      setQuestions(res.data);
    } catch (err) {
      console.error('Failed to fetch quiz', err);
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
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setShowResult(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Generating your quiz...</p>
            </div>
          ) : showResult ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
                <Trophy className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Quiz Completed!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                You scored <span className="font-bold text-primary-600 text-xl">{score}</span> out of <span className="font-bold text-xl">{questions.length}</span>
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={fetchQuiz}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : questions.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="flex space-x-1">
                  {questions.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-1.5 w-6 rounded-full transition-colors ${
                        idx < currentQuestionIndex ? 'bg-primary-600' : 
                        idx === currentQuestionIndex ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 leading-relaxed">
                {questions[currentQuestionIndex].question}
              </h3>

              <div className="space-y-3 mb-8">
                {questions[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrectAnswer = option === questions[currentQuestionIndex].correctAnswer;
                  
                  let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 flex justify-between items-center group ";
                  
                  if (selectedOption) {
                    if (isSelected) {
                      buttonClass += isCorrect 
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
                    } else if (isCorrectAnswer) {
                      buttonClass += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
                    } else {
                      buttonClass += "border-gray-100 dark:border-gray-800 opacity-50";
                    }
                  } else {
                    buttonClass += "border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(option)}
                      disabled={selectedOption !== null}
                      className={buttonClass}
                    >
                      <span className="font-medium">{option}</span>
                      {selectedOption && isSelected && (
                        isCorrect ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />
                      )}
                      {selectedOption && !isSelected && isCorrectAnswer && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption && (
                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-lg hover:shadow-xl"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Failed to load quiz. Please try again.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
