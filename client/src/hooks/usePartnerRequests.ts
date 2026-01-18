import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useSocket } from '../contexts/SocketContext';

interface PartnerRequest {
    id: string;
    sender: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export function usePartnerRequests() {
    const [pendingCount, setPendingCount] = useState(0);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchRequests = useCallback(async () => {
        try {
            const res = await api.get('/users/partner/requests');
            const data = res.data || [];
            setRequests(data);
            setPendingCount(data.length);
        } catch {
            // Silently fail - user may not be logged in
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Listen for real-time updates
    useEffect(() => {
        if (socket) {
            socket.on('receive_invite', () => {
                fetchRequests();
            });

            return () => {
                socket.off('receive_invite');
            };
        }
    }, [socket, fetchRequests]);

    return { pendingCount, requests, loading, refetch: fetchRequests };
}
