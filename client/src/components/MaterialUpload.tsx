import React, { useState } from 'react';
import { Upload, FileText, Check } from 'lucide-react';
import api from '../lib/api';

export function MaterialUpload({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [category, setCategory] = useState('course_material');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('department', department);
    formData.append('yearLevel', yearLevel);
    formData.append('category', category);

    setUploading(true);
    try {
      await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setFile(null);
      setTitle('');
      if (onUploadComplete) onUploadComplete();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-6'>
      <h3 className='text-lg font-bold text-gray-800 mb-4 flex items-center'>
        <Upload className='w-5 h-5 mr-2 text-primary-600' />
        Upload Material
      </h3>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Title
          </label>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
            placeholder='e.g., Introduction to Physics'
            required
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Department
            </label>
            <input
              type='text'
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className='w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none'
              placeholder='e.g., Science'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Year Level
            </label>
            <input
              type='number'
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              className='w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none'
              placeholder='e.g., 1'
            />
          </div>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className='w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none'
          >
            <option value='course_material'>Course Material</option>
            <option value='past_question'>Past Question</option>
          </select>
        </div>

        <div className='border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative'>
          <input
            type='file'
            onChange={handleFileChange}
            className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
          />
          {file ? (
            <div className='flex items-center justify-center text-primary-700 font-medium'>
              <FileText className='w-5 h-5 mr-2' />
              {file.name}
            </div>
          ) : (
            <div className='text-gray-500'>
              <span className='text-primary-600 font-medium'>
                Click to upload
              </span>{' '}
              or drag and drop
              <p className='text-xs mt-1'>PDF, DOCX up to 10MB</p>
            </div>
          )}
        </div>

        <button
          type='submit'
          disabled={uploading || !file}
          className='w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center'
        >
          {uploading ? (
            'Uploading...'
          ) : success ? (
            <>
              <Check className='w-5 h-5 mr-2' /> Uploaded
            </>
          ) : (
            'Upload Material'
          )}
        </button>
      </form>
    </div>
  );
}
