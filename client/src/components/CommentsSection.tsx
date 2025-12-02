import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Send, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
}

interface CommentsSectionProps {
  materialId: string;
}

export function CommentsSection({ materialId }: CommentsSectionProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [materialId]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/chat/material/${materialId}/comments`);
      setComments(res.data);
    } catch {
      // console.error('Failed to fetch comments', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await api.post(`/chat/material/${materialId}/comment`, {
        content: newComment,
      });
      setNewComment('');
      fetchComments();
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex items-center'>
        <MessageSquare className='w-5 h-5 mr-2 text-primary-600' />
        <h3 className='font-bold text-gray-900 dark:text-gray-100'>
          Discussion
        </h3>
        <span className='ml-2 text-xs font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400'>
          {comments.length}
        </span>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {comments.length === 0 ? (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            <p>No comments yet.</p>
            <p className='text-sm'>Be the first to start the discussion!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className='flex space-x-3'>
              <div className='flex-shrink-0'>
                <div className='w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs overflow-hidden'>
                  {comment.user.image ? (
                    <img
                      src={comment.user.image}
                      alt={comment.user.firstName}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span>
                      {(comment.user.firstName?.[0] || '').toUpperCase()}
                      {(comment.user.lastName?.[0] || '').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className='flex-1'>
                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl rounded-tl-none p-3'>
                  <div className='flex justify-between items-start mb-1'>
                    <span className='font-bold text-sm text-gray-900 dark:text-gray-100'>
                      {comment.user.firstName} {comment.user.lastName}
                    </span>
                    <span className='text-xs text-gray-500'>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className='text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap'>
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className='p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
      >
        <div className='relative'>
          <input
            type='text'
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder='Add to the discussion...'
            className='w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary-500 outline-none transition-all'
          />
          <button
            type='submit'
            disabled={loading || !newComment.trim()}
            className='absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Send className='w-4 h-4' />
          </button>
        </div>
      </form>
    </div>
  );
}
