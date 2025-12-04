import { useState, useRef, useEffect } from 'react';
import { Type, Minus, Plus, X } from 'lucide-react';
import {
  useReaderSettings,
  type FontFamily,
} from '../contexts/ReaderSettingsContext';

export function TextSettings() {
  const { fontFamily, fontSize, updateSettings } = useReaderSettings();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateFontFamily = (family: FontFamily) => {
    updateSettings({ fontFamily: family });
  };

  const updateFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    updateSettings({ fontSize: newSize });
  };

  return (
    <div className='relative' ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors ${
          isOpen
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title='Text Settings'
      >
        <Type className='w-5 h-5' />
      </button>

      {isOpen && (
        <div className='absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
              Text Settings
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Font Family */}
          <div className='mb-4'>
            <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider'>
              Font Family
            </label>
            <div className='flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1'>
              <button
                onClick={() => updateFontFamily('sans')}
                className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                  fontFamily === 'sans'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white font-sans'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-sans'
                }`}
              >
                Sans
              </button>
              <button
                onClick={() => updateFontFamily('serif')}
                className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                  fontFamily === 'serif'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white font-serif'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-serif'
                }`}
              >
                Serif
              </button>
              <button
                onClick={() => updateFontFamily('mono')}
                className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                  fontFamily === 'mono'
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white font-mono'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-mono'
                }`}
              >
                Mono
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider'>
              Font Size
            </label>
            <div className='flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2'>
              <button
                onClick={() => updateFontSize(-1)}
                className='p-1 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors text-gray-600 dark:text-gray-300'
                disabled={fontSize <= 12}
              >
                <Minus className='w-4 h-4' />
              </button>
              <span className='text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-center'>
                {fontSize}px
              </span>
              <button
                onClick={() => updateFontSize(1)}
                className='p-1 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors text-gray-600 dark:text-gray-300'
                disabled={fontSize >= 24}
              >
                <Plus className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
