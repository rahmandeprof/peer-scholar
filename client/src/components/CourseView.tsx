import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../lib/api';
import {
  FileText,
  Download,
  ArrowLeft,
  Filter,
  Search,
  Hash,
  Eye,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingState } from './LoadingState';

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
    firstName: string;
    lastName: string;
  };
}

interface Course {
  id: string;
  code: string;
  title: string;
}

export const CourseView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId);
      fetchMaterials(courseId);
      fetchTopics(courseId);
    }
  }, [courseId]);

  const fetchCourseDetails = async (id: string) => {
    try {
      const res = await axios.get(`/academic/courses/${id}`);
      setCourse(res.data);
    } catch (error) {
      console.error('Failed to fetch course details', error);
    }
  };

  const fetchMaterials = async (id: string) => {
    try {
      const res = await axios.get(`/materials?courseId=${id}`);
      setMaterials(res.data);
    } catch (error) {
      console.error('Failed to fetch materials', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async (id: string) => {
    try {
      const res = await axios.get(`/academic/materials/course/${id}/topics`);
      setTopics(res.data);
    } catch (error) {
      console.error('Failed to fetch topics', error);
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesType = filterType === 'all' || material.type === filterType;
    const matchesSearch = material.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <LoadingState message='Fetching course materials...' />;
  }

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full overflow-y-auto'>
      <div className='mb-8'>
        <Link
          to='/dashboard'
          className='inline-flex items-center text-sm text-gray-500 hover:text-primary-600 mb-4 transition-colors'
        >
          <ArrowLeft className='w-4 h-4 mr-1' />
          Back to Dashboard
        </Link>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          {course?.code} - {course?.title}
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Course Materials & Resources
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
        {/* Main Content */}
        <div className='lg:col-span-3'>
          <div className='flex flex-col sm:flex-row justify-between items-center mb-6 gap-4'>
            <div className='relative w-full sm:w-96'>
              <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                <Search className='h-5 w-5 text-gray-400' />
              </div>
              <input
                type='text'
                className='block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all'
                placeholder='Search materials...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className='flex items-center space-x-2 w-full sm:w-auto'>
              <Filter className='h-5 w-5 text-gray-400' />
              <select
                className='block w-full pl-3 pr-10 py-2.5 text-base border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm'
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value='all'>All Types</option>
                <option value='note'>Notes</option>
                <option value='slide'>Slides</option>
                <option value='past_question'>Past Questions</option>
              </select>
            </div>
          </div>

          <div className='bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden'>
            <ul className='divide-y divide-gray-200/50 dark:divide-gray-800/50'>
              {filteredMaterials.length === 0 ? (
                <li className='px-6 py-12 text-center text-gray-500 dark:text-gray-400'>
                  No materials found matching your criteria.
                </li>
              ) : (
                filteredMaterials.map((material) => (
                  <li key={material.id}>
                    <div className='px-6 py-5 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center min-w-0 flex-1'>
                          <div className='flex-shrink-0'>
                            <div className='h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center'>
                              <FileText className='h-6 w-6 text-primary-600 dark:text-primary-400' />
                            </div>
                          </div>
                          <div className='min-w-0 flex-1 px-4'>
                            <div>
                              <p className='text-base font-semibold text-gray-900 dark:text-gray-100 truncate'>
                                {material.title}
                              </p>
                              <p className='mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400'>
                                <span className='truncate'>
                                  {material.description}
                                </span>
                              </p>
                            </div>
                            <div className='mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4'>
                              <span className='capitalize px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-medium'>
                                {material.type.replace('_', ' ')}
                              </span>
                              <span>{formatFileSize(material.size)}</span>
                              <span className='hidden sm:inline'>
                                Uploaded by {material.uploader.firstName}{' '}
                                {material.uploader.lastName}
                              </span>
                              <span>
                                {format(
                                  new Date(material.createdAt),
                                  'MMM d, yyyy',
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='ml-4 flex-shrink-0 flex flex-col sm:flex-row gap-2'>
                          <button
                            onClick={() => {
                              // Handle view logic here (e.g. open modal)
                              // For now just opening in new tab as fallback
                              window.open(material.fileUrl, '_blank');
                            }}
                            className='inline-flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all'
                          >
                            <Eye className='h-4 w-4 sm:mr-2' />
                            <span className='hidden sm:inline'>View</span>
                          </button>

                          <Link
                            to={`/materials/${material.id}`}
                            className='inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all'
                          >
                            <MessageSquare className='h-4 w-4 sm:mr-2' />
                            <span className='hidden sm:inline'>Summarize</span>
                          </Link>

                          <a
                            href={material.fileUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            download
                            className='inline-flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all'
                          >
                            <Download className='h-4 w-4 sm:mr-2' />
                            <span className='hidden sm:inline'>Download</span>
                          </a>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${window.location.origin}/materials/${material.id}`,
                              );
                              // Add toast here
                            }}
                            className='inline-flex items-center justify-center px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all'
                          >
                            <Share2 className='h-4 w-4 sm:mr-2' />
                            <span className='hidden sm:inline'>Share</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className='lg:col-span-1 space-y-6'>
          <div className='bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-6'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center'>
              <Hash className='w-5 h-5 mr-2 text-primary-500' />
              Popular Topics
            </h3>
            <div className='flex flex-wrap gap-2'>
              {topics.length > 0 ? (
                topics.map((t) => (
                  <span
                    key={t.topic}
                    className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors border border-primary-100 dark:border-primary-800'
                    onClick={() => setSearchQuery(t.topic)}
                  >
                    {t.topic}
                    <span className='ml-1.5 text-primary-400 dark:text-primary-500 text-[10px] font-bold'>
                      {t.count}
                    </span>
                  </span>
                ))
              ) : (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  No topics extracted yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
