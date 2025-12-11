import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    Flag,
    Trash2,
    Eye,
    XCircle,
    Loader2,
    AlertTriangle,
    ChevronRight,
    RefreshCw,
    FileText,
    User,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../ConfirmationModal';

interface FlaggedMaterial {
    id: string;
    title: string;
    flagCount: number;
    isHidden: boolean;
    createdAt: string;
    uploader: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface MaterialFlag {
    id: string;
    reason: string;
    description?: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
    };
}

export function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [materials, setMaterials] = useState<FlaggedMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState<FlaggedMaterial | null>(null);
    const [flags, setFlags] = useState<MaterialFlag[]>([]);
    const [loadingFlags, setLoadingFlags] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Check admin access
    useEffect(() => {
        if (user && user.role !== 'admin') {
            toast.error('Access denied. Admin only.');
            navigate('/dashboard');
        }
    }, [user, navigate, toast]);

    const fetchFlaggedMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.get('/materials/admin/flagged');
            setMaterials(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load flagged materials');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlaggedMaterials();
    }, []);

    const fetchFlags = async (materialId: string) => {
        setLoadingFlags(true);
        try {
            const res = await api.get(`/materials/admin/${materialId}/flags`);
            setFlags(res.data);
        } catch (err) {
            toast.error('Failed to load flag details');
        } finally {
            setLoadingFlags(false);
        }
    };

    const handleSelectMaterial = (material: FlaggedMaterial) => {
        setSelectedMaterial(material);
        fetchFlags(material.id);
    };

    const handleDismissFlags = async (materialId: string) => {
        setActionLoading(materialId);
        try {
            await api.post(`/materials/admin/${materialId}/dismiss-flags`);
            toast.success('Flags dismissed, material unhidden');
            setMaterials((prev) => prev.filter((m) => m.id !== materialId));
            if (selectedMaterial?.id === materialId) {
                setSelectedMaterial(null);
                setFlags([]);
            }
        } catch (err) {
            toast.error('Failed to dismiss flags');
        } finally {
            setActionLoading(null);
        }
    };

    const handleForceDelete = async (materialId: string) => {
        setActionLoading(materialId);
        try {
            await api.delete(`/materials/admin/${materialId}/force`);
            toast.success('Material permanently deleted');
            setMaterials((prev) => prev.filter((m) => m.id !== materialId));
            if (selectedMaterial?.id === materialId) {
                setSelectedMaterial(null);
                setFlags([]);
            }
        } catch (err) {
            toast.error('Failed to delete material');
        } finally {
            setActionLoading(null);
            setDeleteConfirm(null);
        }
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            wrong_content: 'Wrong Content',
            low_quality: 'Low Quality',
            duplicate: 'Duplicate',
            inappropriate: 'Inappropriate',
            other: 'Other',
        };
        return labels[reason] || reason;
    };

    if (user?.role !== 'admin') {
        return null;
    }

    return (
        <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
            {/* Header */}
            <div className='bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10'>
                <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
                    <div className='flex items-center'>
                        <div className='w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3'>
                            <Shield className='w-5 h-5 text-red-600 dark:text-red-400' />
                        </div>
                        <div>
                            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                                Admin Dashboard
                            </h1>
                            <p className='text-sm text-gray-500 dark:text-gray-400'>
                                Manage flagged content
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchFlaggedMaterials}
                        className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className='max-w-7xl mx-auto p-4'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {/* Flagged Materials List */}
                    <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
                        <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex items-center'>
                            <Flag className='w-5 h-5 text-red-500 mr-2' />
                            <h2 className='font-bold text-gray-900 dark:text-white'>
                                Flagged Materials ({materials.length})
                            </h2>
                        </div>

                        {loading ? (
                            <div className='p-8 flex justify-center'>
                                <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
                            </div>
                        ) : materials.length === 0 ? (
                            <div className='p-8 text-center'>
                                <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                                    <Shield className='w-8 h-8 text-green-600 dark:text-green-400' />
                                </div>
                                <p className='text-gray-500 dark:text-gray-400'>
                                    No flagged materials. All clear!
                                </p>
                            </div>
                        ) : (
                            <div className='divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto'>
                                {materials.map((material) => (
                                    <div
                                        key={material.id}
                                        onClick={() => handleSelectMaterial(material)}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedMaterial?.id === material.id
                                                ? 'bg-primary-50 dark:bg-primary-900/20'
                                                : ''
                                            }`}
                                    >
                                        <div className='flex items-start justify-between'>
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-center gap-2 mb-1'>
                                                    <FileText className='w-4 h-4 text-gray-400 flex-shrink-0' />
                                                    <h3 className='font-medium text-gray-900 dark:text-white truncate'>
                                                        {material.title}
                                                    </h3>
                                                </div>
                                                <div className='flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400'>
                                                    <span className='flex items-center'>
                                                        <User className='w-3 h-3 mr-1' />
                                                        {material.uploader.firstName} {material.uploader.lastName}
                                                    </span>
                                                    <span className='flex items-center text-red-500'>
                                                        <Flag className='w-3 h-3 mr-1' />
                                                        {material.flagCount} flags
                                                    </span>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                {material.isHidden && (
                                                    <span className='px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full'>
                                                        Hidden
                                                    </span>
                                                )}
                                                <ChevronRight className='w-4 h-4 text-gray-400' />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Flag Details Panel */}
                    <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
                        {!selectedMaterial ? (
                            <div className='p-8 text-center h-full flex flex-col items-center justify-center'>
                                <AlertTriangle className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-4' />
                                <p className='text-gray-500 dark:text-gray-400'>
                                    Select a material to view details
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className='p-4 border-b border-gray-100 dark:border-gray-800'>
                                    <h2 className='font-bold text-gray-900 dark:text-white mb-1'>
                                        {selectedMaterial.title}
                                    </h2>
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                        By {selectedMaterial.uploader.firstName} {selectedMaterial.uploader.lastName}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex gap-2'>
                                    <button
                                        onClick={() => navigate(`/materials/${selectedMaterial.id}`)}
                                        className='flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm flex items-center justify-center'
                                    >
                                        <Eye className='w-4 h-4 mr-2' />
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleDismissFlags(selectedMaterial.id)}
                                        disabled={actionLoading === selectedMaterial.id}
                                        className='flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg font-medium text-sm flex items-center justify-center disabled:opacity-50'
                                    >
                                        {actionLoading === selectedMaterial.id ? (
                                            <Loader2 className='w-4 h-4 animate-spin' />
                                        ) : (
                                            <>
                                                <XCircle className='w-4 h-4 mr-2' />
                                                Dismiss
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(selectedMaterial.id)}
                                        className='flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-medium text-sm flex items-center justify-center'
                                    >
                                        <Trash2 className='w-4 h-4 mr-2' />
                                        Delete
                                    </button>
                                </div>

                                {/* Flags List */}
                                <div className='p-4'>
                                    <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3'>
                                        Reports ({flags.length})
                                    </h3>
                                    {loadingFlags ? (
                                        <div className='flex justify-center py-4'>
                                            <Loader2 className='w-6 h-6 animate-spin text-primary-600' />
                                        </div>
                                    ) : (
                                        <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                                            {flags.map((flag) => (
                                                <div
                                                    key={flag.id}
                                                    className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'
                                                >
                                                    <div className='flex items-center justify-between mb-1'>
                                                        <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                                            {getReasonLabel(flag.reason)}
                                                        </span>
                                                        <span className='text-xs text-gray-500 dark:text-gray-400'>
                                                            {new Date(flag.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {flag.description && (
                                                        <p className='text-sm text-gray-600 dark:text-gray-300 mb-2'>
                                                            {flag.description}
                                                        </p>
                                                    )}
                                                    <p className='text-xs text-gray-400'>
                                                        by {flag.user.firstName} {flag.user.lastName}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleForceDelete(deleteConfirm)}
                title='Delete Material Permanently'
                message='This action cannot be undone. The material and all associated data will be permanently deleted.'
                confirmText='Delete'
                confirmVariant='danger'
            />
        </div>
    );
}

export default AdminDashboard;
