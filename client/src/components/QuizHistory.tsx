import { useEffect, useState } from 'react';
import { Trophy, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { Skeleton } from './Skeleton';
import api from '../lib/api';

interface QuizResult {
  id: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  material: {
    id: string;
    title: string;
  };
}

export function QuizHistory() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/chat/quiz/history');
        setResults(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800'
          >
            <div className='flex items-center space-x-4 w-full'>
              <Skeleton className='w-12 h-12 rounded-full flex-shrink-0' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-8 text-red-500 flex flex-col items-center'>
        <AlertCircle className='w-8 h-8 mb-2' />
        <p>Failed to load quiz history</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
        <Trophy className='w-12 h-12 mx-auto mb-3 opacity-50' />
        <p>No quizzes taken yet.</p>
        <p className='text-sm mt-1'>
          Open a material and click "Generate Quiz" to start practicing!
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {results.map((result) => (
        <div
          key={result.id}
          className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800'
        >
          <div className='flex items-center space-x-4'>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                result.score === result.totalQuestions
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : result.score >= result.totalQuestions / 2
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              }`}
            >
              {Math.round((result.score / result.totalQuestions) * 100)}%
            </div>
            <div>
              <h4 className='font-medium text-gray-900 dark:text-gray-100 flex items-center'>
                <BookOpen className='w-3 h-3 mr-1.5 text-gray-400' />
                {result.material.title}
              </h4>
              <div className='flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1'>
                <Calendar className='w-3 h-3 mr-1' />
                {new Date(result.createdAt).toLocaleDateString()}
                <span className='mx-2'>•</span>
                {result.score}/{result.totalQuestions} Correct
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
