import { useState, useEffect } from 'react';
import {
    Link2,
    Plus,
    Video,
    FileText,
    GraduationCap,
    ExternalLink,
    ThumbsUp,
    Trash2,
    X,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

interface HelpfulLink {
    id: string;
    url: string;
    title: string;
    description?: string;
    linkType: 'video' | 'article' | 'tutorial' | 'other';
    thumbnailUrl?: string;
    helpfulCount: number;
    addedBy: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

interface HelpfulLinksPanelProps {
    materialId: string;
    currentUserId?: string;
}

const linkTypeIcons = {
    video: Video,
    article: FileText,
    tutorial: GraduationCap,
    other: Link2,
};

const linkTypeColors = {
    video: 'text-red-500 bg-red-50 dark:bg-red-900/30',
    article: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    tutorial: 'text-green-500 bg-green-50 dark:bg-green-900/30',
    other: 'text-gray-500 bg-gray-50 dark:bg-gray-700/30',
};

export default function HelpfulLinksPanel({
    materialId,
    currentUserId,
}: HelpfulLinksPanelProps) {
    const [links, setLinks] = useState<HelpfulLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLink, setNewLink] = useState({ url: '', title: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchLinks();
    }, [materialId]);

    const fetchLinks = async () => {
        try {
            const res = await axios.get(`/helpful-links/material/${materialId}`);
            // Ensure we always have an array, even if API returns something unexpected
            setLinks(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch helpful links', err);
            setLinks([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLink.url || !newLink.title) return;

        setSubmitting(true);
        try {
            await axios.post('/helpful-links', {
                ...newLink,
                materialId,
            });
            showToast('Link added successfully!', 'success');
            setNewLink({ url: '', title: '', description: '' });
            setShowAddForm(false);
            fetchLinks();
        } catch (err) {
            showToast('Failed to add link', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkHelpful = async (linkId: string) => {
        try {
            await axios.post(`/helpful-links/${linkId}/helpful`);
            setLinks((prev) =>
                prev.map((link) =>
                    link.id === linkId ? { ...link, helpfulCount: link.helpfulCount + 1 } : link
                )
            );
        } catch (err) {
            showToast('Failed to mark as helpful', 'error');
        }
    };

    const handleDelete = async (linkId: string) => {
        if (!confirm('Are you sure you want to delete this link?')) return;

        try {
            await axios.delete(`/helpful-links/${linkId}`);
            setLinks((prev) => prev.filter((link) => link.id !== linkId));
            showToast('Link deleted', 'success');
        } catch (err) {
            showToast('Failed to delete link', 'error');
        }
    };

    const getYouTubeEmbedUrl = (url: string): string | null => {
        const match = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    };

    if (loading) {
        return (
            <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50'>
                <div className='animate-pulse'>
                    <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4'></div>
                    <div className='space-y-3'>
                        <div className='h-20 bg-gray-200 dark:bg-gray-700 rounded'></div>
                        <div className='h-20 bg-gray-200 dark:bg-gray-700 rounded'></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50'>
            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                    <Link2 className='w-5 h-5 mr-2 text-primary-500' />
                    Helpful Resources
                </h3>
                {currentUserId && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className='flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors'
                    >
                        {showAddForm ? <X className='w-4 h-4 mr-1' /> : <Plus className='w-4 h-4 mr-1' />}
                        {showAddForm ? 'Cancel' : 'Add Link'}
                    </button>
                )}
            </div>

            {/* Add Link Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className='mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
                    <div className='space-y-3'>
                        <input
                            type='url'
                            placeholder='Paste URL (e.g., YouTube, article link)'
                            value={newLink.url}
                            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                            className='w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                            required
                        />
                        <input
                            type='text'
                            placeholder='Title (e.g., "Great explanation of recursion")'
                            value={newLink.title}
                            onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                            className='w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                            required
                            maxLength={200}
                        />
                        <textarea
                            placeholder='Optional description...'
                            value={newLink.description}
                            onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                            className='w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none'
                            rows={2}
                            maxLength={500}
                        />
                        <button
                            type='submit'
                            disabled={submitting}
                            className='w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {submitting ? 'Adding...' : 'Add Resource'}
                        </button>
                    </div>
                </form>
            )}

            {/* Links List */}
            {links.length === 0 ? (
                <p className='text-gray-500 dark:text-gray-400 text-center py-8'>
                    No helpful resources yet. Be the first to share one!
                </p>
            ) : (
                <div className='space-y-4'>
                    {links.map((link) => {
                        const Icon = linkTypeIcons[link.linkType];
                        const colorClass = linkTypeColors[link.linkType];
                        const embedUrl = link.linkType === 'video' ? getYouTubeEmbedUrl(link.url) : null;

                        return (
                            <div
                                key={link.id}
                                className='group p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
                            >
                                {/* YouTube Embed */}
                                {embedUrl && (
                                    <div className='mb-3 aspect-video rounded-lg overflow-hidden'>
                                        <iframe
                                            src={embedUrl}
                                            title={link.title}
                                            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                                            allowFullScreen
                                            className='w-full h-full'
                                        />
                                    </div>
                                )}

                                {/* Non-YouTube with Thumbnail */}
                                {!embedUrl && link.thumbnailUrl && (
                                    <img
                                        src={link.thumbnailUrl}
                                        alt={link.title}
                                        className='mb-3 w-full h-32 object-cover rounded-lg'
                                    />
                                )}

                                <div className='flex items-start justify-between'>
                                    <div className='flex-1'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <span className={`p-1.5 rounded-lg ${colorClass}`}>
                                                <Icon className='w-4 h-4' />
                                            </span>
                                            <a
                                                href={link.url}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1'
                                            >
                                                {link.title}
                                                <ExternalLink className='w-3.5 h-3.5' />
                                            </a>
                                        </div>
                                        {link.description && (
                                            <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                                                {link.description}
                                            </p>
                                        )}
                                        <p className='text-xs text-gray-500 dark:text-gray-500'>
                                            Added by {link.addedBy.firstName} {link.addedBy.lastName}
                                        </p>
                                    </div>

                                    <div className='flex items-center gap-2'>
                                        <button
                                            onClick={() => handleMarkHelpful(link.id)}
                                            className='flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600 transition-colors'
                                        >
                                            <ThumbsUp className='w-3.5 h-3.5' />
                                            {link.helpfulCount}
                                        </button>
                                        {currentUserId === link.addedBy.id && (
                                            <button
                                                onClick={() => handleDelete(link.id)}
                                                className='p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100'
                                            >
                                                <Trash2 className='w-4 h-4' />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
