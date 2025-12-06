import {
  X,
  Brain,
  FileText,
  Sparkles,
  MessageSquare,
  List,
  Loader2,
} from 'lucide-react';
import { Chatbot } from './Chatbot';
import { useState } from 'react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { QuizModal } from './QuizModal';

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
}

export function AISidebar({ isOpen, onClose, materialId }: AISidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[] | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const handleSummarize = async () => {
    setLoading(true);
    setSummary(null);
    setKeyPoints(null);
    try {
      const res = await api.get(`/chat/summary/${materialId}`);
      setSummary(res.data);
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPoints = async () => {
    setLoading(true);
    setSummary(null);
    setKeyPoints(null);
    try {
      const res = await api.get(`/chat/key-points/${materialId}`);
      let points = res.data;

      // Handle object wrapper
      if (points && typeof points === 'object' && !Array.isArray(points) && points.keyPoints) {
        points = points.keyPoints;
      }

      // Handle string response
      if (typeof points === 'string') {
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(points);
          if (Array.isArray(parsed)) {
            points = parsed;
          } else if (parsed.keyPoints && Array.isArray(parsed.keyPoints)) {
            points = parsed.keyPoints;
          }
        } catch {
          // If not JSON, split by newlines and clean up
          points = points
            .split('\n')
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0)
            .map((p: string) => p.replace(/^[•-]\s*/, '')); // Remove bullet points if present
        }
      }

      if (Array.isArray(points) && points.length > 0) {
        setKeyPoints(points);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Key Points Error:', err);
      toast.error('Failed to extract key points. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 flex flex-col shrink-0 shadow-2xl z-[800] border-l border-gray-200 dark:border-gray-700 h-full transition-all duration-300 ease-in-out fixed inset-y-0 right-0 md:relative md:inset-auto ${
        isOpen
          ? 'w-full md:w-[400px] translate-x-0'
          : 'w-0 translate-x-full md:translate-x-0 md:w-0'
      }`}
    >
      {/* Sidebar Header */}
      <div className='h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm'>
        <div className='flex items-center space-x-2'>
          <Sparkles className='w-5 h-5 text-primary-600' />
          <h2 className='font-bold text-gray-900 dark:text-white'>
            AI Companion
          </h2>
        </div>
        <button
          onClick={onClose}
          className='p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500'
        >
          <X className='w-5 h-5' />
        </button>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-gray-200 dark:border-gray-700'>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
            activeTab === 'chat'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <MessageSquare className='w-4 h-4 mr-2' />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
            activeTab === 'tools'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Brain className='w-4 h-4 mr-2' />
          Study Tools
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-hidden flex flex-col w-full md:w-[400px]'>
        {activeTab === 'chat' ? (
          <Chatbot initialMaterialId={materialId} embedded={true} />
        ) : (
          <div className='p-6 space-y-6 overflow-y-auto'>
            <div className='space-y-4'>
              <h3 className='text-sm font-bold text-gray-500 uppercase tracking-wider'>
                Quick Actions
              </h3>

              <button
                onClick={() => setQuizOpen(true)}
                className='w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group'
              >
                <div className='flex items-center'>
                  <div className='p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform'>
                    <Brain className='w-4 h-4' />
                  </div>
                  <div>
                    <span className='font-bold text-gray-900 dark:text-white text-sm block'>
                      Generate Quiz
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      Create a 5-question quiz
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={handleSummarize}
                disabled={loading}
                className='w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group disabled:opacity-50'
              >
                <div className='flex items-center'>
                  <div className='p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform'>
                    <FileText className='w-4 h-4' />
                  </div>
                  <div>
                    <span className='font-bold text-gray-900 dark:text-white text-sm block'>
                      Summarize
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      Get a concise summary
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={handleKeyPoints}
                disabled={loading}
                className='w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group disabled:opacity-50'
              >
                <div className='flex items-center'>
                  <div className='p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 mr-3 group-hover:scale-110 transition-transform'>
                    <List className='w-4 h-4' />
                  </div>
                  <div>
                    <span className='font-bold text-gray-900 dark:text-white text-sm block'>
                      Key Points
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      Extract important concepts
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {loading && (
              <div className='flex justify-center py-8'>
                <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
              </div>
            )}

            {summary && (
              <div className='bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm animate-fade-in'>
                <h3 className='font-bold text-gray-900 dark:text-white mb-4 flex items-center'>
                  <Sparkles className='w-4 h-4 mr-2 text-primary-500' />
                  Summary
                </h3>
                <div className='prose dark:prose-invert text-sm max-w-none'>
                  {summary}
                </div>
              </div>
            )}

            {keyPoints && (
              <div className='bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm animate-fade-in'>
                <h3 className='font-bold text-gray-900 dark:text-white mb-4 flex items-center'>
                  <List className='w-4 h-4 mr-2 text-green-500' />
                  Key Points
                </h3>
                <ul className='space-y-2'>
                  {keyPoints.map((point, i) => (
                    <li
                      key={i}
                      className='flex items-start text-sm text-gray-700 dark:text-gray-300'
                    >
                      <span className='mr-2 mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0' />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <QuizModal
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        materialId={materialId}
      />
    </div>
  );
}
