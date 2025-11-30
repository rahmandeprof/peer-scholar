import { X, FileText, Download } from 'lucide-react';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: {
    title: string;
    content: string;
    fileUrl: string;
    fileType: string;
  } | null;
}

export function FileViewerModal({ isOpen, onClose, material }: FileViewerModalProps) {
  if (!isOpen || !material) return null;

  const isPDF = material.fileType === 'application/pdf';
  const isImage = material.fileType.startsWith('image/');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
              {material.title}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={material.fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Download original"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950 p-4">
          {isPDF ? (
            <iframe
              src={material.fileUrl}
              className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800"
              title="PDF Viewer"
            />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={material.fileUrl}
                alt={material.title}
                className="max-w-full max-h-full rounded-xl object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <div className="max-w-3xl mx-auto">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap font-serif text-lg leading-relaxed">
                  {material.content}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
