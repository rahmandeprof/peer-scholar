import { useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

interface ProcessingMaterial {
    id: string;
    processingStatus?: string;
    status?: string;
}

/**
 * Hook that polls for processing status updates on materials.
 * When a material finishes processing (or fails), it triggers a callback.
 * 
 * @param materials - Array of materials to monitor
 * @param onStatusChange - Callback when any material's status changes
 * @param pollIntervalMs - How often to poll (default: 5000ms)
 */
export function useProcessingPolling(
    materials: ProcessingMaterial[],
    onStatusChange: (updatedMaterial: { id: string; processingStatus: string }) => void,
    pollIntervalMs = 5000
) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastStatusRef = useRef<Map<string, string>>(new Map());

    // Find materials that are still processing
    const getProcessingMaterialIds = useCallback(() => {
        return materials
            .filter(m => isProcessing(m.processingStatus, m.status))
            .map(m => m.id);
    }, [materials]);

    // Check status for a batch of materials
    const checkStatuses = useCallback(async (materialIds: string[]) => {
        if (materialIds.length === 0) return;

        try {
            // Fetch status for all processing materials
            const response = await api.get('/materials/batch-status', {
                params: { ids: materialIds.join(',') }
            });

            const statuses = response.data as Array<{ id: string; processingStatus: string }>;

            for (const { id, processingStatus } of statuses) {
                const lastStatus = lastStatusRef.current.get(id);

                // If status changed from processing to completed/failed
                if (lastStatus !== processingStatus) {
                    lastStatusRef.current.set(id, processingStatus);

                    // Only notify if status is no longer processing
                    if (!isProcessing(processingStatus)) {
                        onStatusChange({ id, processingStatus });
                    }
                }
            }
        } catch (error) {
            console.warn('[useProcessingPolling] Failed to fetch statuses:', error);
        }
    }, [onStatusChange]);

    useEffect(() => {
        const processingIds = getProcessingMaterialIds();

        // Initialize last status map
        for (const material of materials) {
            if (material.processingStatus) {
                lastStatusRef.current.set(material.id, material.processingStatus);
            }
        }

        // Only poll if there are processing materials
        if (processingIds.length === 0) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Start polling
        intervalRef.current = setInterval(() => {
            const currentProcessingIds = getProcessingMaterialIds();
            if (currentProcessingIds.length > 0) {
                checkStatuses(currentProcessingIds);
            } else {
                // No more processing materials, stop polling
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }, pollIntervalMs);

        // Initial check
        checkStatuses(processingIds);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [materials, getProcessingMaterialIds, checkStatuses, pollIntervalMs]);
}

/**
 * Check if a material is currently processing
 */
function isProcessing(processingStatus?: string, status?: string): boolean {
    const ps = processingStatus?.toLowerCase();
    const s = status?.toLowerCase();

    return (
        ps === 'extracting' ||
        ps === 'cleaning' ||
        ps === 'segmenting' ||
        ps === 'pending' ||
        ps === 'ocr_extracting' ||
        s === 'processing' ||
        s === 'pending'
    );
}
