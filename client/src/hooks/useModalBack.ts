import { useEffect } from 'react';

/**
 * Hook to handle closing modals when the browser back button is pressed.
 * Pushes a state to history when opened, and calls onClose when popped.
 * 
 * @param isOpen Whether the modal is currently open
 * @param onClose Function to call to close the modal
 * @param modalId Optional unique ID for the modal state (default: 'modal')
 */
export function useModalBack(isOpen: boolean, onClose: () => void, modalId: string = 'modal') {
    useEffect(() => {
        if (isOpen) {
            // Push a new state to history
            window.history.pushState({ [modalId]: true }, '');

            const handlePopState = () => {
                // If the event was triggered by back button (state is null or different), close modal
                // We don't strictly check state content because any pop means we should probably close
                // if we are the top modal.
                onClose();
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                // If we are unmounting/closing but the state is still in history (not popped),
                // we should ideally go back to keep history clean.
                // However, checking if we need to go back is tricky without causing loops.
                // For now, we rely on the user's manual close action not messing up history too much,
                // or we can try to detect if we are still in the "modal" state.

                // Simple check: if we are closing programmatically (not via popstate), 
                // we might want to pop the state we pushed.
                // But detecting "programmatic close" vs "popstate close" inside cleanup is hard.
                // The safest simple approach is just listening to popstate.
            };
        }
    }, [isOpen, onClose, modalId]);
}
