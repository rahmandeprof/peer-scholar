import { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Upload,
  FileText,
  ChevronRight,
  Search,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

interface Material {
  id: string;
  title: string;
  type: string;
}

export function StudySessionModal({
  isOpen,
  onClose,
  onUpload,
}: StudySessionModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shelf' | 'upload'>('shelf');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user?.department?.id) {
      fetchCourses();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedCourse) {
      fetchMaterials(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/academic/departments/${user?.department?.id}/courses`,
      );
      setCourses(res.data);
    } catch (error) {
      console.error('Failed to fetch courses', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async (courseId?: string) => {
    setLoading(true);
    try {
      const id = courseId || selectedCourse?.id;
      if (!id) return;
      const res = await api.get(`/academic/courses/${id}/materials`);
      setMaterials(res.data);
    } catch (error) {
      console.error('Failed to fetch materials', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSelect = (materialId: string) => {
    navigate(`/materials/${materialId}`);
    onClose();
  };

  if (!isOpen) return null;

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
              Select material to begin your study timer
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
            onClick={() => setActiveTab('shelf')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center ${
              activeTab === 'shelf'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <BookOpen className='w-4 h-4 mr-2' />
            From Shelf
          </button>
          <button
            onClick={() => {
              onClose();
              onUpload();
            }}
            className='flex-1 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center'
          >
            <Upload className='w-4 h-4 mr-2' />
            Upload New
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6'>
          {activeTab === 'shelf' && (
            <div className='space-y-6'>
              {!selectedCourse ? (
                // Course Selection
                <div className='space-y-4'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                    <input
                      type='text'
                      placeholder='Search courses...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all'
                    />
                  </div>

                  {loading ? (
                    <div className='flex justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {courses
                        .filter(
                          (c) =>
                            c.code
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            c.title
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        )
                        .map((course) => (
                          <button
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className='p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all text-left group'
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <span className='font-bold text-gray-900 dark:text-white'>
                                {course.code}
                              </span>
                              <ChevronRight className='w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors' />
                            </div>
                            <p className='text-sm text-gray-500 dark:text-gray-400 line-clamp-2'>
                              {course.title}
                            </p>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                // Material Selection
                <div className='space-y-4 animate-in slide-in-from-right fade-in duration-300'>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className='text-sm text-gray-500 hover:text-primary-600 flex items-center mb-4'
                  >
                    <ChevronRight className='w-4 h-4 rotate-180 mr-1' />
                    Back to Courses
                  </button>

                  <h3 className='font-bold text-lg text-gray-900 dark:text-white mb-4'>
                    {selectedCourse.code}: {selectedCourse.title}
                  </h3>

                  {loading ? (
                    <div className='flex justify-center py-8'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
                    </div>
                  ) : materials.length > 0 ? (
                    <div className='space-y-2'>
                      {materials.map((material) => (
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
                              {material.type}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='text-center py-12 text-gray-500 dark:text-gray-400'>
                      <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                      <p>No materials found in this course.</p>
                      <button
                        onClick={() => {
                          onClose();
                          onUpload();
                        }}
                        className='text-primary-600 hover:underline mt-2'
                      >
                        Upload something?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
