import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Trophy, Clock, Swords, Frown } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface GameState {
  status: 'waiting' | 'countdown' | 'playing' | 'finished' | 'result';
  countdown: number;
  currentQuestionIndex: number;
  score: number;
  timeLeft: number;
  opponentScore?: number;
  winnerId?: string | null;
}

export function QuizArena() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Questions passed via navigation state or fetched via socket
  const questions: Question[] = location.state?.questions || [];
  
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    countdown: 3,
    currentQuestionIndex: 0,
    score: 0,
    timeLeft: 60, // 60 seconds total for the quiz
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!socket || !challengeId || !user) return;

    socket.emit('join_challenge_room', challengeId);

    // If questions were not passed in state (e.g. refresh), we might need to handle that.
    // For now, assume they come from the 'start_challenge' event which redirects here.
    // If we are here and have no questions, maybe we should redirect back or show error.
    if (questions.length === 0) {
        // In a real app, we might fetch from server or listen for 'sync_state'
        toast.error('No quiz data found. Redirecting...');
        navigate('/dashboard');
    } else {
        // Start countdown
        setGameState(prev => ({ ...prev, status: 'countdown' }));
    }

    socket.on('challenge_result', (data: { winnerId: string | null; scores: any }) => {
        setGameState(prev => ({ 
            ...prev, 
            status: 'result', 
            winnerId: data.winnerId 
        }));
        
        if (data.winnerId === user.id) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#FF4500'],
            });
        }
    });

    return () => {
        socket.off('challenge_result');
    };
  }, [socket, challengeId, user, navigate, questions.length, toast]);

  // Countdown Logic
  useEffect(() => {
    if (gameState.status === 'countdown') {
        if (gameState.countdown > 0) {
            const timer = setTimeout(() => {
                setGameState(prev => ({ ...prev, countdown: prev.countdown - 1 }));
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setGameState(prev => ({ ...prev, status: 'playing' }));
            startTimeRef.current = Date.now();
        }
    }
  }, [gameState.status, gameState.countdown]);

  // Game Timer Logic
  useEffect(() => {
    if (gameState.status === 'playing') {
        if (gameState.timeLeft > 0) {
            const timer = setTimeout(() => {
                setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            // Time up!
            finishGame();
        }
    }
  }, [gameState.status, gameState.timeLeft]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const currentQ = questions[gameState.currentQuestionIndex];
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
        setGameState(prev => ({ ...prev, score: prev.score + 10 })); // 10 points per question
    }

    // Auto advance after short delay
    setTimeout(() => {
        if (gameState.currentQuestionIndex < questions.length - 1) {
            setGameState(prev => ({
                ...prev,
                currentQuestionIndex: prev.currentQuestionIndex + 1
            }));
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            finishGame();
        }
    }, 1500);
  };

  const finishGame = () => {
    if (gameState.status === 'finished' || gameState.status === 'result') return;

    setGameState(prev => ({ ...prev, status: 'finished' }));
    
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    
    // Calculate final score (add remaining time bonus if all correct? Optional)
    // For now just raw score.
    
    if (socket && challengeId && user) {
        socket.emit('submit_score', {
            challengeId,
            userId: user.id,
            score: gameState.score + (selectedOption === questions[gameState.currentQuestionIndex].correctAnswer ? 10 : 0), // Add last question score if correct
            timeTaken
        });
    }
  };

  if (gameState.status === 'waiting' || gameState.status === 'countdown') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <h1 className="text-6xl font-black mb-8 animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600">
                    {gameState.status === 'waiting' ? 'READY?' : gameState.countdown}
                </h1>
                <p className="text-xl text-gray-400">Prepare for battle...</p>
            </div>
        </div>
    );
  }

  if (gameState.status === 'result') {
      const isWinner = gameState.winnerId === user?.id;
      const isTie = gameState.winnerId === 'tie';

      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
              <div className="max-w-md w-full bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 text-center">
                  {isWinner ? (
                      <>
                        <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-6 animate-bounce" />
                        <h1 className="text-4xl font-black text-yellow-400 mb-2">VICTORY!</h1>
                        <p className="text-gray-300 mb-8">You crushed it!</p>
                      </>
                  ) : isTie ? (
                      <>
                        <Swords className="w-24 h-24 mx-auto text-blue-400 mb-6" />
                        <h1 className="text-4xl font-black text-blue-400 mb-2">DRAW!</h1>
                        <p className="text-gray-300 mb-8">An evenly matched battle.</p>
                      </>
                  ) : (
                      <>
                        <Frown className="w-24 h-24 mx-auto text-red-400 mb-6" />
                        <h1 className="text-4xl font-black text-red-400 mb-2">DEFEAT</h1>
                        <p className="text-gray-300 mb-8">Better luck next time.</p>
                      </>
                  )}
                  
                  <div className="bg-gray-700/50 rounded-xl p-4 mb-8">
                      <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-1">Your Score</p>
                      <p className="text-3xl font-bold">{gameState.score}</p>
                  </div>

                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                  >
                      Return to Base
                  </button>
              </div>
          </div>
      );
  }

  const currentQuestion = questions[gameState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500">
                    <Trophy className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Score</p>
                    <p className="text-2xl font-black">{gameState.score}</p>
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
                <Clock className={`w-5 h-5 ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`} />
                <span className={`text-xl font-mono font-bold ${gameState.timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>
                    {gameState.timeLeft}s
                </span>
            </div>
        </div>

        {/* Question Card */}
        <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
            <div className="mb-8">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        Question {gameState.currentQuestionIndex + 1} of {questions.length}
                    </span>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                    {currentQuestion.question}
                </h2>
            </div>

            <div className="grid gap-4">
                {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentQuestion.correctAnswer;
                    
                    let className = "p-6 rounded-2xl border-2 text-left transition-all transform hover:scale-[1.01] active:scale-[0.99] ";
                    
                    if (isAnswered) {
                        if (isCorrect) className += "bg-green-500/20 border-green-500 text-green-100";
                        else if (isSelected) className += "bg-red-500/20 border-red-500 text-red-100";
                        else className += "bg-gray-800 border-gray-700 opacity-50";
                    } else {
                        className += "bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-750 cursor-pointer";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleOptionClick(option)}
                            disabled={isAnswered}
                            className={className}
                        >
                            <span className="text-lg font-medium">{option}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
}
