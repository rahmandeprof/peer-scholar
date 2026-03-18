import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { X, Check, Tag, PenLine } from 'lucide-react';
import { SelectionToolbar } from './SelectionToolbar';

interface AnnotationManagerProps {
  materialId: string;
  pageNumber?: number; // For PDF context
  children: React.ReactNode;
}

/**
 * AnnotationManager — wraps document content and provides:
 *  1. Selection toolbar integration (Add Note / Tag PQ)
 *  2. Note and PQ save modals
 *
 * Highlights are NOT rendered persistently.
 * Annotations are viewed/navigated via the PastQuestionsPanel (opened from three-dot menu).
 */
export function AnnotationManager({
  materialId,
  pageNumber,
  children,
}: AnnotationManagerProps) {
  const toast = useToast();

  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    contextBefore: string;
    contextAfter: string;
  } | null>(null);

  // Modal states
  const [showPqModal, setShowPqModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // PQ form state
  const [year, setYear] = useState('');
  const [session, setSession] = useState('First Semester');

  // Note form state
  const [noteContent, setNoteContent] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);

  const resetSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAddNote = useCallback(
    (sel: {
      text: string;
      rect: DOMRect;
      contextBefore: string;
      contextAfter: string;
    }) => {
      setSelection(sel);
      setShowNoteModal(true);
    },
    [],
  );

  const handleTagPq = useCallback(
    (sel: {
      text: string;
      rect: DOMRect;
      contextBefore: string;
      contextAfter: string;
    }) => {
      setSelection(sel);
      setShowPqModal(true);
    },
    [],
  );

  const handleSavePq = async () => {
    if (!selection || !year || isSaving) return;
    setIsSaving(true);

    try {
      await api.post(`/materials/${materialId}/annotations`, {
        selectedText: selection.text,
        pageNumber,
        year,
        session,
        contextBefore: selection.contextBefore,
        contextAfter: selection.contextAfter,
        type: 'pq',
      });

      toast.success('Past Question tagged!');
      setShowPqModal(false);
      setYear('');
      resetSelection();
    } catch {
      toast.error('Failed to save annotation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selection || !noteContent.trim() || isSaving) return;
    setIsSaving(true);

    try {
      await api.post(`/materials/${materialId}/annotations`, {
        selectedText: selection.text,
        pageNumber,
        noteContent: noteContent.trim(),
        contextBefore: selection.contextBefore,
        contextAfter: selection.contextAfter,
        type: 'note',
      });

      toast.success('Note added!');
      setShowNoteModal(false);
      setNoteContent('');
      resetSelection();
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='relative' ref={contentRef} data-annotation-container>
      {children}

      {/* Unified Selection Toolbar (AI actions + annotations) */}
      {!showPqModal && !showNoteModal && (
        <SelectionToolbar onAddNote={handleAddNote} onTagPq={handleTagPq} />
      )}

      {/* Note Modal */}
      {showNoteModal &&
        selection &&
        createPortal(
          <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <PenLine className='w-5 h-5 mr-2 text-blue-600' />
                  Add Note
                </h3>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteContent('');
                  }}
                  className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700'>
                <p className='text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3'>
                  &ldquo;{selection.text}&rdquo;
                </p>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Your Explanation
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder='Explain this concept, add context, or share your understanding...'
                    rows={4}
                    className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none'
                    autoFocus
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Other students will see your note when viewing this
                    material.
                  </p>
                </div>

                <button
                  onClick={handleSaveNote}
                  disabled={!noteContent.trim() || isSaving}
                  className='w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center'
                >
                  <Check className='w-4 h-4 mr-2' />
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* PQ Modal */}
      {showPqModal &&
        selection &&
        createPortal(
          <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <Tag className='w-5 h-5 mr-2 text-yellow-600' />
                  Tag Past Question
                </h3>
                <button
                  onClick={() => {
                    setShowPqModal(false);
                    setYear('');
                  }}
                  className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>

              <div className='mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700'>
                <p className='text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3'>
                  &ldquo;{selection.text}&rdquo;
                </p>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Year
                  </label>
                  <input
                    type='text'
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder='e.g. 2023'
                    className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 outline-none'
                    autoFocus
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Session
                  </label>
                  <select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 outline-none'
                  >
                    <option value='First Semester'>First Semester</option>
                    <option value='Second Semester'>Second Semester</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePq}
                  disabled={!year || isSaving}
                  className='w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center'
                >
                  <Check className='w-4 h-4 mr-2' />
                  {isSaving ? 'Saving...' : 'Save Tag'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
