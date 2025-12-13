/**
 * BaseModal - Standardized modal wrapper for consistent styling across the app
 * 
 * Features:
 * - Centered on all screen sizes
 * - Max height of 85vh to ensure close button is visible
 * - Proper padding from edges
 * - Backdrop blur and click-to-close
 * - Mobile-first responsive design
 */
import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useModalBack } from '../../hooks/useModalBack';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    modalId?: string;
    className?: string;
    headerClassName?: string;
    headerIcon?: ReactNode;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-2xl',
};

export function BaseModal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    modalId = 'modal',
    className = '',
    headerClassName = '',
    headerIcon,
}: BaseModalProps) {
    useModalBack(isOpen, onClose, modalId);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            {/* Backdrop */}
            <div
                className='absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity'
                onClick={onClose}
                aria-hidden='true'
            />

            {/* Modal Container - Centered with max height */}
            <div
                className={`
          relative w-full ${sizeClasses[size]} 
          bg-white dark:bg-gray-900 
          rounded-2xl shadow-2xl 
          max-h-[85vh] 
          flex flex-col
          animate-modal-pop
          ${className}
        `}
                role='dialog'
                aria-modal='true'
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className={`flex justify-between items-center p-4 md:p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 ${headerClassName}`}>
                        {title ? (
                            <div className='flex items-center gap-2'>
                                {headerIcon && (
                                    <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400'>
                                        {headerIcon}
                                    </div>
                                )}
                                <h2 className='font-bold text-base md:text-lg text-gray-900 dark:text-gray-100'>
                                    {title}
                                </h2>
                            </div>
                        ) : (
                            <div />
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0'
                                aria-label='Close modal'
                            >
                                <X className='w-5 h-5 text-gray-500' />
                            </button>
                        )}
                    </div>
                )}

                {/* Content - Scrollable */}
                <div className='flex-1 overflow-y-auto'>
                    {children}
                </div>
            </div>

            {/* Animation styles */}
            <style>{`
        @keyframes modal-pop {
          0% { 
            opacity: 0; 
            transform: scale(0.95) translateY(10px); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        .animate-modal-pop {
          animation: modal-pop 0.2s ease-out forwards;
        }
      `}</style>
        </div>
    );
}

export default BaseModal;
