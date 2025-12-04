import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';

export function TextFileViewer({
  url,
  content: initialContent,
  materialId,
}: {
  url?: string;
  content?: string;
  materialId?: string;
}) {
  const [content, setContent] = useState<string | null>(initialContent || null);
  const [loading, setLoading] = useState(!initialContent);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

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

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
      </div>
    );
  }

  if (!content && !loading) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-gray-500 p-8'>
        <div className='bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4'>
          <Loader2 className='w-8 h-8 text-gray-400' />
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
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
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
      <pre
        className='whitespace-pre-wrap text-gray-800 dark:text-gray-200 transition-all duration-300'
        style={{
          fontFamily: 'var(--reader-font-family)',
          fontSize: 'var(--reader-font-size)',
          lineHeight: 'var(--reader-line-height)',
        }}
      >
        {content}
      </pre>
    </div>
  );
}
