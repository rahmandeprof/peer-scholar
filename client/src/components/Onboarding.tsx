import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface School {
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

const Onboarding: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchFaculties(selectedSchool);
      setFaculties([]);
      setDepartments([]);
      setSelectedFaculty('');
      setSelectedDepartment('');
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedFaculty) {
      fetchDepartments(selectedFaculty);
      setDepartments([]);
      setSelectedDepartment('');
    }
  }, [selectedFaculty]);

  const fetchSchools = async () => {
    try {
      const res = await axios.get('/academic/schools');
      setSchools(res.data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
    }
  };

  const fetchFaculties = async (schoolId: string) => {
    try {
      const res = await axios.get(`/academic/schools/${schoolId}/faculties`);
      setFaculties(res.data);
    } catch (error) {
      console.error('Failed to fetch faculties', error);
    }
  };

  const fetchDepartments = async (facultyId: string) => {
    try {
      const res = await axios.get(`/academic/faculties/${facultyId}/departments`);
      setDepartments(res.data);
    } catch (error) {
      console.error('Failed to fetch departments', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/users/onboarding', {
        schoolId: selectedSchool,
        facultyId: selectedFaculty,
        departmentId: selectedDepartment,
        yearOfStudy,
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete your profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Tell us where you study so we can connect you with your peers.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="school" className="block text-sm font-medium text-gray-700">
                School
              </label>
              <select
                id="school"
                required
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                <option value="">Select a school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="faculty" className="block text-sm font-medium text-gray-700">
                Faculty
              </label>
              <select
                id="faculty"
                required
                disabled={!selectedSchool}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
              >
                <option value="">Select a faculty</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department"
                required
                disabled={!selectedFaculty}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">Select a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year of Study
              </label>
              <input
                id="year"
                type="number"
                min="1"
                max="6"
                required
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
