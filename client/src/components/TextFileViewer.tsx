import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { AnnotationManager } from './AnnotationManager';
import { BorderSpinner, SkeletonText } from './Skeleton';

interface TextFileViewerProps {
  url?: string;
  content?: string;
  materialId?: string;
  highlightRange?: { start: number; end: number } | null;
}

export function TextFileViewer({
  url,
  content: initialContent,
  materialId,
  highlightRange,
}: TextFileViewerProps) {
  const [content, setContent] = useState<string | null>(initialContent || null);
  const [loading, setLoading] = useState(!initialContent);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const lastScrolledRangeRef = useRef<string>(''); // Track last scrolled position to throttle

  useEffect(() => {
    const fetchContent = async () => {
      if (!url) return;
      try {
        setLoading(true);
        const res = await axios.get(url);
        if (typeof res.data === 'object') {
          setContent(JSON.stringify(res.data, null, 2));
        } else {
          setContent(res.data);
        }
      } catch (err) {
        console.error('Failed to load text content', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (url && !initialContent) {
      fetchContent();
    }
  }, [url, initialContent]);

  // Auto-scroll to highlighted text - throttled to only scroll when range key changes
  useEffect(() => {
    if (highlightRange && highlightRef.current) {
      const rangeKey = `${highlightRange.start}-${highlightRange.end}`;
      // Only scroll if this is a different range than before
      if (rangeKey !== lastScrolledRangeRef.current) {
        highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastScrolledRangeRef.current = rangeKey;
      }
    }
  }, [highlightRange]);

  const handleGenerateText = async () => {
    if (!materialId) return;

    setGenerating(true);
    try {
      const res = await api.post(`/materials/${materialId}/extract-text`);
      setContent(res.data.content);
    } catch (err) {
      console.error('Failed to generate text', err);
      // toast.error('Failed to generate text version');
    } finally {
      setGenerating(false);
    }
  };

  // Memoized rendering of content with highlight - prevents recalculation on unrelated re-renders
  const renderedContent = useMemo(() => {
    if (!content) return null;

    if (!highlightRange) {
      return content;
    }

    const { start, end } = highlightRange;

    // Ensure bounds are valid
    const safeStart = Math.max(0, Math.min(start, content.length));
    const safeEnd = Math.max(safeStart, Math.min(end, content.length));

    const before = content.substring(0, safeStart);
    const highlighted = content.substring(safeStart, safeEnd);
    const after = content.substring(safeEnd);

    return (
      <>
        {before}
        <span
          ref={highlightRef}
          className="bg-yellow-200 dark:bg-yellow-700/80 text-gray-900 dark:text-white px-0.5 rounded transition-colors duration-150"
        >
          {highlighted}
        </span>
        {after}
      </>
    );
  }, [content, highlightRange]);

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-8 h-full'>
        <SkeletonText lines={10} className='w-full max-w-2xl' />
      </div>
    );
  }

  if (!content && !loading) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-gray-500 p-8'>
        <div className='bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4'>
          <AlertCircle className='w-8 h-8 text-gray-400' />
        </div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2'>
          No Text Available
        </h3>
        <p className='text-center max-w-md mb-6'>
          This document hasn't been converted to text yet. Generate a text
          version to save data and use AI features.
        </p>
        <button
          onClick={handleGenerateText}
          disabled={generating || !materialId}
          className='px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {generating ? (
            <>
              <BorderSpinner size='sm' className='mr-2' />
              Generating...
            </>
          ) : (
            'Generate Text Version (Uses minimal data)'
          )}
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-full text-red-500'>
        Failed to load file content.
      </div>
    );
  }

  return (
    <div className='h-full overflow-auto p-8 bg-white dark:bg-gray-900'>
      {materialId ? (
        <AnnotationManager materialId={materialId}>
          <pre
            className='whitespace-pre-wrap text-gray-800 dark:text-gray-200 transition-all duration-300'
            style={{
              fontFamily: 'var(--reader-font-family)',
              fontSize: 'var(--reader-font-size)',
              lineHeight: 'var(--reader-line-height)',
            }}
          >
            {renderedContent}
          </pre>
        </AnnotationManager>
      ) : (
        <pre
          className='whitespace-pre-wrap text-gray-800 dark:text-gray-200 transition-all duration-300'
          style={{
            fontFamily: 'var(--reader-font-family)',
            fontSize: 'var(--reader-font-size)',
            lineHeight: 'var(--reader-line-height)',
          }}
        >
          {renderedContent}
        </pre>
      )}
    </div>
  );
}

