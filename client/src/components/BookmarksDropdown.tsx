import { useState, useEffect, useRef } from 'react';
import { Bookmark, BookmarkPlus, Trash2, ChevronDown } from 'lucide-react';
import api from '../lib/api';

interface Bookmark {
    id: string;
    pageNumber: number;
    note: string | null;
    createdAt: string;
}

interface BookmarksDropdownProps {
    materialId: string;
    currentPage: number;
    onJumpToPage: (page: number) => void;
}

export function BookmarksDropdown({
    materialId,
    currentPage,
    onJumpToPage,
}: BookmarksDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch bookmarks when dropdown opens
    useEffect(() => {
        if (isOpen && materialId) {
            fetchBookmarks();
        }
    }, [isOpen, materialId]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcut: Ctrl+B to toggle bookmark on current page
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                toggleBookmarkCurrentPage();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage, bookmarks]);

    const fetchBookmarks = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/materials/${materialId}/bookmarks`);
            setBookmarks(res.data);
        } catch (error) {
            console.error('Failed to fetch bookmarks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBookmarkCurrentPage = async () => {
        const existing = bookmarks.find(b => b.pageNumber === currentPage);
        if (existing) {
            await deleteBookmark(existing.id);
        } else {
            await addBookmark(currentPage);
        }
    };

    const addBookmark = async (page: number) => {
        // Optimistic add with temp ID
        const tempBookmark: Bookmark = {
            id: 'temp-' + Date.now(),
            pageNumber: page,
            note: null,
            createdAt: new Date().toISOString(),
        };
        setBookmarks(prev => [...prev, tempBookmark].sort((a, b) => a.pageNumber - b.pageNumber));

        try {
            const res = await api.post(`/materials/${materialId}/bookmarks`, {
                pageNumber: page,
            });
            // Replace temp with real bookmark
            setBookmarks(prev => prev.map(b => b.id === tempBookmark.id ? res.data : b));
        } catch (error) {
            // Rollback on error
            setBookmarks(prev => prev.filter(b => b.id !== tempBookmark.id));
            console.error('Failed to add bookmark:', error);
        }
    };

    const deleteBookmark = async (bookmarkId: string) => {
        // Optimistic delete
        const previousBookmarks = bookmarks;
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

        try {
            await api.delete(`/materials/${materialId}/bookmarks/${bookmarkId}`);
        } catch (error) {
            // Rollback on error
            setBookmarks(previousBookmarks);
            console.error('Failed to delete bookmark:', error);
        }
    };

    const isCurrentPageBookmarked = bookmarks.some(b => b.pageNumber === currentPage);

    return (
        <div className='relative' ref={dropdownRef}>
            {/* Bookmark Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1.5 rounded flex items-center gap-1 transition-colors ${isCurrentPageBookmarked
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                title={`Bookmarks (Ctrl+B to ${isCurrentPageBookmarked ? 'remove' : 'add'})`}
            >
                <Bookmark className={`w-5 h-5 ${isCurrentPageBookmarked ? 'fill-current' : ''}`} />
                <ChevronDown className='w-3 h-3' />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className='absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
                    {/* Header */}
                    <div className='flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
                        <span className='text-sm font-medium'>Bookmarks</span>
                        <button
                            onClick={() => {
                                toggleBookmarkCurrentPage();
                            }}
                            className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600'
                            title={isCurrentPageBookmarked ? 'Remove from page' : 'Bookmark this page'}
                        >
                            <BookmarkPlus className='w-4 h-4' />
                        </button>
                    </div>

                    {/* Bookmarks List */}
                    <div className='max-h-48 overflow-y-auto'>
                        {loading ? (
                            <div className='px-3 py-4 text-center text-gray-500 text-sm'>Loading...</div>
                        ) : bookmarks.length === 0 ? (
                            <div className='px-3 py-4 text-center text-gray-500 text-sm'>
                                No bookmarks yet
                                <br />
                                <span className='text-xs'>Press Ctrl+B to bookmark this page</span>
                            </div>
                        ) : (
                            <ul className='py-1'>
                                {bookmarks.map(bookmark => (
                                    <li
                                        key={bookmark.id}
                                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${bookmark.pageNumber === currentPage ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                            }`}
                                    >
                                        <div
                                            className='flex-1'
                                            onClick={() => {
                                                onJumpToPage(bookmark.pageNumber);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <span className='text-sm font-medium'>Page {bookmark.pageNumber}</span>
                                            {bookmark.note && (
                                                <p className='text-xs text-gray-500 truncate'>{bookmark.note}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteBookmark(bookmark.id);
                                            }}
                                            className='p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500'
                                        >
                                            <Trash2 className='w-3.5 h-3.5' />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
