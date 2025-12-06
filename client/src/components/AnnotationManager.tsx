import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { X, Check, Tag } from 'lucide-react';

interface Annotation {
  id: string;
  selectedText: string;
  pageNumber?: number;
  year: string;
  session: string;
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
  const [showModal, setShowModal] = useState(false);
  const [year, setYear] = useState('');
  const [session, setSession] = useState('First Semester');

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
    if (!text) return;

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

  const handleSaveAnnotation = async () => {
    if (!selection) return;

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
      setShowModal(false);
      setSelection(null);
      setYear('');
      window.getSelection()?.removeAllRanges();
      fetchAnnotations();
    } catch (err) {
      toast.error('Failed to save annotation');
    }
  };

  // Filter annotations for current page if applicable
  const visibleAnnotations = pageNumber
    ? annotations.filter((a) => a.pageNumber === pageNumber)
    : annotations;

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp} className="relative">
      {/* Render Highlights (Naive text overlay approach for MVP) */}
      {/* Note: Real-time highlighting on PDF canvas is complex. 
          For MVP, we might just list them or try a simple text search overlay if text layer is accessible.
          Since we wrap children, if children is text, we can't easily inject spans without parsing.
          For PDF, react-pdf renders a text layer. We can try to match text there.
          
          Better approach for MVP: Just show the selection tooltip. 
          Visualizing highlights on top of PDF requires coordinate mapping which we don't have easily from just text selection 
          unless we store the Range serialized or QuadPoints.
          
          Let's stick to the "Selection Tool" and "Input Modal" requirements first.
          Visualization might be tricky without precise coordinates.
          We will attempt to show a list of annotations or a simple overlay if possible.
      */}
      
      {children}

      {/* Annotations List Toggle */}
      {visibleAnnotations.length > 0 && (
        <div className="absolute top-4 right-4 z-40">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-yellow-200 dark:border-yellow-900/30 max-w-xs">
            <h4 className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider mb-2 flex items-center">
              <Tag className="w-3 h-3 mr-1" />
              Past Questions ({visibleAnnotations.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {visibleAnnotations.map((ann) => (
                <div key={ann.id} className={`text-xs p-2 rounded border ${ann.type === 'pq' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/50' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
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
        </div>
      )}

      {/* Floating Tooltip */}
      {selection && !showModal && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl flex items-center space-x-2 animate-in fade-in zoom-in duration-200"
          style={{
            top: selection.rect.top - 40,
            left: selection.rect.left + selection.rect.width / 2 - 50,
          }}
        >
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center text-sm font-medium hover:text-primary-400 transition-colors"
          >
            <Tag className="w-4 h-4 mr-1" />
            Tag as PQ
          </button>
          <div className="w-px h-4 bg-gray-700"></div>
          <button
            onClick={() => {
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Modal */}
      {showModal && selection && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tag Past Question</h3>
              <button 
                onClick={() => setShowModal(false)}
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>

              <button
                onClick={handleSaveAnnotation}
                disabled={!year}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
