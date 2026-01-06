import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { BorderSpinner } from './Skeleton';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useModalBack } from '../hooks/useModalBack';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle?: string;
}

// These must match the FlagReason enum in the backend
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

export function ReportModal({
  isOpen,
  onClose,
  materialId,
  materialTitle,
}: ReportModalProps) {
  useModalBack(isOpen, onClose, 'report-modal');

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason) {
      error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/materials/${materialId}/flag`, {
        reason,
        description: description.trim() || undefined,
      });
      success(
        'Report submitted. Thank you for helping keep the platform clean!',
      );
      onClose();
      setReason('');
      setDescription('');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit report';
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 relative'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center'>
            <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3'>
              <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                Report Material
              </h3>
              {materialTitle && (
                <p className='text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]'>
                  {materialTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Why are you reporting this?
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
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none resize-none'
              rows={3}
              maxLength={500}
              placeholder='Please provide more context...'
            />
          </div>

          <div className='flex space-x-3 pt-2'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className='flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            >
              {submitting ? <BorderSpinner size='md' /> : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
