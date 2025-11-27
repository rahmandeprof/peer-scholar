import { useState, useEffect } from 'react';
import { FileText, Download, Search, BookOpen, Upload, SortAsc, SortDesc } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

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

export function CommunityMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/chat/materials');
      setMaterials(res.data.filter((m: Material) => m.isPublic));
    } catch (err) {
      console.error('Failed to fetch materials', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', 'course_material');
    formData.append('isPublic', 'true'); // Explicitly public

    setUploading(true);
    try {
      await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Material shared with community successfully!');
      fetchMaterials(); // Refresh list
    } catch (err) {
      console.error('Failed to upload material', err);
      toast.error('Failed to upload material.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

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
        comparison = a.yearLevel - b.yearLevel;
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to desc for new field
    }
  };

  return (
    <div className="h-full p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <BookOpen className="w-8 h-8 mr-3 text-primary-600" />
              Community Materials
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Access resources shared by students in your department
            </p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
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
            
            <button
              onClick={() => document.getElementById('community-upload')?.click()}
              disabled={uploading}
              className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              Share
            </button>
            <input
              type="file"
              id="community-upload"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <button 
            onClick={() => toggleSort('createdAt')}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortField === 'createdAt' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            Date {sortField === 'createdAt' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1"/> : <SortDesc className="w-4 h-4 ml-1"/>)}
          </button>
          <button 
            onClick={() => toggleSort('title')}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortField === 'title' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            Title {sortField === 'title' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1"/> : <SortDesc className="w-4 h-4 ml-1"/>)}
          </button>
          <button 
            onClick={() => toggleSort('yearLevel')}
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortField === 'yearLevel' 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            Year {sortField === 'yearLevel' && (sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1"/> : <SortDesc className="w-4 h-4 ml-1"/>)}
          </button>
        </div>

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
              <div key={material.id} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {material.category === 'past_question' ? 'Past Question' : 'Course Material'}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {material.title}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium mr-2">Dept:</span> {material.department || 'General'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium mr-2">Level:</span> Year {material.yearLevel || 'All'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-500 text-xs mt-1">
                    {new Date(material.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button 
                  onClick={() => window.open(material.url, '_blank')}
                  className="w-full py-2 flex items-center justify-center text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Access Material
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
