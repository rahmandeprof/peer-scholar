import React, { memo } from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(({ className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
  />
));

/**
 * BorderSpinner - lightweight CSS-only loading indicator
 * Use for buttons and inline loading states instead of heavy SVG spinners
 */
interface BorderSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const BorderSpinner = memo<BorderSpinnerProps>(
  ({ size = 'md', className = '' }) => {
    const sizeClasses = {
      xs: 'w-3 h-3 border',
      sm: 'w-4 h-4 border-2',
      md: 'w-5 h-5 border-2',
      lg: 'w-6 h-6 border-2',
      xl: 'w-8 h-8 border-2',
      '2xl': 'w-12 h-12 border-4',
    };

    return (
      <span
        className={`inline-block ${sizeClasses[size]} rounded-full animate-spin border-current border-t-transparent [will-change:transform] ${className}`}
        role='status'
        aria-live='polite'
        aria-label='Loading'
      >
        <span className='sr-only'>Loading...</span>
      </span>
    );
  },
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
};

export const SkeletonCard: React.FC = () => (
  <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
    <div className='flex items-start space-x-3'>
      <SkeletonAvatar />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-3 w-1/2' />
      </div>
    </div>
    <div className='mt-4'>
      <SkeletonText lines={2} />
    </div>
    <div className='mt-4 flex justify-between'>
      <Skeleton className='h-8 w-20 rounded-lg' />
      <Skeleton className='h-8 w-20 rounded-lg' />
    </div>
  </div>
);

export const MaterialCardSkeleton: React.FC = () => (
  <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
    <div className='p-4 space-y-3'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-6 w-16 rounded-full' />
        <Skeleton className='h-5 w-5 rounded' />
      </div>
      <Skeleton className='h-5 w-3/4' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-2/3' />
      <div className='flex items-center space-x-4 pt-2'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-4 w-16' />
      </div>
    </div>
  </div>
);

export const PartnerCardSkeleton: React.FC = () => (
  <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
    <div className='flex items-center space-x-3'>
      <SkeletonAvatar size='lg' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='h-4 w-24' />
      </div>
      <Skeleton className='h-8 w-8 rounded-full' />
    </div>
    <div className='mt-4 flex items-center space-x-4'>
      <Skeleton className='h-4 w-20' />
      <Skeleton className='h-4 w-24' />
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className='space-y-6 animate-fade-in'>
    {/* Stats Row */}
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'
        >
          <Skeleton className='h-4 w-16 mb-2' />
          <Skeleton className='h-8 w-24' />
        </div>
      ))}
    </div>

    {/* Materials Grid */}
    <div>
      <Skeleton className='h-6 w-40 mb-4' />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <MaterialCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const MaterialViewSkeleton: React.FC = () => (
  <div className='max-w-4xl mx-auto space-y-6 p-4'>
    {/* Header */}
    <div className='flex items-center space-x-4'>
      <Skeleton className='h-10 w-10 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-6 w-2/3' />
        <Skeleton className='h-4 w-1/3' />
      </div>
    </div>

    {/* Actions */}
    <div className='flex space-x-3'>
      <Skeleton className='h-10 w-24 rounded-lg' />
      <Skeleton className='h-10 w-24 rounded-lg' />
      <Skeleton className='h-10 w-10 rounded-lg' />
    </div>

    {/* Content Area */}
    <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 min-h-[400px]'>
      <SkeletonText lines={8} />
    </div>
  </div>
);
