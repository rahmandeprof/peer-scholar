import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  MoreVertical,
  Download,
  Share2,
  FileText as SummarizeIcon,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmationModal } from './ConfirmationModal';
import api from '../lib/api';

interface Material {
  id: string;
  title: string;
  description: string;
  type: string;
  fileUrl: string;
  fileType: string;
  size: number;
  createdAt: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
  course?: {
    code: string;
  };
}

interface MaterialCardProps {
  material: Material;
  onDelete?: (id: string) => void;
}

export function MaterialCard({ material, onDelete }: MaterialCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const isOwner = user?.id === material.uploader.id;

  const handleDownload = () => {
    window.open(material.fileUrl, '_blank');
    setMenuOpen(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/materials/${material.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
    setMenuOpen(false);
  };

  const handleSummarize = () => {
    navigate(`/chat?initialMaterialId=${material.id}`);
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/chat/materials/${material.id}`);
      toast.success('Material deleted successfully');
      if (onDelete) onDelete(material.id);
    } catch {
      toast.error('Failed to delete material');
    }
    setDeleteModalOpen(false);
  };

  return (
    <>
      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl overflow-visible shadow-sm rounded-2xl hover:shadow-md transition-all border border-gray-200/50 dark:border-gray-700/50 group relative'>
        <div className='p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex-1 min-w-0 mr-4'>
              <h3
                className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors'
                title={material.title}
              >
                {material.title}
              </h3>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium'>
                {material.course?.code}
              </p>
            </div>
            <div className='flex items-center space-x-2'>
              <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-100 dark:border-primary-800'>
                {material.type}
              </span>

              {/* Menu Button */}
              <div className='relative'>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  <MoreVertical className='w-5 h-5' />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <>
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className='absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1 animate-pop-in'>
                      <button
                        onClick={handleDownload}
                        className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center'
                      >
                        <Download className='w-4 h-4 mr-2' />
                        Download
                      </button>
                      <button
                        onClick={handleShare}
                        className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center'
                      >
                        <Share2 className='w-4 h-4 mr-2' />
                        Share
                      </button>
                      <button
                        onClick={handleSummarize}
                        className='w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center'
                      >
                        <SummarizeIcon className='w-4 h-4 mr-2' />
                        Summarize
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setDeleteModalOpen(true);
                          }}
                          className='w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center'
                        >
                          <Trash2 className='w-4 h-4 mr-2' />
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className='flex items-center text-sm text-gray-500 dark:text-gray-400'>
            <span className='truncate'>
              By {material.uploader?.firstName} {material.uploader?.lastName}
            </span>
          </div>
        </div>
        <div className='bg-gray-50/50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-100 dark:border-gray-700/50'>
          <Link
            to={`/materials/${material.id}`}
            className='text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center group-hover:translate-x-1 transition-transform'
          >
            Study Now
            <FileText className='ml-2 h-4 w-4' />
          </Link>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title='Delete Material'
        message='Are you sure you want to delete this material? This action cannot be undone.'
        confirmText='Delete'
        isDangerous={true}
      />
    </>
  );
}
