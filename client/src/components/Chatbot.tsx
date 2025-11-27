import { useState } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';
import api from '../lib/api';
import { CompactTimer } from './CompactTimer';
import { useToast } from '../contexts/ToastContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const toast = useToast();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat/message', { 
        content: input,
        conversationId 
      });
      
      // Save conversation ID from first response
      if (!conversationId && res.data.conversation?.id) {
        setConversationId(res.data.conversation.id);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: res.data.assistantMessage.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message', err);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const handlePersonalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', 'personal_note');
    formData.append('isPublic', 'false');

    setLoading(true);
    try {
      await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Successfully uploaded "${file.name}" for your personal study context.`);
    } catch (err) {
      console.error('Failed to upload file', err);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <CompactTimer />
        <button
          onClick={handleNewChat}
          className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Welcome to peerScholar</h2>
            <p className="mb-4">Ask me anything about your study materials!</p>
            {conversationId && (
              <button 
                onClick={handleNewChat}
                className="text-primary-600 hover:underline text-sm"
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
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        <div className="flex space-x-2 max-w-5xl mx-auto w-full">
          <button
            onClick={() => document.getElementById('personal-upload')?.click()}
            className="p-3 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="Upload for Personal Study (Eyes Only)"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            id="personal-upload"
            className="hidden"
            onChange={handlePersonalUpload}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
