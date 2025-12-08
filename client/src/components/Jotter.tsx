import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { X, Save, GripHorizontal } from 'lucide-react';
import api from '../lib/api';
// import { useToast } from '../contexts/ToastContext';

interface JotterProps {
  materialId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Jotter({ materialId, isOpen, onClose }: JotterProps) {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  // const toast = useToast();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load note from backend on open
  useEffect(() => {
    if (isOpen) {
      const fetchNote = async () => {
        try {
          const res = await api.get(`/materials/${materialId}/note`);
          if (res.data) {
            setContent(res.data.content);
            localStorage.setItem(`jotter_${materialId}`, res.data.content);
          } else {
            // Try local storage fallback
            const local = localStorage.getItem(`jotter_${materialId}`);
            if (local) setContent(local);
          }
        } catch (error) {
          // Fallback to local storage if offline or error
          const local = localStorage.getItem(`jotter_${materialId}`);
          if (local) setContent(local);
        }
      };
      fetchNote();
    }
  }, [isOpen, materialId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (content) {
      localStorage.setItem(`jotter_${materialId}`, content);
    }
  }, [content, materialId]);

  // Auto-save to Backend (Debounce 5s)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (content) {
      saveTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 5000);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content]);

  const saveNote = async () => {
    setIsSaving(true);
    try {
      await api.post(`/materials/${materialId}/note`, { content });
    } catch (error) {
      console.error('Failed to save note', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const JotterContent = (
    <div
      className={`flex flex-col h-full bg-yellow-50 dark:bg-gray-800 shadow-2xl border border-yellow-200 dark:border-gray-700 ${isMobile ? 'rounded-t-3xl' : 'rounded-xl w-80 h-96'}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-2 border-b border-yellow-100 dark:border-gray-700 cursor-move handle bg-yellow-100/50 dark:bg-gray-700/50 rounded-t-xl'>
        <div className='flex items-center text-yellow-800 dark:text-yellow-500 font-bold text-sm'>
          <GripHorizontal className='w-4 h-4 mr-2 opacity-50' />
          Jotter
        </div>
        <div className='flex items-center space-x-2'>
          {isSaving && (
            <span className='text-xs text-gray-400 animate-pulse'>
              Saving...
            </span>
          )}
          <button
            onClick={onClose}
            className='p-1 hover:bg-yellow-200/50 dark:hover:bg-gray-600 rounded-full text-gray-500'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className='flex-1 p-0 overflow-hidden relative'>
        {/* Simple Lined Paper Background Effect */}
        <div
          className='absolute inset-0 pointer-events-none opacity-10'
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px)',
            backgroundSize: '100% 2rem',
            marginTop: '2rem',
          }}
        ></div>

        <textarea
          className='w-full h-full resize-none bg-transparent p-4 text-gray-800 dark:text-gray-200 focus:outline-none text-sm leading-8'
          placeholder='Type your notes here...'
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      {/* Footer */}
      <div className='p-2 border-t border-yellow-100 dark:border-gray-700 flex justify-end'>
        <button
          onClick={() => saveNote()}
          className='flex items-center text-xs font-bold text-yellow-700 dark:text-yellow-500 hover:text-yellow-800 dark:hover:text-yellow-400 px-3 py-1 bg-yellow-200/50 dark:bg-yellow-900/20 rounded-lg'
        >
          <Save className='w-3 h-3 mr-1' />
          Save
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className='fixed bottom-0 left-0 right-0 h-[40vh] z-[60] animate-slide-up'>
        {JotterContent}
      </div>
    );
  }

  return (
    <Draggable
      handle='.handle'
      defaultPosition={{ x: 20, y: 100 }}
      bounds='parent'
    >
      <div className='absolute z-[60]'>{JotterContent}</div>
    </Draggable>
  );
}
