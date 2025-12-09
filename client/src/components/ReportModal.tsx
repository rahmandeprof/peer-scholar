import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
}

const REASONS = [
  'Spam or Misleading',
  'Inappropriate Content',
  'Wrong Department/Course',
  'Poor Quality',
  'Other',
];

export function ReportModal({ isOpen, onClose, materialId }: ReportModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/materials/${materialId}/report`, {
        reason,
        description,
      });
      success('Report submitted. Thank you for keeping peerStudent safe.');
      onClose();
    } catch (err) {
      console.error('Failed to submit report', err);
      error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 relative'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
            <AlertTriangle className='w-5 h-5 text-red-500 mr-2' />
            Report Material
          </h3>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
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
              {REASONS.map((r) => (
                <label
                  key={r}
                  className='flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                >
                  <input
                    type='radio'
                    name='reason'
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className='w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500'
                  />
                  <span className='ml-3 text-sm text-gray-700 dark:text-gray-200'>
                    {r}
                  </span>
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
              className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none resize-none h-24'
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
              disabled={submitting}
              className='flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
