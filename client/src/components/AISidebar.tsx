import { X, Brain, FileText, Sparkles, MessageSquare, List, Loader2 } from 'lucide-react';
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
      setKeyPoints(res.data);
    } catch {
      toast.error('Failed to extract key points');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-[400px] bg-white dark:bg-gray-800 flex flex-col shrink-0 shadow-2xl z-20 border-l border-gray-200 dark:border-gray-700 h-full animate-slide-left'>
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
      <div className='flex-1 overflow-hidden flex flex-col'>
        {activeTab === 'chat' ? (
          <Chatbot initialMaterialId={materialId} />
        ) : (
          <div className='p-6 space-y-6 overflow-y-auto'>
            <div className='space-y-4'>
              <h3 className='text-sm font-bold text-gray-500 uppercase tracking-wider'>
                Quick Actions
              </h3>

              <button
                onClick={() => setQuizOpen(true)}
                className='w-full p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group'
              >
                <div className='flex items-center mb-2'>
                  <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mr-3 group-hover:scale-110 transition-transform'>
                    <Brain className='w-5 h-5' />
                  </div>
                  <span className='font-bold text-gray-900 dark:text-white'>
                    Generate Quiz
                  </span>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400 pl-[3.25rem]'>
                  Create a 5-question quiz based on this material.
                </p>
              </button>

              <button
                onClick={handleSummarize}
                disabled={loading}
                className='w-full p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group disabled:opacity-50'
              >
                <div className='flex items-center mb-2'>
                  <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 mr-3 group-hover:scale-110 transition-transform'>
                    <FileText className='w-5 h-5' />
                  </div>
                  <span className='font-bold text-gray-900 dark:text-white'>
                    Summarize
                  </span>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400 pl-[3.25rem]'>
                  Get a concise summary of the key points.
                </p>
              </button>

              <button
                onClick={handleKeyPoints}
                disabled={loading}
                className='w-full p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group disabled:opacity-50'
              >
                <div className='flex items-center mb-2'>
                  <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 mr-3 group-hover:scale-110 transition-transform'>
                    <List className='w-5 h-5' />
                  </div>
                  <span className='font-bold text-gray-900 dark:text-white'>
                    Key Points
                  </span>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400 pl-[3.25rem]'>
                  Extract the most important concepts.
                </p>
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
                    <li key={i} className='flex items-start text-sm text-gray-700 dark:text-gray-300'>
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
