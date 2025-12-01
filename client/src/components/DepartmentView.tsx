import React, { useState, useEffect } from 'react';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, FileText, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

const DepartmentView: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingMaterials, setTrendingMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (user?.department?.id) {
      fetchCourses(user.department.id);
      fetchTrending();
    }
  }, [user]);

  const fetchCourses = async (departmentId: string) => {
    try {
      const res = await axios.get(`/academic/departments/${departmentId}/courses`);
      setCourses(res.data);
    } catch (error) {
      console.error('Failed to fetch courses', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await axios.get('/materials/trending');
      setTrendingMaterials(res.data);
    } catch (error) {
      console.error('Failed to fetch trending materials', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading department data...</div>;
  }

  if (!user?.department) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">You haven't joined a department yet.</p>
        <Link to="/onboarding" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Complete your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.department.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {user.faculty?.name} • {user.school?.name}
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Material
        </Link>
      </div>

      {trendingMaterials.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <span className="bg-orange-100 text-orange-600 p-1 rounded mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.45-.412-1.725a1 1 0 00-1.457-.895c-.33.183-.65.41-.955.68-.306.27-.596.58-.86.926-.525.688-.9 1.536-1.002 2.406-.102.87.088 1.836.537 2.725.45.89 1.16 1.652 2.048 2.086.89.434 1.954.567 3.03.392 1.077-.176 2.09-.675 2.864-1.412.774-.737 1.285-1.706 1.447-2.774.162-1.068-.013-2.168-.5-3.134-.486-.966-1.266-1.75-2.232-2.235a1 1 0 01-.447-1.054c.06-.276.156-.545.283-.795.127-.25.29-.48.486-.67.393-.38.896-.64 1.408-.735a1 1 0 01.65.053 1 1 0 01.447.447c.2.4.3.85.3 1.302 0 .45-.1.9-.3 1.302a1 1 0 001.79 1.79c.4-.8.6-1.7.6-2.604 0-.904-.2-1.808-.6-2.604-.4-.8-1-1.4-1.8-1.8-.8-.4-1.7-.6-2.604-.6z" clipRule="evenodd" />
              </svg>
            </span>
            Trending Now
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {trendingMaterials.map((material) => (
              <div key={material.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate" title={material.title}>
                        {material.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {material.course?.code}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {material.type}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="truncate">By {material.uploader?.firstName} {material.uploader?.lastName}</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
                  <Link
                    to={`/materials/${material.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                  >
                    Study Now
                    <FileText className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Courses</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {course.code}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {course.title}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
              <div className="text-sm">
                <Link
                  to={`/courses/${course.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                >
                  View Materials
                  <FileText className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentView;
