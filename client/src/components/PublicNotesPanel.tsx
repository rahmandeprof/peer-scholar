import { useState, useEffect } from 'react';
import {
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    Send,
    X,
    Trash2,
    User,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/errorUtils';

interface PublicNote {
    id: string;
    selectedText: string;
    note: string;
    pageNumber?: number;
    upvotes: number;
    downvotes: number;
    userVote: number;
    createdAt: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

interface PublicNotesPanelProps {
    materialId: string;
    isOpen: boolean;
    onClose: () => void;
    currentPage?: number;
    selectedText?: string;
    onNoteAdded?: () => void;
}

export function PublicNotesPanel({
    materialId,
    isOpen,
    onClose,
    currentPage,
    selectedText: initialSelectedText,
    onNoteAdded,
}: PublicNotesPanelProps) {
    const [notes, setNotes] = useState<PublicNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedText, setSelectedText] = useState(initialSelectedText || '');
    const [noteText, setNoteText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(!!initialSelectedText);
    const { user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen, materialId]);

    useEffect(() => {
        if (initialSelectedText) {
            setSelectedText(initialSelectedText);
            setShowAddForm(true);
        }
    }, [initialSelectedText]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/materials/${materialId}/public-notes`);
            setNotes(res.data);
        } catch (error) {
            showToast(getApiErrorMessage(error, 'Failed to load notes'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!noteText.trim() || !selectedText.trim()) {
            showToast('Please enter both selected text and your note', 'error');
            return;
        }

        try {
            setSubmitting(true);
            await api.post(`/materials/${materialId}/public-notes`, {
                selectedText: selectedText.trim(),
                note: noteText.trim(),
                pageNumber: currentPage,
            });
            showToast('Note added successfully!', 'success');
            setNoteText('');
            setSelectedText('');
            setShowAddForm(false);
            fetchNotes();
            onNoteAdded?.();
        } catch (error) {
            showToast(getApiErrorMessage(error, 'Failed to add note'), 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (noteId: string, value: number) => {
        try {
            const res = await api.post(
                `/materials/${materialId}/public-notes/${noteId}/vote`,
                { value }
            );
            setNotes((prev) =>
                prev.map((n) =>
                    n.id === noteId
                        ? { ...n, upvotes: res.data.upvotes, downvotes: res.data.downvotes, userVote: res.data.userVote }
                        : n
                )
            );
        } catch (error) {
            showToast(getApiErrorMessage(error, 'Failed to vote'), 'error');
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await api.post(`/materials/${materialId}/public-notes/${noteId}/delete`);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
            showToast('Note deleted', 'success');
        } catch (error) {
            showToast(getApiErrorMessage(error, 'Failed to delete note'), 'error');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[200] flex items-end md:items-center justify-center'>
            {/* Backdrop */}
            <div
                className='absolute inset-0 bg-black/40 backdrop-blur-sm'
                onClick={onClose}
            />

            {/* Panel */}
            <div className='relative w-full md:max-w-lg md:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up'>
                {/* Header */}
                <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800'>
                    <div className='flex items-center gap-2'>
                        <MessageSquare className='w-5 h-5 text-primary-500' />
                        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                            Public Notes
                        </h2>
                        <span className='text-sm text-gray-500'>({notes.length})</span>
                    </div>
                    <button
                        onClick={onClose}
                        className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    >
                        <X className='w-5 h-5' />
                    </button>
                </div>

                {/* Add note toggle */}
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className='mx-4 mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors'
                    >
                        <MessageSquare className='w-4 h-4' />
                        <span className='font-medium'>Add a Note</span>
                    </button>
                )}

                {/* Add note form */}
                {showAddForm && (
                    <div className='p-4 border-b border-gray-200 dark:border-gray-800 space-y-3'>
                        <div className='flex items-center justify-between'>
                            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                New Note
                            </span>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setSelectedText('');
                                    setNoteText('');
                                }}
                                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            >
                                <X className='w-4 h-4' />
                            </button>
                        </div>

                        <div>
                            <label className='text-xs text-gray-500 dark:text-gray-400 mb-1 block'>
                                Selected Text (what you're annotating)
                            </label>
                            <textarea
                                value={selectedText}
                                onChange={(e) => setSelectedText(e.target.value)}
                                placeholder='Paste or type the text you want to annotate...'
                                className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className='text-xs text-gray-500 dark:text-gray-400 mb-1 block'>
                                Your Note
                            </label>
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder='Share your insight, explanation, or tip...'
                                className='w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                                rows={3}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !noteText.trim() || !selectedText.trim()}
                            className='w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                            {submitting ? (
                                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                            ) : (
                                <>
                                    <Send className='w-4 h-4' />
                                    <span>Post Note</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Notes list */}
                <div className='flex-1 overflow-y-auto p-4 space-y-4'>
                    {loading ? (
                        <div className='flex items-center justify-center py-12'>
                            <div className='w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin' />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className='text-center py-12'>
                            <MessageSquare className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
                            <p className='text-gray-500 dark:text-gray-400'>
                                No notes yet. Be the first to add one!
                            </p>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div
                                key={note.id}
                                className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-3'
                            >
                                {/* Quoted text */}
                                <div className='text-sm italic text-gray-600 dark:text-gray-400 border-l-2 border-primary-400 pl-3'>
                                    "{note.selectedText}"
                                </div>

                                {/* Note content */}
                                <p className='text-gray-900 dark:text-gray-100'>{note.note}</p>

                                {/* Meta row */}
                                <div className='flex items-center justify-between text-sm'>
                                    <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400'>
                                        <User className='w-4 h-4' />
                                        <span>{note.user.firstName} {note.user.lastName}</span>
                                        <span>•</span>
                                        <span>{formatDate(note.createdAt)}</span>
                                        {note.pageNumber && (
                                            <>
                                                <span>•</span>
                                                <span>Page {note.pageNumber}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Actions row */}
                                <div className='flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700'>
                                    <div className='flex items-center gap-4'>
                                        {/* Upvote */}
                                        <button
                                            onClick={() => handleVote(note.id, note.userVote === 1 ? 0 : 1)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${note.userVote === 1
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                                                }`}
                                        >
                                            <ThumbsUp className='w-4 h-4' />
                                            <span className='text-sm font-medium'>{note.upvotes}</span>
                                        </button>

                                        {/* Downvote */}
                                        <button
                                            onClick={() => handleVote(note.id, note.userVote === -1 ? 0 : -1)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${note.userVote === -1
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                                                }`}
                                        >
                                            <ThumbsDown className='w-4 h-4' />
                                            <span className='text-sm font-medium'>{note.downvotes}</span>
                                        </button>
                                    </div>

                                    {/* Delete button (only for author) */}
                                    {user?.id === note.user.id && (
                                        <button
                                            onClick={() => handleDelete(note.id)}
                                            className='p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                                        >
                                            <Trash2 className='w-4 h-4' />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
