import React, { useState, useEffect } from 'react';
import { X, Upload as UploadIcon, FileText, Check } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: UploadModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('note');
  const [visibility, setVisibility] = useState('public');
  const [courseCode, setCourseCode] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have department ID logic, keep it, otherwise maybe fetch all courses or rely on manual entry
    // For now, keeping existing logic but handling string department
    if (isOpen && user?.department && typeof user.department !== 'string') {
      // @ts-ignore
      fetchCourses(user.department.id);
    }
  }, [isOpen, user]);

  const fetchCourses = async (departmentId: string) => {
    try {
      const res = await api.get(
        `/academic/departments/${departmentId}/courses`,
      );
      setCourses(res.data);
    } catch (error) {
      console.error('Failed to fetch courses', error);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return; // Removed selectedCourse requirement for general upload

    setUploading(true);
    setError(null);

    try {
      // 1. Get presigned URL
      const presignRes = await api.get(
        `/materials/presign?fileType=${file.type}`,
      );
      const { url, signature, timestamp, apiKey, folder } = presignRes.data;

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');
      const uploadData = await uploadRes.json();

      // 3. Create Material Record
      await api.post('/materials', {
        title,
        description: topic,
        type: category,
        fileUrl: uploadData.secure_url,
        fileType: file.type,
        size: file.size,
        courseId: selectedCourse || undefined,
        courseCode: courseCode || undefined,
        topic: topic || undefined,
        scope: visibility,
        targetFaculty: visibility === 'faculty' ? user?.faculty : undefined,
        targetDepartment:
          visibility === 'department' ? user?.department : undefined,
        tags: topic ? [topic] : [],
      });

      setSuccess(true);
      setFile(null);
      setTitle('');
      setSelectedCourse('');
      setTopic('');

      if (onUploadComplete) onUploadComplete();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Upload failed', err);
      setError('Failed to upload material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Upload Material
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <X className='w-6 h-6 text-gray-500' />
          </button>
        </div>

        <div className='p-6'>
          <p className='mb-6 text-gray-600 dark:text-gray-400'>
            Share materials with your department.
          </p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {error && (
              <div className='p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm'>
                {error}
              </div>
            )}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Title
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                placeholder='e.g., Introduction to Physics'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                required
              >
                <option value=''>Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Topic (Optional)
              </label>
              <input
                type='text'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                placeholder='e.g., Mechanics'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
              >
                <option value='note'>Note</option>
                <option value='slide'>Slide</option>
                <option value='past_question'>Past Question</option>
                <option value='other'>Other</option>
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
              >
                <option value='public'>Public (Everyone)</option>
                <option value='faculty'>
                  My Faculty (
                  {typeof user?.faculty === 'string'
                    ? user.faculty
                    : (user?.faculty as any)?.name || ''}
                  )
                </option>
                <option value='department'>
                  My Department (
                  {typeof user?.department === 'string'
                    ? user.department
                    : (user?.department as any)?.name || ''}
                  )
                </option>
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Course Code (Optional)
              </label>
              <input
                type='text'
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                placeholder='e.g., PHY 101'
              />
            </div>

            <div className='border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative'>
              <input
                type='file'
                onChange={handleFileChange}
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                required
              />
              {file ? (
                <div className='flex items-center justify-center text-primary-700 dark:text-primary-400 font-medium'>
                  <FileText className='w-5 h-5 mr-2' />
                  {file.name}
                </div>
              ) : (
                <div className='text-gray-500 dark:text-gray-400'>
                  <UploadIcon className='w-8 h-8 mx-auto mb-2' />
                  <span className='text-primary-600 dark:text-primary-400 font-medium'>
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
              className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center'
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
      </div>
    </div>
  );
}
