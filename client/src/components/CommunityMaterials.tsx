import { useState, useEffect } from 'react';
import { FileText, Download, Search, BookOpen, SortAsc, SortDesc, MessageSquare } from 'lucide-react';
import api from '../lib/api';

interface Material {
  id: string;
  title: string;
  department: string;
  yearLevel: number;
  category: string;
  createdAt: string;
  isPublic: boolean;
  url: string;
}

type SortField = 'createdAt' | 'title' | 'yearLevel';
type SortOrder = 'asc' | 'desc';

interface CommunityMaterialsProps {
  onChat?: (materialId: string) => void;
}

export function CommunityMaterials({ onChat }: CommunityMaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/chat/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to fetch materials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = materials
    .filter(m => 
      m.title.toLowerCase().includes(filter.toLowerCase()) ||
      m.department?.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'yearLevel') {
        comparison = (a.yearLevel || 0) - (b.yearLevel || 0);
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-primary-600" />
              Community Materials
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Access resources shared by other students
            </p>
          </div>
          
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search materials..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 mt-6 text-sm text-gray-500 overflow-x-auto pb-2">
          <span className="font-medium">Sort by:</span>
          <button 
            onClick={() => toggleSort('createdAt')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'createdAt' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Date
            {sortField === 'createdAt' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
          </button>
          <button 
            onClick={() => toggleSort('title')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'title' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Title
            {sortField === 'title' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
          </button>
          <button 
            onClick={() => toggleSort('yearLevel')}
            className={`flex items-center px-3 py-1 rounded-lg transition-colors ${sortField === 'yearLevel' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Year Level
            {sortField === 'yearLevel' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">No materials found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Be the first to share something with the community!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                    {material.category.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {material.title}
                </h3>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="w-20">Dept:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{material.department || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="w-20">Year:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{material.yearLevel || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="w-20">Date:</span>
                    <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                  {onChat && (
                    <button
                      onClick={() => onChat(material.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
