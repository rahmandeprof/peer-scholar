/**
 * Skeleton placeholder for MaterialCard during loading state.
 * Matches the structure and sizing of the actual MaterialCard component.
 */
export function MaterialCardSkeleton() {
    return (
        <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl shadow-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col h-full animate-pulse'>
            <div className='p-6 flex-grow'>
                <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1 min-w-0 mr-4'>
                        {/* Title skeleton */}
                        <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2' />
                        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2' />
                    </div>
                    {/* Menu button skeleton */}
                    <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg' />
                </div>

                {/* Badge skeleton */}
                <div className='flex flex-wrap gap-2 mb-3'>
                    <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16' />
                    <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-12' />
                </div>

                {/* Uploader skeleton */}
                <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full' />
                    <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-24' />
                </div>
            </div>

            {/* Footer skeleton */}
            <div className='bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-100 dark:border-gray-800'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-20' />
            </div>
        </div>
    );
}
