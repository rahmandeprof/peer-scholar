import { memo } from 'react';

/**
 * LogoPulse — branded loading indicator using the PeerToLearn logo
 * Replaces generic spinners for full-page/section loading states.
 * Uses a smooth "breathe" animation (scale + opacity) for a premium feel.
 */
interface LogoPulseProps {
  /** Size of the logo in pixels */
  size?: number;
  /** Optional label text shown below the logo */
  label?: string;
  /** Additional className for the wrapper */
  className?: string;
}

export const LogoPulse = memo<LogoPulseProps>(
  ({ size = 48, label, className = '' }) => {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${className}`}
        role='status'
        aria-live='polite'
        aria-label='Loading'
      >
        <img
          src='/logo-blue.png'
          alt=''
          width={size}
          height={size}
          className='animate-logo-pulse select-none pointer-events-none'
          draggable={false}
        />
        {label && (
          <p className='text-sm text-gray-400 dark:text-gray-500 animate-pulse'>
            {label}
          </p>
        )}
        <span className='sr-only'>Loading...</span>
      </div>
    );
  },
);

LogoPulse.displayName = 'LogoPulse';

export default LogoPulse;
