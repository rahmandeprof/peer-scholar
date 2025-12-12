import { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Upload,
  FileText,
  ChevronRight,
  Search,
  FolderPlus,
  Folder,
} from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useModalBack } from '../hooks/useModalBack';

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

interface Collection {
  id: string;
  title: string;
  color: string;
  materials: Material[];
}

interface Material {
  id: string;
  title: string;
  type: string;
  fileType?: string;
}

export function StudySessionModal({
  isOpen,
  onClose,
  onUpload,
}: StudySessionModalProps) {
  useModalBack(isOpen, onClose, 'study-session-modal');

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shelf' | 'upload'>('shelf');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
      setSelectedCollection(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/academic/collections');
      setCollections(res.data);
    } catch (error) {
      console.error('Failed to fetch collections', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionDetails = async (collectionId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/academic/collections/${collectionId}`);
      setSelectedCollection(res.data);
    } catch (error) {
      console.error('Failed to fetch collection', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSelect = (materialId: string) => {
    navigate(`/materials/${materialId}`);
    onClose();
  };

  if (!isOpen) return null;

  const filteredCollections = collections.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]'>
        {/* Header */}
        <div className='p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0'>
          <div>
            <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
              Start Reading Session
            </h2>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Select material from your collections
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-200 dark:border-gray-700 shrink-0'>
          <button
            onClick={() => {
              setActiveTab('shelf');
              setSelectedCollection(null);
            }}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${activeTab === 'shelf'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <BookOpen className='w-4 h-4 mr-2' />
            From Shelf
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${activeTab === 'upload'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Upload className='w-4 h-4 mr-2' />
            Upload New
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          {activeTab === 'shelf' && (
            <div className='space-y-6'>
              {!selectedCollection ? (
                // Collection Selection
                <div className='space-y-4'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                    <input
                      type='text'
                      placeholder='Search collections...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
                    />
                  </div>

                  {loading ? (
                    <div className='flex justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                    </div>
                  ) : filteredCollections.length === 0 ? (
                    <div className='text-center py-12'>
                      <Folder className='w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4' />
                      <p className='text-gray-500 dark:text-gray-400 mb-4'>
                        {collections.length === 0
                          ? "You don't have any collections yet."
                          : 'No collections match your search.'}
                      </p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className='text-primary-600 hover:underline font-medium'
                      >
                        Create your first collection →
                      </button>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {filteredCollections.map((collection) => (
                        <button
                          key={collection.id}
                          onClick={() => fetchCollectionDetails(collection.id)}
                          className='p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left group'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center'>
                              <div
                                className='w-3 h-3 rounded-full mr-2'
                                style={{ backgroundColor: collection.color || '#4F46E5' }}
                              />
                              <span className='font-bold text-gray-900 dark:text-white'>
                                {collection.title}
                              </span>
                            </div>
                            <ChevronRight className='w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors' />
                          </div>
                          <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {collection.materials?.length || 0} items
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Material Selection from Collection
                <div className='space-y-4 animate-in slide-in-from-right fade-in duration-300'>
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className='text-sm text-gray-500 hover:text-primary-600 flex items-center mb-4'
                  >
                    <ChevronRight className='w-4 h-4 rotate-180 mr-1' />
                    Back to Collections
                  </button>

                  <div className='flex items-center mb-4'>
                    <div
                      className='w-4 h-4 rounded-full mr-3'
                      style={{ backgroundColor: selectedCollection.color || '#4F46E5' }}
                    />
                    <h3 className='font-bold text-lg text-gray-900 dark:text-white'>
                      {selectedCollection.title}
                    </h3>
                  </div>

                  {loading ? (
                    <div className='flex justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                    </div>
                  ) : selectedCollection.materials?.length > 0 ? (
                    <div className='space-y-2'>
                      {selectedCollection.materials.map((material) => (
                        <button
                          key={material.id}
                          onClick={() => handleMaterialSelect(material.id)}
                          className='w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all flex items-center text-left group'
                        >
                          <div className='p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400 mr-4 group-hover:scale-110 transition-transform'>
                            <FileText className='w-5 h-5' />
                          </div>
                          <div>
                            <h4 className='font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors'>
                              {material.title}
                            </h4>
                            <p className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
                              {material.fileType || material.type}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
                      <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                      <p>This collection is empty.</p>
                      <button
                        onClick={() => setActiveTab('upload')}
                        className='text-primary-600 hover:underline mt-2'
                      >
                        Add something?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <PersonalUploadSection
              collections={collections}
              onCollectionCreated={fetchCollections}
              onClose={onClose}
              onUploadToPublic={onUpload}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Personal Upload Section Component
interface PersonalUploadSectionProps {
  collections: Collection[];
  onCollectionCreated: () => void;
  onClose: () => void;
  onUploadToPublic: () => void;
}

function PersonalUploadSection({
  collections,
  onCollectionCreated,
  onClose,
  onUploadToPublic,
}: PersonalUploadSectionProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'choose' | 'upload' | 'create'>('choose');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setStep('choose');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/academic/collections', { title: newCollectionTitle });
      setSelectedCollectionId(res.data.id);
      onCollectionCreated();
      setStep('upload');
      setNewCollectionTitle('');
    } catch (error) {
      console.error('Failed to create collection', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedCollectionId) return;
    setUploading(true);
    try {
      // Step 1: Upload file to get URL
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Step 2: Create material with minimal data (personal, so private)
      const materialRes = await api.post('/materials', {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        fileUrl: uploadRes.data.url,
        fileType: file.type,
        size: file.size,
        type: 'personal_note',
        scope: 'private',
      });

      // Step 3: Add material to collection
      await api.post(`/academic/collections/${selectedCollectionId}/materials`, {
        materialId: materialRes.data.id,
      });

      // Navigate to the material
      navigate(`/materials/${materialRes.data.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to upload', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* File Drop Zone - Always visible at top */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : file
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
          }`}
      >
        {file ? (
          <div className='flex items-center justify-center space-x-3'>
            <FileText className='w-8 h-8 text-green-600' />
            <div className='text-left'>
              <p className='font-medium text-gray-900 dark:text-white'>{file.name}</p>
              <p className='text-sm text-gray-500'>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className='p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full'
            >
              <X className='w-4 h-4 text-gray-500' />
            </button>
          </div>
        ) : (
          <>
            <Upload className='w-12 h-12 mx-auto text-gray-400 mb-4' />
            <p className='text-gray-600 dark:text-gray-300 mb-2'>
              Drag & drop your file here
            </p>
            <label className='inline-block'>
              <span className='text-primary-600 hover:underline cursor-pointer'>
                or browse files
              </span>
              <input
                type='file'
                className='hidden'
                accept='.pdf,.doc,.docx,.ppt,.pptx,.txt'
                onChange={handleFileSelect}
              />
            </label>
          </>
        )}
      </div>

      {file && (
        <>
          {step === 'choose' && (
            <div className='space-y-4'>
              <h3 className='font-medium text-gray-900 dark:text-white'>
                Save to collection:
              </h3>

              {collections.length > 0 ? (
                <div className='grid grid-cols-2 gap-3'>
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        setSelectedCollectionId(col.id);
                        setStep('upload');
                      }}
                      className='p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 transition-all text-left flex items-center'
                    >
                      <div
                        className='w-3 h-3 rounded-full mr-2'
                        style={{ backgroundColor: col.color || '#4F46E5' }}
                      />
                      <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                        {col.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                onClick={() => setStep('create')}
                className='w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-500 transition-all flex items-center justify-center text-gray-600 dark:text-gray-300'
              >
                <FolderPlus className='w-5 h-5 mr-2' />
                Create New Collection
              </button>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-4'>
                <button
                  onClick={() => {
                    onClose();
                    onUploadToPublic();
                  }}
                  className='text-sm text-gray-500 hover:text-primary-600'
                >
                  Or upload to public library instead →
                </button>
              </div>
            </div>
          )}

          {step === 'create' && (
            <div className='space-y-4'>
              <button
                onClick={() => setStep('choose')}
                className='text-sm text-gray-500 hover:text-primary-600 flex items-center'
              >
                <ChevronRight className='w-4 h-4 rotate-180 mr-1' />
                Back
              </button>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Collection Name
                </label>
                <input
                  type='text'
                  value={newCollectionTitle}
                  onChange={(e) => setNewCollectionTitle(e.target.value)}
                  placeholder='e.g., Exam Prep, Research Papers...'
                  className='w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none'
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
                />
              </div>

              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionTitle.trim() || creating}
                className='w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors'
              >
                {creating ? 'Creating...' : 'Create & Continue'}
              </button>
            </div>
          )}

          {step === 'upload' && (
            <div className='space-y-4'>
              <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800'>
                <p className='text-green-800 dark:text-green-300 text-sm'>
                  ✓ Ready to upload to your collection
                </p>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className='w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center'
              >
                {uploading ? (
                  <>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className='w-5 h-5 mr-2' />
                    Upload & Start Reading
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {!file && (
        <p className='text-center text-sm text-gray-500'>
          Upload a file to save it to your personal collection
        </p>
      )}
    </div>
  );
}
