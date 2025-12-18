import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

/**
 * AdminRoute - Protects routes that require admin role
 * 
 * Checks if the current user has role === 'admin'
 * If not, redirects to dashboard with appropriate message
 */
export function AdminRoute({ children }: AdminRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth();

    // Show nothing while loading
    if (isLoading) {
        return null;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // Check admin role
    if (user?.role !== 'admin') {
        // Redirect non-admins to dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

export default AdminRoute;
