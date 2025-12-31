/**
 * Error utility functions for consistent error message extraction
 */

/**
 * Extract a user-friendly error message from API errors
 * Handles various error response formats from the backend
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
    // Handle axios error responses
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as any).response;
        if (response?.data?.message) {
            const msg = response.data.message;
            // Handle array of validation messages
            if (Array.isArray(msg)) {
                return msg.join('. ');
            }
            return String(msg);
        }
        // Handle status text fallback
        if (response?.statusText) {
            return response.statusText;
        }
    }

    // Handle standard Error objects
    if (err instanceof Error && err.message) {
        return err.message;
    }

    // Handle string errors
    if (typeof err === 'string') {
        return err;
    }

    return fallback;
}

/**
 * Common error messages for reuse across components
 */
export const ERROR_MESSAGES = {
    NETWORK: 'Network error. Please check your connection and try again.',
    GENERIC: 'Something went wrong. Please try again.',
    UNAUTHORIZED: 'Please log in to continue.',
    FORBIDDEN: 'You don\'t have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    TIMEOUT: 'Request timed out. Please try again.',
} as const;

/**
 * Get error message based on HTTP status code
 */
export function getErrorMessageByStatus(status: number, fallback?: string): string {
    switch (status) {
        case 401:
            return ERROR_MESSAGES.UNAUTHORIZED;
        case 403:
            return ERROR_MESSAGES.FORBIDDEN;
        case 404:
            return ERROR_MESSAGES.NOT_FOUND;
        case 408:
        case 504:
            return ERROR_MESSAGES.TIMEOUT;
        default:
            return fallback || ERROR_MESSAGES.GENERIC;
    }
}
