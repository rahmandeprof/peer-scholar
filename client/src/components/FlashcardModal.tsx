import { useState, useEffect } from 'react';
import { X, RotateCw, Check, Repeat, Brain, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useModalBack } from '../hooks/useModalBack';

interface Flashcard {
  term: string;
  definition: string;
}

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
}

export function FlashcardModal({
  isOpen,
  onClose,
  materialId,
}: FlashcardModalProps) {
  useModalBack(isOpen, onClose, 'flashcard-modal');

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchFlashcards();
    } else {
      // Reset state when closed
      setFlashcards([]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setError(null);
    }
  }, [isOpen, materialId]);

  const fetchFlashcards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/chat/flashcards/${materialId}`);
      setFlashcards(res.data);
    } catch (err) {
      console.error('Failed to fetch flashcards', err);
      setError('Failed to generate flashcards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150); // Wait for flip back
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800'>
          <div className='flex items-center space-x-3'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400'>
              <Brain className='w-6 h-6' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Flashcards
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {flashcards.length > 0
                  ? `Card ${currentIndex + 1} of ${flashcards.length}`
                  : 'Generating study material...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-6 h-6 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 p-8 overflow-y-auto min-h-[400px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950/50'>
          {loading ? (
            <div className='text-center space-y-4'>
              <Loader2 className='w-12 h-12 animate-spin text-indigo-600 mx-auto' />
              <p className='text-gray-600 dark:text-gray-400 font-medium'>
                Analyzing material and creating flashcards...
              </p>
            </div>
          ) : error ? (
            <div className='text-center space-y-4'>
              <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600'>
                <X className='w-8 h-8' />
              </div>
              <p className='text-red-600 font-medium'>{error}</p>
              <button
                onClick={fetchFlashcards}
                className='px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors'
              >
                Try Again
              </button>
            </div>
          ) : flashcards.length > 0 ? (
            <div className='w-full max-w-lg perspective-1000'>
              <div
                className={`relative w-full aspect-[3/2] cursor-pointer transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
                  }`}
                onClick={handleFlip}
              >
                {/* Front */}
                <div className='absolute inset-0 backface-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 text-center hover:shadow-2xl transition-shadow'>
                  <span className='text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4'>
                    Term
                  </span>
                  <h3 className='text-3xl font-bold text-gray-900 dark:text-white'>
                    {flashcards[currentIndex].term}
                  </h3>
                  <p className='mt-8 text-sm text-gray-400 flex items-center'>
                    <RotateCw className='w-4 h-4 mr-2' />
                    Click to flip
                  </p>
                </div>

                {/* Back */}
                <div className='absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl shadow-xl border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center p-8 text-center'>
                  <span className='text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4'>
                    Definition
                  </span>
                  <p className='text-xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed'>
                    {flashcards[currentIndex].definition}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className='text-center text-gray-500'>
              No flashcards found.
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!loading && !error && flashcards.length > 0 && (
          <div className='p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between gap-3'>
            <button
              onClick={handleNext}
              className='flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap'
            >
              <Repeat className='w-5 h-5 mr-2' />
              Review
            </button>
            <button
              onClick={handleNext}
              className='flex-1 flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 whitespace-nowrap'
            >
              <Check className='w-5 h-5 mr-2' />
              I Know It
            </button>
          </div>
        )}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
