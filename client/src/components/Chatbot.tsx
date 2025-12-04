import { useState, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, Brain } from 'lucide-react';
import api from '../lib/api';
import { CompactTimer } from './CompactTimer';
import { useToast } from '../contexts/ToastContext';
import { QuizModal } from './QuizModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  initialConversationId?: string | null;
  initialMaterialId?: string | null;
}

import { useParams, useNavigate } from 'react-router-dom';

export function Chatbot({
  initialConversationId,
  initialMaterialId,
}: ChatbotProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const toast = useToast();

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  useEffect(() => {
    // Priority: URL param > prop > null
    const targetId = id || initialConversationId;

    if (targetId) {
      setConversationId(targetId);
      void fetchMessages(targetId);
      setActiveMaterialId(null);
    } else {
      setConversationId(null);
      setMessages([]);
      if (initialMaterialId) {
        setActiveMaterialId(initialMaterialId);
      }
    }
  }, [id, initialConversationId, initialMaterialId]);

  const fetchMessages = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/chat/history/${id}`);
      const formattedMessages = res.data.messages.map(
        (msg: { role: 'user' | 'assistant'; content: string }) => ({
          role: msg.role,
          content: msg.content,
        }),
      );
      setMessages(formattedMessages);
    } catch (error: any) {
      // Ignore 404 (new conversation), only toast on other errors
      if (error.response?.status !== 404) {
        toast.error('Failed to load conversation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      // Focus input for caption
      const inputEl = document.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement;
      if (inputEl) inputEl.focus();
    }
  };

  const handleSend = async (
    inputOrEvent?: string,
    materialIdOverride?: string,
  ) => {
    const overrideInput =
      typeof inputOrEvent === 'string' ? inputOrEvent : undefined;
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && !attachedFile) return;

    const userContent = attachedFile
      ? `[Attached: ${attachedFile.name}] ${textToSend}`
      : textToSend;
    const userMessage: Message = { role: 'user', content: userContent };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = textToSend;
    const currentFile = attachedFile;

    setInput('');
    setAttachedFile(null);
    setLoading(true);

    try {
      let materialId = materialIdOverride || activeMaterialId;

      // If file attached, upload it first
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('title', currentFile.name);
        formData.append('category', 'personal_note');
        formData.append('isPublic', 'false');

        const uploadRes = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Use the uploaded file's ID for this message context
        if (uploadRes.data && uploadRes.data.id) {
          materialId = uploadRes.data.id;
          setActiveMaterialId(materialId); // Set as active for subsequent messages
        }
      }

      const res = await api.post('/chat/message', {
        content:
          currentInput ||
          (currentFile
            ? `Please read and summarize the content of ${currentFile.name}`
            : ''),
        conversationId,
        materialId,
      });

      // Save conversation ID from first response
      if (!conversationId && res.data.conversation?.id) {
        const newId = res.data.conversation.id;
        setConversationId(newId);
        navigate(`/chat/${newId}`);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: res.data.assistantMessage.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setActiveMaterialId(null);
    setInput('');
    navigate('/chat');
  };

  return (
    <div className='flex flex-col h-full relative'>
      <div className='flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800'>
        <CompactTimer />
        <div className='flex items-center space-x-2'>
          {activeMaterialId && (
            <button
              onClick={() => setIsQuizOpen(true)}
              className='group flex items-center px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-xl transition-colors font-medium text-sm'
            >
              <Brain className='w-4 h-4 mr-2' />
              Take Quiz
            </button>
          )}
          <button
            onClick={handleNewChat}
            className='group flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 font-medium text-sm'
          >
            <span className='mr-2 text-lg font-light'>+</span>
            New Chat
          </button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 md:p-8 space-y-4 scroll-smooth'>
        {messages.length === 0 ? (
          <div className='text-center text-gray-500 dark:text-gray-400 mt-10'>
            <h2 className='text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100'>
              Welcome to peerScholar
            </h2>
            <p className='mb-8'>Ask me anything about your study materials!</p>

            <div className='grid grid-cols-1 gap-3 max-w-md mx-auto'>
              <button
                onClick={() =>
                  handleSend(
                    'Summarize this material',
                    initialMaterialId || undefined,
                  )
                }
                className='p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                📝 Summarize this material
              </button>
              <button
                onClick={() =>
                  handleSend(
                    'What are the key concepts here?',
                    initialMaterialId || undefined,
                  )
                }
                className='p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                🔑 What are the key concepts?
              </button>
              <button
                onClick={() =>
                  handleSend(
                    'Generate 3 practice questions',
                    initialMaterialId || undefined,
                  )
                }
                className='p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                ❓ Generate 3 practice questions
              </button>
            </div>

            {conversationId && (
              <button
                onClick={handleNewChat}
                className='text-primary-600 hover:underline text-sm mt-6'
              >
                Start a new chat
              </button>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className='flex justify-start'>
            <div className='bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm'>
              <Loader2 className='w-5 h-5 animate-spin text-gray-500' />
            </div>
          </div>
        )}
      </div>

      <div className='border-t border-gray-200 dark:border-gray-700 p-3 md:p-4 bg-white dark:bg-gray-900'>
        {attachedFile && (
          <div className='mb-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between'>
            <div className='flex items-center truncate'>
              <Paperclip className='w-4 h-4 mr-2 text-primary-600' />
              <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>
                {attachedFile.name}
              </span>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className='text-gray-500 hover:text-red-500 ml-2'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        )}
        <div className='flex space-x-2 max-w-5xl mx-auto w-full items-end'>
          <button
            onClick={() => document.getElementById('chat-upload')?.click()}
            className={`p-3 rounded-xl transition-colors shrink-0 ${
              attachedFile
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title='Attach file'
          >
            <Paperclip className='w-5 h-5' />
          </button>
          <input
            type='file'
            id='chat-upload'
            className='hidden'
            onChange={handleFileSelect}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              attachedFile ? 'Add a caption...' : 'Ask a question...'
            }
            className='flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none resize-none min-h-[46px] max-h-32'
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || (!input.trim() && !attachedFile)}
            className='p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0'
          >
            <Send className='w-5 h-5' />
          </button>
        </div>
      </div>

      {activeMaterialId && (
        <QuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          materialId={activeMaterialId}
        />
      )}
    </div>
  );
}
