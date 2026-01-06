import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Repeat,
  Brain,
  Settings,
  Sparkles,
  Info,
  BookOpen,
  Timer,
  CheckCircle,
} from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';
import { useModalBack } from '../hooks/useModalBack';

// Support both old format (term/definition) and new format (id/front/back)
interface Flashcard {
  id?: string;
  term?: string;
  definition?: string;
  front?: string;
  back?: string;
}

// Helper to normalize flashcard data
const getFlashcardFront = (card: Flashcard): string =>
  card.front || card.term || '';
const getFlashcardBack = (card: Flashcard): string =>
  card.back || card.definition || '';

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

  // Configuration state
  const [showConfig, setShowConfig] = useState(true);
  const [cardCount, setCardCount] = useState(10);
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');

  // Spaced repetition / review mode
  const [reviewMode, setReviewMode] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Upgrading status tracking
  const [isUpgrading, setIsUpgrading] = useState(false);
  const pollingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOptionsRef = React.useRef<
    | {
        count?: number;
        startPage?: number;
        endPage?: number;
      }
    | undefined
  >(undefined);

  // Touch swipe handling for mobile
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - (touchStartY.current || 0);
    // Only track horizontal swipes (not vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX * 0.3); // Dampen the swipe feedback
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const swipeThreshold = 80; // Minimum swipe distance

    if (deltaX < -swipeThreshold && !isFlipped) {
      // Swipe left → next card
      handleNext();
    } else if (deltaX > swipeThreshold && !isFlipped) {
      // Swipe right → previous card
      handlePrev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
  };

  // Cleanup polling on unmount
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
      // Don't auto-fetch, show config first
      setShowConfig(true);
    } else {
      // Clear polling when modal closes
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      // Reset state when closed
      resetState();
    }
  }, [isOpen, materialId]);

  const resetState = () => {
    setFlashcards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setError(null);
    setShowConfig(true);
    setCardCount(10);
    setPageStart('');
    setPageEnd('');
    setLoading(false);
    setReviewMode(false);
    setCardsReviewed(0);
    setSubmittingReview(false);
    setIsUpgrading(false);
  };

  const fetchFlashcards = async (options?: {
    count?: number;
    startPage?: number;
    endPage?: number;
  }) => {
    setLoading(true);
    setError(null);
    setShowConfig(false);
    setIsUpgrading(false);
    lastOptionsRef.current = options;

    // Clear any existing polling
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const body: Record<string, unknown> = {};
      if (options?.count) body.cardCount = options.count;
      if (options?.startPage) body.pageStart = options.startPage;
      if (options?.endPage) body.pageEnd = options.endPage;

      const res = await api.post(`/chat/flashcards/${materialId}`, body);

      // Handle upgrading status - material is being upgraded to v2
      if (res.data && res.data.status === 'upgrading') {
        setIsUpgrading(true);
        setLoading(false);
        // Poll again after 3 seconds
        pollingRef.current = setTimeout(() => {
          fetchFlashcards(lastOptionsRef.current);
        }, 3000);
        return;
      }

      // Check for valid flashcard data (should be an array)
      if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
        setError(
          'No flashcards could be generated for this material. The content may be too short or not suitable for flashcard generation.',
        );
      } else {
        setFlashcards(res.data);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'Failed to generate flashcards. Please try again.';
      setError(message);
      console.error('Failed to fetch flashcards:', message);
    } finally {
      if (!isUpgrading) {
        setLoading(false);
      }
    }
  };

  const handleStartFlashcards = () => {
    const start = pageStart ? parseInt(pageStart) : undefined;
    const end = pageEnd ? parseInt(pageEnd) : undefined;
    fetchFlashcards({ count: cardCount, startPage: start, endPage: end });
  };

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(
        (prev) => (prev - 1 + flashcards.length) % flashcards.length,
      );
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNewCards = () => {
    resetState();
  };

  // Spaced repetition: Submit review quality rating
  const handleReviewResponse = async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!reviewMode || submittingReview) return;

    setSubmittingReview(true);
    try {
      await api.post(`/study/flashcards/${materialId}/review`, {
        cardIndex: currentIndex,
        quality,
      });
      setCardsReviewed((prev) => prev + 1);

      // Move to next card or finish
      if (currentIndex < flashcards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 150);
      } else {
        // Session complete - could show summary here
        setIsFlipped(false);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to record review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]'>
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0'>
          <div className='flex items-center space-x-3'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400'>
              <Brain className='w-5 h-5' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                Flashcards
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {flashcards.length > 0
                  ? `Card ${currentIndex + 1} of ${flashcards.length}`
                  : showConfig
                    ? 'Configure your deck'
                    : 'Generating study cards...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto'>
          {/* Configuration Panel */}
          {showConfig && !loading && flashcards.length === 0 && !error ? (
            <div className='flex flex-col items-center py-6 md:py-8 px-4'>
              <div className='w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4'>
                <Settings className='w-7 h-7 text-indigo-600 dark:text-indigo-400' />
              </div>

              <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 text-center'>
                Configure Flashcards
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm'>
                Customize your flashcard deck
              </p>

              <div className='w-full max-w-md space-y-5'>
                {/* Card Count - Touch-friendly stepper */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    Number of Cards:{' '}
                    <span className='text-indigo-600 dark:text-indigo-400 font-bold'>
                      {cardCount}
                    </span>
                  </label>
                  <div className='flex items-center gap-3'>
                    <button
                      onClick={() => setCardCount(Math.max(5, cardCount - 1))}
                      className='w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:border-indigo-400 active:scale-95 transition-all'
                    >
                      −
                    </button>
                    <input
                      type='range'
                      min='5'
                      max='20'
                      value={cardCount}
                      onChange={(e) => setCardCount(parseInt(e.target.value))}
                      className='flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600'
                    />
                    <button
                      onClick={() => setCardCount(Math.min(20, cardCount + 1))}
                      className='w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400 hover:border-indigo-400 active:scale-95 transition-all'
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Page Range - Collapsible */}
                <details className='group'>
                  <summary className='flex items-center justify-between cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    <span>Page Range (Optional)</span>
                    <span className='text-xs text-gray-400 group-open:hidden'>
                      Expand
                    </span>
                  </summary>
                  <div className='flex items-center gap-3 mt-3'>
                    <input
                      type='number'
                      value={pageStart}
                      onChange={(e) => setPageStart(e.target.value)}
                      placeholder='From'
                      min='1'
                      inputMode='numeric'
                      className='flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none text-center'
                    />
                    <span className='text-gray-400'>to</span>
                    <input
                      type='number'
                      value={pageEnd}
                      onChange={(e) => setPageEnd(e.target.value)}
                      placeholder='To'
                      min='1'
                      inputMode='numeric'
                      className='flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none text-center'
                    />
                  </div>
                </details>

                {/* Tip */}
                <div className='p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl'>
                  <div className='flex items-start gap-2'>
                    <Info className='w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5' />
                    <p className='text-xs text-indigo-700 dark:text-indigo-300'>
                      <strong>Tip:</strong> Flashcards are generated from
                      document segments. Specify a page range to focus on
                      specific sections!
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className='w-full max-w-md mt-6'>
                <button
                  onClick={handleStartFlashcards}
                  className='w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.98] flex items-center justify-center gap-2'
                >
                  <Sparkles className='w-5 h-5' />
                  Generate Flashcards
                </button>
              </div>
            </div>
          ) : isUpgrading ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8'>
              <div className='text-center space-y-4'>
                <div className='relative inline-block'>
                  <div className='absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse'></div>
                  <Sparkles className='w-12 h-12 text-indigo-600 animate-bounce relative z-10 mx-auto' />
                </div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Preparing Material
                </h3>
                <p className='text-gray-600 dark:text-gray-400 max-w-sm mx-auto'>
                  Getting this material ready for smart study. This only happens
                  once.
                </p>
                <p className='text-sm text-gray-500 animate-pulse'>
                  Please wait a moment...
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8'>
              <div className='text-center space-y-4'>
                <BorderSpinner size='xl' className='text-indigo-600 mx-auto' />
                <p className='text-gray-600 dark:text-gray-400 font-medium'>
                  Analyzing material and creating flashcards...
                </p>
              </div>
            </div>
          ) : error?.includes('UNSUPPORTED') ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8'>
              <div className='text-center space-y-4'>
                <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto'>
                  <BookOpen className='w-8 h-8 text-gray-500' />
                </div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Unsupported Document
                </h3>
                <p className='text-gray-600 dark:text-gray-400 max-w-sm mx-auto'>
                  This document could not be processed for flashcard generation.
                </p>
                <button
                  onClick={onClose}
                  className='px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors'
                >
                  Close
                </button>
              </div>
            </div>
          ) : error?.includes('PROCESSING') ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8'>
              <div className='text-center space-y-4'>
                <div className='w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto animate-pulse'>
                  <BorderSpinner size='lg' className='text-amber-600' />
                </div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Still Processing
                </h3>
                <p className='text-gray-600 dark:text-gray-400 max-w-sm mx-auto'>
                  This material is still being analyzed. Please wait a moment
                  and try again.
                </p>
                <button
                  onClick={() => fetchFlashcards({ count: cardCount })}
                  className='px-6 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors'
                >
                  Retry
                </button>
              </div>
            </div>
          ) : error ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8'>
              <div className='text-center space-y-4'>
                <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600'>
                  <X className='w-8 h-8' />
                </div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                  Generation Failed
                </h3>
                <p className='text-gray-600 dark:text-gray-400 max-w-sm mx-auto'>
                  {error}
                </p>
                <button
                  onClick={handleNewCards}
                  className='px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors'
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : flashcards.length > 0 ? (
            <div className='min-h-[400px] flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-950/50'>
              {/* Flashcard with swipe support */}
              <div
                onClick={handleFlip}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className='w-full max-w-lg aspect-[3/2] perspective-1000 cursor-pointer touch-pan-y select-none'
                style={{
                  transform: `translateX(${swipeOffset}px)`,
                  transition: swipeOffset === 0 ? 'transform 0.2s' : 'none',
                }}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
                  }}
                >
                  {/* Front */}
                  <div
                    className='absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center backface-hidden border-2 border-indigo-100 dark:border-indigo-900/50'
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <p className='text-xs text-indigo-500 uppercase tracking-wide mb-4'>
                      Term
                    </p>
                    <p className='text-xl font-bold text-center text-gray-900 dark:text-white'>
                      {getFlashcardFront(flashcards[currentIndex])}
                    </p>
                    <p className='text-sm text-gray-400 mt-6'>
                      Tap to flip · Swipe for next
                    </p>
                  </div>
                  {/* Back */}
                  <div
                    className='absolute inset-0 bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center backface-hidden'
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <p className='text-xs text-indigo-200 uppercase tracking-wide mb-4'>
                      Definition
                    </p>
                    <p className='text-lg font-medium text-center text-white'>
                      {getFlashcardBack(flashcards[currentIndex])}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className='flex flex-col items-center gap-4 mt-8'>
                {/* Review Mode Toggle */}
                <button
                  onClick={() => setReviewMode(!reviewMode)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    reviewMode
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  <Timer className='w-3 h-3 inline mr-1' />
                  {reviewMode ? 'Review Mode ON' : 'Study Mode'}
                </button>

                {/* Review Mode: Show rating buttons when flipped */}
                {reviewMode && isFlipped ? (
                  <div className='flex flex-wrap items-center justify-center gap-2'>
                    <button
                      onClick={() => handleReviewResponse(0)}
                      disabled={submittingReview}
                      className='px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors text-sm disabled:opacity-50'
                    >
                      Again
                    </button>
                    <button
                      onClick={() => handleReviewResponse(3)}
                      disabled={submittingReview}
                      className='px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors text-sm disabled:opacity-50'
                    >
                      Hard
                    </button>
                    <button
                      onClick={() => handleReviewResponse(4)}
                      disabled={submittingReview}
                      className='px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors text-sm disabled:opacity-50'
                    >
                      Good
                    </button>
                    <button
                      onClick={() => handleReviewResponse(5)}
                      disabled={submittingReview}
                      className='px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors text-sm disabled:opacity-50'
                    >
                      Easy
                    </button>
                  </div>
                ) : (
                  /* Normal Controls */
                  <div className='flex items-center gap-4'>
                    <button
                      onClick={handleRestart}
                      className='p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
                      title='Restart'
                    >
                      <RotateCw className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                    </button>
                    <button
                      onClick={handleNext}
                      className='px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2'
                    >
                      Next Card
                      <Repeat className='w-4 h-4' />
                    </button>
                    <button
                      onClick={handleNewCards}
                      className='p-3 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
                      title='New Deck'
                    >
                      <Sparkles className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                    </button>
                  </div>
                )}

                {/* Review progress indicator */}
                {reviewMode && cardsReviewed > 0 && (
                  <p className='text-xs text-gray-500 flex items-center gap-1'>
                    <CheckCircle className='w-3 h-3 text-green-500' />
                    {cardsReviewed} cards reviewed this session
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
