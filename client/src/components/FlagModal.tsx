import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useModalBack } from '../hooks/useModalBack';

interface FlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
}

const FLAG_REASONS = [
  {
    value: 'wrong_content',
    label: 'Wrong Content',
    description: 'Document is incorrect or misleading',
  },
  {
    value: 'low_quality',
    label: 'Low Quality',
    description: 'Poor image quality, unreadable, or incomplete',
  },
  {
    value: 'duplicate',
    label: 'Duplicate',
    description: 'Same content as another document',
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate',
    description: 'Contains offensive or inappropriate content',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other issue not listed above',
  },
];

export function FlagModal({
  isOpen,
  onClose,
  materialId,
  materialTitle,
}: FlagModalProps) {
  useModalBack(isOpen, onClose, 'flag-modal');

  const toast = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason) {
      toast.warning('Please select a reason');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/materials/${materialId}/flag`, {
        reason,
        description: description.trim() || undefined,
      });
      toast.success(
        'Report submitted. Thank you for helping keep the platform clean!',
      );
      onClose();
      setReason('');
      setDescription('');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit report';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md animate-pop-in'>
        {/* Header */}
        <div className='flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800'>
          <div className='flex items-center'>
            <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3'>
              <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                Report Document
              </h2>
              <p className='text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]'>
                {materialTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Content */}
        <div className='p-5 space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Why are you reporting this document?
            </label>
            <div className='space-y-2'>
              {FLAG_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    reason === r.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type='radio'
                    name='reason'
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className='sr-only'
                  />
                  <div>
                    <p className='font-medium text-gray-900 dark:text-gray-100 text-sm'>
                      {r.label}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {r.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Provide more details about the issue...'
              rows={3}
              maxLength={500}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none text-sm'
            />
          </div>
        </div>

        {/* Footer */}
        <div className='flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
          >
            {loading ? <BorderSpinner size='sm' className='mr-2' /> : null}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlagModal;
