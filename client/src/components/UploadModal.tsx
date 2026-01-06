import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Upload as UploadIcon, FileText, Check } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UNILORIN_FACULTIES } from '../data/unilorin-faculties';
import { useModalBack } from '../hooks/useModalBack';

// Type definition for Cloudinary presign response
interface CloudinaryConfig {
  url: string;
  signature: string;
  uploadTimestamp: number;
  apiKey: string;
  folder: string;
  uploadPreset: string;
  uniqueFilename: boolean;
  overwrite: boolean;
  method: 'POST';
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

export function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: UploadModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  // Handle back button closing
  useModalBack(isOpen, onClose, 'upload-modal');

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('note');
  const [visibility, setVisibility] = useState('public');
  const [courseCode, setCourseCode] = useState('');
  const [specificFaculty, setSpecificFaculty] = useState('');
  const [specificDepartment, setSpecificDepartment] = useState('');
  const [targetYear, setTargetYear] = useState<number | ''>('');

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMaterial, setDuplicateMaterial] = useState<any>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for file input to properly reset the DOM element
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Complete form reset function
  const resetForm = useCallback(() => {
    setFile(null);
    setTitle('');
    setTopic('');
    setCategory('note');
    setVisibility('public');
    setCourseCode('');
    setSpecificFaculty('');
    setSpecificDepartment('');
    setTargetYear('');
    setShowDuplicateModal(false);
    setDuplicateMaterial(null);
    setUploading(false);
    setUploadProgress(0);
    setSuccess(false);
    setError(null);
    // Reset the file input DOM element to allow re-selecting the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle modal close with form reset
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // ... (existing handlers)

  const calculateFileHash = async (file: File): Promise<string> => {
    try {
      // Check if crypto.subtle is available (requires HTTPS)
      if (!crypto?.subtle) {
        console.warn('crypto.subtle not available, using fallback hash');
        return `fallback-${Date.now()}-${file.size}`;
      }
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => (b !== undefined ? b.toString(16) : '00').padStart(2, '0'))
        .join('');
      return hashHex;
    } catch (err) {
      console.warn('Hash calculation failed, using fallback:', err);
      return `fallback-${Date.now()}-${file.size}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setError(null);

    try {
      // 0. Check for duplicates
      const hash = await calculateFileHash(file);
      // console.log('File Hash:', hash);

      try {
        const duplicateRes = await api.post('/materials/check-duplicate', {
          hash,
          department:
            specificDepartment ||
            (typeof user?.department === 'string'
              ? user.department
              : (user?.department as any)?.name),
        });

        if (duplicateRes.data) {
          setDuplicateMaterial(duplicateRes.data);
          setShowDuplicateModal(true);
          setUploading(false);
          return; // Stop upload flow
        }
      } catch (err) {
        console.error('Duplicate check failed', err);
        // Warn user but continue - duplicate check is non-blocking
        toast.warning('Duplicate check unavailable. Proceeding with upload.');
      }

      await proceedWithUpload(hash);
    } catch (err: any) {
      console.error('Upload failed', err);
      // ... (error handling)
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to upload material';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploading(false);
    }
  };

  const proceedWithUpload = async (
    fileHash: string,
    parentMaterialId?: string,
  ) => {
    // 1. Get presigned URL with provider info
    const presignRes = await api.get(
      `/materials/presign?fileType=${encodeURIComponent(file!.type)}&filename=${encodeURIComponent(file!.name)}`,
    );

    const { provider, primary, fallback } = presignRes.data;

    // 2. Upload file based on provider
    let fileUrl = '';

    const uploadToR2 = async (): Promise<string> => {
      // R2 uses PUT with presigned URL
      await axios.put(primary.url, file, {
        headers: primary.headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          }
        },
        timeout: 600000, // 10 minutes for large files
      });
      return primary.publicUrl;
    };

    const uploadToCloudinary = async (
      config: CloudinaryConfig,
    ): Promise<string> => {
      // Validate config has required fields
      if (!config?.url || !config?.apiKey || !config?.signature) {
        throw new Error('Invalid Cloudinary configuration');
      }

      // Cloudinary uses POST with form data
      const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB

      if (file!.size <= 9.5 * 1024 * 1024) {
        // Single request for small files
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('api_key', config.apiKey);
        formData.append('timestamp', String(config.uploadTimestamp || ''));
        formData.append('signature', config.signature);
        if (config.folder) formData.append('folder', config.folder);
        if (config.uploadPreset)
          formData.append('upload_preset', config.uploadPreset);
        if (config.uniqueFilename) formData.append('unique_filename', 'true');
        if (config.overwrite) formData.append('overwrite', 'true');

        const res = await axios.post(config.url, formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setUploadProgress(percentCompleted);
            }
          },
          timeout: 300000,
        });
        return res.data.secure_url;
      } else {
        // Chunked upload for large files
        const uniqueUploadId = `scholar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let start = 0;
        let end = Math.min(CHUNK_SIZE, file!.size);
        let response;

        while (start < file!.size) {
          const chunk = file!.slice(start, end);
          const formData = new FormData();
          formData.append('file', chunk);
          formData.append('api_key', config.apiKey);
          formData.append('timestamp', String(config.uploadTimestamp || ''));
          formData.append('signature', config.signature);
          if (config.folder) formData.append('folder', config.folder);
          if (config.uploadPreset)
            formData.append('upload_preset', config.uploadPreset);
          if (config.uniqueFilename) formData.append('unique_filename', 'true');
          if (config.overwrite) formData.append('overwrite', 'true');

          const headers = {
            'X-Unique-Upload-Id': uniqueUploadId,
            'Content-Range': `bytes ${start}-${end - 1}/${file!.size}`,
          };

          response = await axios.post(config.url, formData, {
            headers,
            onUploadProgress: (progressEvent) => {
              const chunkLoaded = progressEvent.loaded;
              const totalLoaded = start + chunkLoaded;
              const percentCompleted = Math.round(
                (totalLoaded * 100) / file!.size,
              );
              setUploadProgress(Math.min(percentCompleted, 99));
            },
            timeout: 300000,
          });

          start = end;
          end = Math.min(start + CHUNK_SIZE, file!.size);
        }
        setUploadProgress(100);
        return response?.data.secure_url;
      }
    };

    // Execute upload with fallback logic
    if (provider === 'r2') {
      try {
        fileUrl = await uploadToR2();
      } catch (r2Error) {
        console.warn('R2 upload failed, checking fallback...', r2Error);

        // Try Cloudinary fallback if file is small enough
        if (fallback && file!.size <= fallback.maxSize) {
          console.log('Falling back to Cloudinary...');
          toast.info('Trying alternative upload method...');
          setUploadProgress(0);
          // Extract CloudinaryConfig from fallback (which has extra maxSize/provider fields)
          fileUrl = await uploadToCloudinary(fallback as CloudinaryConfig);
        } else {
          throw r2Error; // Re-throw if no fallback available
        }
      }
    } else {
      // Cloudinary-only mode - primary is CloudinaryConfig
      fileUrl = await uploadToCloudinary(primary as CloudinaryConfig);
    }

    if (!fileUrl) {
      throw new Error('Upload failed: No file URL returned');
    }

    // 3. Create Material Record
    // Determine scope and targets
    let scope = visibility;
    let targetFaculty = undefined;
    let targetDepartment = undefined;

    if (visibility === 'specific_faculty') {
      scope = 'faculty';
      targetFaculty = specificFaculty;
    } else if (visibility === 'specific_department') {
      scope = 'department';
      targetDepartment = specificDepartment;
      targetFaculty = specificFaculty; // Optional: keep faculty context
    } else if (visibility === 'faculty') {
      targetFaculty =
        typeof user?.faculty === 'string'
          ? user.faculty
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user?.faculty as any)?.name;
    } else if (visibility === 'department') {
      targetDepartment =
        typeof user?.department === 'string'
          ? user.department
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (user?.department as any)?.name;
    }

    await api.post('/materials', {
      title,
      description: topic,
      type: category,
      fileUrl: fileUrl, // Use the URL from whichever provider succeeded
      fileType: file!.type,
      size: file!.size,
      courseCode: courseCode || undefined,
      topic: topic || undefined,
      scope,
      targetFaculty,
      targetDepartment,
      targetYear: targetYear || undefined,
      tags: topic ? [topic] : [],
      fileHash, // Send hash to backend
      parentMaterialId, // Send parent ID if versioning
    });

    setSuccess(true);
    toast.success('Material uploaded successfully!');

    if (onUploadComplete) onUploadComplete();
    setTimeout(() => {
      resetForm();
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      {showDuplicateModal ? (
        <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6'>
          <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
            Duplicate Material Found
          </h3>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            A material with the same content already exists: <br />
            <strong>{duplicateMaterial?.title}</strong> uploaded by{' '}
            {duplicateMaterial?.uploader?.firstName}{' '}
            {duplicateMaterial?.uploader?.lastName}.
          </p>
          <div className='flex flex-col space-y-3'>
            <button
              onClick={async () => {
                try {
                  await api.post(
                    `/materials/${duplicateMaterial.id}/contributor`,
                  );
                  toast.success('You have been added as a contributor!');
                  setShowDuplicateModal(false);
                  onClose();
                } catch (err) {
                  toast.error('Failed to link to material');
                }
              }}
              className='w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors'
            >
              Link to Existing (Add me as Contributor)
            </button>
            <button
              onClick={() => {
                setShowDuplicateModal(false);
                // Proceed with upload but pass parentMaterialId
                void proceedWithUpload(
                  duplicateMaterial?.fileHash,
                  duplicateMaterial?.id,
                );
              }}
              className='w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors'
            >
              Upload as New Version
            </button>
            <a
              href={`/materials/${duplicateMaterial?.id}`}
              target='_blank'
              rel='noreferrer'
              className='w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium text-center transition-colors'
            >
              View Existing Material
            </a>
            <button
              onClick={() => {
                setShowDuplicateModal(false);
                setFile(null);
              }}
              className='w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors'
            >
              Cancel Upload
            </button>
          </div>
        </div>
      ) : (
        <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
          {/* ... (existing modal content) */}
          <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center'>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Upload Material
            </h2>
            <button
              onClick={handleClose}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            >
              <X className='w-6 h-6 text-gray-500' />
            </button>
          </div>

          <div className='p-6'>
            <p className='mb-6 text-gray-600 dark:text-gray-400'>
              Share materials with students like you.
            </p>

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* ... (existing form fields) */}
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
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                  placeholder='e.g., Introduction to Physics'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Topic (Optional)
                </label>
                <input
                  type='text'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
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
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
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
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                >
                  <option value='public'>Public (Everyone)</option>
                  <option value='faculty'>
                    My Faculty (
                    {typeof user?.faculty === 'string'
                      ? user.faculty
                      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (user?.faculty as any)?.name || ''}
                    )
                  </option>
                  <option value='department'>
                    My Department (
                    {typeof user?.department === 'string'
                      ? user.department
                      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (user?.department as any)?.name || ''}
                    )
                  </option>
                  <option value='specific_faculty'>Specific Faculty</option>
                  <option value='specific_department'>
                    Specific Department
                  </option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Target Year (Optional)
                </label>
                <select
                  value={targetYear}
                  onChange={(e) =>
                    setTargetYear(
                      e.target.value ? parseInt(e.target.value) : '',
                    )
                  }
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                >
                  <option value=''>All Years</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>

              {visibility === 'specific_faculty' && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Select Faculty
                  </label>
                  <select
                    value={specificFaculty}
                    onChange={(e) => setSpecificFaculty(e.target.value)}
                    className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                    required
                  >
                    <option value=''>Select Faculty</option>
                    {UNILORIN_FACULTIES.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {visibility === 'specific_department' && (
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Select Faculty
                    </label>
                    <select
                      value={specificFaculty}
                      onChange={(e) => {
                        setSpecificFaculty(e.target.value);
                        setSpecificDepartment('');
                      }}
                      className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                      required
                    >
                      <option value=''>Select Faculty</option>
                      {UNILORIN_FACULTIES.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Select Department
                    </label>
                    <select
                      value={specificDepartment}
                      onChange={(e) => setSpecificDepartment(e.target.value)}
                      className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
                      required
                      disabled={!specificFaculty}
                    >
                      <option value=''>Select Department</option>
                      {specificFaculty &&
                        UNILORIN_FACULTIES.find(
                          (f) => f.name === specificFaculty,
                        )?.departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Course Code (Optional)
                </label>
                <input
                  type='text'
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className='w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none'
                  placeholder='e.g., PHY 101'
                />
              </div>

              <div className='border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative'>
                <input
                  ref={fileInputRef}
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
                    <p className='text-xs mt-1'>
                      Documents and Text files supported
                    </p>
                  </div>
                )}
              </div>

              {/* Upload tips note */}
              <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1'>
                <p className='text-xs text-amber-700 dark:text-amber-400'>
                  <strong>📄 Scanned PDFs:</strong> Limited to 50 pages for text recognition.
                  Regular PDFs with selectable text have no limit.
                </p>
                <p className='text-xs text-amber-700 dark:text-amber-400'>
                  <strong>🤖 AI Features:</strong> Best results for documents under 200 pages.
                  For textbooks, consider uploading individual chapters.
                </p>
              </div>

              {uploading && (
                <div className='mb-4'>
                  <div className='flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400'>
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden'>
                    <div
                      className='bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out'
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                type='submit'
                disabled={uploading || !file}
                className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center'
              >
                {uploading ? (
                  'Processing...'
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
      )}
    </div>
  );
}
