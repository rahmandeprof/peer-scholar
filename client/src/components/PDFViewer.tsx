import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { AnnotationManager } from './AnnotationManager';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  url: string;
  materialId?: string;
}

export function PDFViewer({ url, materialId }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  // Track page changes
  useEffect(() => {
    if (materialId) {
      const timer = setTimeout(() => {
        api.post('/users/activity/update', {
          materialId,
          page: pageNumber,
        }).catch(console.error);
      }, 1000); // Debounce updates

      return () => clearTimeout(timer);
    }
  }, [pageNumber, materialId]);

  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className='flex flex-col h-full bg-gray-100 dark:bg-gray-900'>
      {/* Toolbar */}
      <div className='flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10'>
        <div className='flex items-center space-x-2'>
          <button
            onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <span className='text-sm font-medium'>
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button
            onClick={() =>
              setPageNumber((prev) => Math.min(prev + 1, numPages))
            }
            disabled={pageNumber >= numPages}
            className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
            className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <ZoomOut className='w-5 h-5' />
          </button>
          <span className='text-sm font-medium w-12 text-center'>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.0))}
            className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <ZoomIn className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Document */}
      <div className='flex-1 overflow-auto flex justify-center p-4' ref={containerRef}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          className='shadow-lg'
          loading={
            <div className='flex items-center justify-center h-64'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
            </div>
          }
          error={
            <div className='flex items-center justify-center h-64 text-red-500'>
              Failed to load PDF.
            </div>
          }
        >

          {materialId ? (
            <AnnotationManager materialId={materialId} pageNumber={pageNumber}>
              <Page
                pageNumber={pageNumber}
                scale={scale}
                width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined} // Subtract padding, max width 800
                className='bg-white'
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div className='flex items-center justify-center h-[800px] bg-white'>
                     <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                  </div>
                }
              />
            </AnnotationManager>
          ) : (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              width={containerWidth ? Math.min(containerWidth - 32, 800) : undefined}
              className='bg-white'
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                 <div className='flex items-center justify-center h-[800px] bg-white'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                 </div>
              }
            />
          )}
        </Document>
      </div>
    </div>
  );
}
