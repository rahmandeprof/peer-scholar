/**
 * ProcessingStatusBadge - Shows processing status for materials with retry capability
 * Consumes the /processing/:materialId/status and /processing/:materialId/retry APIs
 */
import { useState } from 'react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, Clock, FileText, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../lib/errorUtils';

type ProcessingStatus =
    | 'pending'
    | 'extracting'
    | 'ocr_extracting'
    | 'cleaning'
    | 'segmenting'
    | 'summarizing'
    | 'completed'
    | 'failed'
    | 'skipped';

interface ProcessingStatusBadgeProps {
    materialId: string;
    status: ProcessingStatus;
    onStatusChange?: (newStatus: ProcessingStatus) => void;
    compact?: boolean;
}

const statusConfig: Record<ProcessingStatus, {
    label: string;
    icon: typeof Loader2;
    className: string;
    isActive: boolean;
}> = {
    pending: {
        label: 'Pending',
        icon: Clock,
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        isActive: true,
    },
    extracting: {
        label: 'Extracting text...',
        icon: Loader2,
        className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        isActive: true,
    },
    ocr_extracting: {
        label: 'OCR processing...',
        icon: Loader2,
        className: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        isActive: true,
    },
    cleaning: {
        label: 'Cleaning text...',
        icon: Loader2,
        className: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
        isActive: true,
    },
    segmenting: {
        label: 'Segmenting...',
        icon: Loader2,
        className: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
        isActive: true,
    },
    summarizing: {
        label: 'Summarizing...',
        icon: Sparkles,
        className: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        isActive: true,
    },
    completed: {
        label: 'Ready',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        isActive: false,
    },
    failed: {
        label: 'Failed',
        icon: AlertCircle,
        className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        isActive: false,
    },
    skipped: {
        label: 'Skipped',
        icon: FileText,
        className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
        isActive: false,
    },
};

export function ProcessingStatusBadge({
    materialId,
    status,
    onStatusChange,
    compact = false,
}: ProcessingStatusBadgeProps) {
    const [retrying, setRetrying] = useState(false);
    const toast = useToast();

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    const isAnimated = config.isActive;

    const handleRetry = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (retrying) return;

        setRetrying(true);
        try {
            await api.post(`/processing/${materialId}/retry`);
            toast.success('Reprocessing started');
            onStatusChange?.('pending');
        } catch (err) {
            const message = getApiErrorMessage(err, 'Failed to retry processing');
            toast.showErrorModal({
                title: 'Processing Failed',
                message,
                type: 'error',
                onRetry: () => handleRetry(e),
                retryLabel: 'Try Again',
            });
        } finally {
            setRetrying(false);
        }
    };

    if (status === 'completed' && !compact) {
        return null; // Don't show badge for completed items in regular mode
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${config.className}`}>
            <Icon className={`w-3.5 h-3.5 ${isAnimated ? 'animate-spin' : ''}`} />
            {!compact && <span>{config.label}</span>}

            {status === 'failed' && (
                <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className='ml-1 p-0.5 hover:bg-white/30 rounded transition-colors'
                    title='Retry processing'
                >
                    <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                </button>
            )}
        </div>
    );
}

export default ProcessingStatusBadge;
