import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../lib/api';
import { FileText, Download, ArrowLeft, Filter, Search, Hash } from 'lucide-react';
import { format } from 'date-fns';

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
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase());
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
    return <div className="p-8 text-center">Loading course materials...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {course?.code} - {course?.title}
        </h1>
        <p className="mt-2 text-gray-600">Course Materials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="note">Notes</option>
                <option value="slide">Slides</option>
                <option value="past_question">Past Questions</option>
              </select>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredMaterials.length === 0 ? (
                <li className="px-6 py-12 text-center text-gray-500">
                  No materials found matching your criteria.
                </li>
              ) : (
                filteredMaterials.map((material) => (
                  <li key={material.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-indigo-600" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 px-4">
                            <div>
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {material.title}
                              </p>
                              <p className="mt-1 flex items-center text-sm text-gray-500">
                                <span className="truncate">{material.description}</span>
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                              <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100">
                                {material.type.replace('_', ' ')}
                              </span>
                              <span>{formatFileSize(material.size)}</span>
                              <span>
                                Uploaded by {material.uploader.firstName} {material.uploader.lastName}
                              </span>
                              <span>{format(new Date(material.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex space-x-2">
                          <Link
                            to={`/materials/${material.id}`}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Study with AI
                          </Link>
                          <a
                            href={material.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </a>
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
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Hash className="w-5 h-5 mr-2 text-indigo-500" />
              Popular Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {topics.length > 0 ? (
                topics.map((t) => (
                  <span
                    key={t.topic}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200"
                    onClick={() => setSearchQuery(t.topic)}
                  >
                    {t.topic}
                    <span className="ml-1.5 text-indigo-400 text-[10px]">{t.count}</span>
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No topics extracted yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


