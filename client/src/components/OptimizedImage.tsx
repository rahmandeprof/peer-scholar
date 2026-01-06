import { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { ImageOff } from 'lucide-react';
import { BorderSpinner } from './Skeleton';

interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  lowResSrc?: string; // Optional low-res placeholder
  alt: string;
}

export const OptimizedImage = ({
  src,
  lowResSrc,
  alt,
  className,
  ...props
}: OptimizedImageProps) => {
  const { isLowBandwidth } = useNetwork();
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadedHighRes, setLoadedHighRes] = useState(false);

  useEffect(() => {
    // If low bandwidth and we have a low res source, use it initially
    if (isLowBandwidth && lowResSrc && !loadedHighRes) {
      setCurrentSrc(lowResSrc);
      setLoading(false);
    } else {
      // Otherwise load the main image
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setCurrentSrc(src);
        setLoading(false);
        setLoadedHighRes(true);
      };
      img.onerror = () => {
        setLoading(false);
        setError(true);
      };
    }
  }, [src, lowResSrc, isLowBandwidth, loadedHighRes]);

  const loadHighRes = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
      setLoadedHighRes(true);
    };
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
      >
        <ImageOff className='w-6 h-6 text-gray-400' />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {loading && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10'>
          <BorderSpinner size='lg' className='text-gray-400' />
        </div>
      )}
      <img
        src={
          currentSrc ||
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        } // Transparent placeholder
        alt={alt}
        loading='lazy'
        className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${className}`}
        {...props}
      />

      {/* Show "Load High Res" button if we are showing low res and haven't loaded high res yet */}
      {isLowBandwidth && lowResSrc && !loadedHighRes && !loading && (
        <button
          onClick={loadHighRes}
          className='absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm transition-colors'
          title='Load High Quality'
        >
          HD
        </button>
      )}
    </div>
  );
};
