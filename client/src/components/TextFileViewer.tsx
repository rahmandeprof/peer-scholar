import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

export function TextFileViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
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

    if (url) {
      fetchContent();
    }
  }, [url]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Loader2 className='w-8 h-8 animate-spin text-primary-600' />
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
      <pre className='whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200'>
        {content}
      </pre>
    </div>
  );
}
