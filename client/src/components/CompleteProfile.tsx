import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { GraduationCap, Building, School, AlertTriangle } from 'lucide-react';
import { BorderSpinner } from './Skeleton';

interface SchoolData {
  id: string;
  name: string;
}

interface Faculty {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function CompleteProfile() {
  const { user, refreshUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [formData, setFormData] = useState({
    schoolId: '',
    facultyId: '',
    departmentId: '',
    yearOfStudy: 1,
  });

  // Dynamic data from API
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Pre-fill school from user data if available (e.g. from Google Auth + backend link)
  useEffect(() => {
    if (user?.schoolId && !formData.schoolId) {
      setFormData((prev) => ({ ...prev, schoolId: user.schoolId! }));
    }
  }, [user, formData.schoolId]);

  useEffect(() => {
    // If user already has all data, redirect to dashboard
    if (
      !isLoading &&
      user?.school &&
      user?.faculty &&
      user?.department &&
      user?.yearOfStudy
    ) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, isLoading]);

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get('/academic/schools');
        setSchools(res.data);
      } catch (err) {
        console.error('Failed to fetch schools:', err);
        toast.error('Failed to load schools. Please refresh the page.');
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  // Fetch faculties when school changes
  useEffect(() => {
    if (!formData.schoolId) {
      setFaculties([]);
      setDepartments([]);
      return;
    }

    const fetchFaculties = async () => {
      setLoadingFaculties(true);
      setFaculties([]);
      setDepartments([]);
      setFormData((prev) => ({ ...prev, facultyId: '', departmentId: '' }));

      try {
        const res = await api.get(
          `/academic/schools/${formData.schoolId}/faculties`,
        );
        setFaculties(res.data);
      } catch (err) {
        console.error('Failed to fetch faculties:', err);
        toast.error('Failed to load faculties.');
      } finally {
        setLoadingFaculties(false);
      }
    };

    fetchFaculties();
  }, [formData.schoolId]);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (!formData.facultyId) {
      setDepartments([]);
      return;
    }

    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      setDepartments([]);
      setFormData((prev) => ({ ...prev, departmentId: '' }));

      try {
        const res = await api.get(
          `/academic/faculties/${formData.facultyId}/departments`,
        );
        setDepartments(res.data);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        toast.error('Failed to load departments.');
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
  }, [formData.facultyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find the selected names for legacy field compatibility
      const selectedSchool = schools.find((s) => s.id === formData.schoolId);
      const selectedFaculty = faculties.find(
        (f) => f.id === formData.facultyId,
      );
      const selectedDepartment = departments.find(
        (d) => d.id === formData.departmentId,
      );

      await api.patch('/users/academic-profile', {
        schoolId: formData.schoolId,
        facultyId: formData.facultyId,
        departmentId: formData.departmentId,
        // Also send string versions for legacy field compatibility
        school: selectedSchool?.name,
        faculty: selectedFaculty?.name,
        department: selectedDepartment?.name,
        yearOfStudy: formData.yearOfStudy,
      });

      await refreshUser();
      toast.success('Profile completed successfully!');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Failed to complete profile', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isProfileComplete =
    user?.school && user?.faculty && user?.department && user?.yearOfStudy;

  if (isLoading || !user || isProfileComplete) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <BorderSpinner size='lg' className='text-primary-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4'>
      <div className='w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800'>
        <div className='text-center mb-8'>
          <div className='w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
            <GraduationCap className='w-8 h-8 text-primary-600 dark:text-primary-400' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            Welcome to PeerToLearn!
          </h1>
          <p className='text-gray-500 dark:text-gray-400'>
            Let's get you settled. To show you the right notes and quizzes, we
            need to know where you study.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* School */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <School className='w-4 h-4 mr-2 text-gray-400' />
              School
            </label>
            <select
              value={formData.schoolId}
              onChange={(e) =>
                setFormData({ ...formData, schoolId: e.target.value })
              }
              disabled={loadingSchools}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
              required
            >
              <option value=''>
                {loadingSchools ? 'Loading schools...' : 'Select School'}
              </option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Faculty */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <Building className='w-4 h-4 mr-2 text-gray-400' />
              Faculty
            </label>
            <select
              value={formData.facultyId}
              onChange={(e) =>
                setFormData({ ...formData, facultyId: e.target.value })
              }
              disabled={!formData.schoolId || loadingFaculties}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
              required
            >
              <option value=''>
                {loadingFaculties ? 'Loading faculties...' : 'Select Faculty'}
              </option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <Building className='w-4 h-4 mr-2 text-gray-400' />
              Department
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) =>
                setFormData({ ...formData, departmentId: e.target.value })
              }
              disabled={!formData.facultyId || loadingDepartments}
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50'
              required
            >
              <option value=''>
                {loadingDepartments ? 'Loading...' : 'Select Department'}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center'>
              <GraduationCap className='w-4 h-4 mr-2 text-gray-400' />
              Level
            </label>
            <select
              value={formData.yearOfStudy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearOfStudy: parseInt(e.target.value),
                })
              }
              className='w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none'
              required
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  {y}00 Level
                </option>
              ))}
            </select>
          </div>

          {/* Warning Alert */}
          <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start'>
            <div className='p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg mr-3 shrink-0'>
              <AlertTriangle className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
            </div>
            <div>
              <h3 className='text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-1'>
                Please select carefully
              </h3>
              <p className='text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed'>
                To ensure academic integrity, you CANNOT change your School,
                Faculty, or Department later.
              </p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className='flex items-start'>
            <div className='flex items-center h-5'>
              <input
                id='confirm-details'
                type='checkbox'
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className='w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700'
              />
            </div>
            <div className='ml-3 text-sm'>
              <label
                htmlFor='confirm-details'
                className='font-medium text-gray-700 dark:text-gray-300'
              >
                I confirm these details are correct
              </label>
            </div>
          </div>

          <button
            type='submit'
            disabled={loading || !confirmed || !formData.departmentId}
            className='w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20'
          >
            {loading ? <BorderSpinner size='md' /> : 'Finish Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
