import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { X, Check, Tag, MessageSquare, PenLine } from 'lucide-react';

interface Annotation {
  id: string;
  selectedText: string;
  pageNumber?: number;
  year?: string;
  session?: string;
  noteContent?: string;
  user: {
    firstName: string;
    lastName: string;
  };
  type: 'note' | 'pq';
}

interface AnnotationManagerProps {
  materialId: string;
  pageNumber?: number; // For PDF context
  children: React.ReactNode;
}

export function AnnotationManager({
  materialId,
  pageNumber,
  children,
}: AnnotationManagerProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    contextBefore: string;
    contextAfter: string;
  } | null>(null);

  // Modal states
  const [showPqModal, setShowPqModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // PQ form state
  const [year, setYear] = useState('');
  const [session, setSession] = useState('First Semester');

  // Note form state
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    fetchAnnotations();
  }, [materialId]);

  const fetchAnnotations = async () => {
    try {
      const res = await api.get(`/materials/${materialId}/annotations`);
      setAnnotations(res.data);
    } catch (err) {
      console.error('Failed to fetch annotations', err);
    }
  };

  const handleMouseUp = () => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = windowSelection.toString().trim();
    if (!text || text.length < 3) return; // Minimum 3 characters

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Context extraction (simple approximation)
    const contextBefore = range.startContainer.textContent?.substring(Math.max(0, range.startOffset - 50), range.startOffset) || '';
    const contextAfter = range.endContainer.textContent?.substring(range.endOffset, Math.min(range.endContainer.textContent.length, range.endOffset + 50)) || '';

    setSelection({
      text,
      rect,
      contextBefore,
      contextAfter,
    });
  };

  const resetSelection = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSavePq = async () => {
    if (!selection || !year) return;

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
      fetchAnnotations();
    } catch (err) {
      toast.error('Failed to save annotation');
    }
  };

  const handleSaveNote = async () => {
    if (!selection || !noteContent.trim()) return;

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
      fetchAnnotations();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  // Filter annotations for current page if applicable
  const visibleAnnotations = pageNumber
    ? annotations.filter((a) => a.pageNumber === pageNumber)
    : annotations;

  const notes = visibleAnnotations.filter(a => a.type === 'note');
  const pqs = visibleAnnotations.filter(a => a.type === 'pq');

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} className="relative">
      {children}

      {/* Annotations Panel */}
      {visibleAnnotations.length > 0 && (
        <div className="absolute top-4 right-4 z-40 space-y-2 max-w-xs">
          {/* Past Questions */}
          {pqs.length > 0 && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-yellow-200 dark:border-yellow-900/30">
              <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider mb-2 flex items-center">
                <Tag className="w-3 h-3 mr-1" />
                Past Questions ({pqs.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {pqs.map((ann) => (
                  <div key={ann.id} className="text-xs p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/50">
                    <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2" title={ann.selectedText}>
                      "{ann.selectedText}"
                    </p>
                    <div className="mt-1 flex justify-between items-center text-gray-500 dark:text-gray-400 text-[10px]">
                      <span>{ann.year} • {ann.session}</span>
                      <span>{ann.user.firstName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-blue-200 dark:border-blue-900/30">
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-500 uppercase tracking-wider mb-2 flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                Student Notes ({notes.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {notes.map((ann) => (
                  <div key={ann.id} className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                    <p className="font-medium text-gray-700 dark:text-gray-300 line-clamp-1 italic" title={ann.selectedText}>
                      "{ann.selectedText}"
                    </p>
                    {ann.noteContent && (
                      <p className="mt-1 text-gray-600 dark:text-gray-400 line-clamp-3">
                        {ann.noteContent}
                      </p>
                    )}
                    <div className="mt-1 text-right text-gray-400 dark:text-gray-500 text-[10px]">
                      — {ann.user.firstName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Tooltip with dual options */}
      {selection && !showPqModal && !showNoteModal && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-2 py-2 rounded-lg shadow-xl flex items-center space-x-1 animate-in fade-in zoom-in duration-200"
          style={{
            top: Math.max(10, selection.rect.top - 45),
            left: Math.max(10, selection.rect.left + selection.rect.width / 2 - 80),
          }}
        >
          <button
            onClick={() => setShowNoteModal(true)}
            className="flex items-center text-xs font-medium px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            title="Add a note explaining this text"
          >
            <PenLine className="w-3.5 h-3.5 mr-1" />
            Add Note
          </button>
          <div className="w-px h-4 bg-gray-700"></div>
          <button
            onClick={() => setShowPqModal(true)}
            className="flex items-center text-xs font-medium px-2 py-1 rounded hover:bg-gray-800 transition-colors"
            title="Tag as past question"
          >
            <Tag className="w-3.5 h-3.5 mr-1" />
            Tag PQ
          </button>
          <div className="w-px h-4 bg-gray-700"></div>
          <button
            onClick={resetSelection}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && selection && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <PenLine className="w-5 h-5 mr-2 text-blue-600" />
                Add Note
              </h3>
              <button
                onClick={() => { setShowNoteModal(false); setNoteContent(''); }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3">
                "{selection.text}"
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Explanation
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Explain this concept, add context, or share your understanding..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Other students will see your note when viewing this material.</p>
              </div>

              <button
                onClick={handleSaveNote}
                disabled={!noteContent.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Note
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PQ Modal */}
      {showPqModal && selection && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Tag className="w-5 h-5 mr-2 text-yellow-600" />
                Tag Past Question
              </h3>
              <button
                onClick={() => { setShowPqModal(false); setYear(''); }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-3">
                "{selection.text}"
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2023"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 outline-none"
                >
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>

              <button
                onClick={handleSavePq}
                disabled={!year}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Tag
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

