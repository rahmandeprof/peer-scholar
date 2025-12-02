import { useCallback, useEffect, useState } from 'react';

import api from '../lib/api';
import { Department, Faculty, School } from '../types/academic';

export function useAcademic() {
  const [schools, setSchools] = useState<School[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const fetchSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const { data } = await api.get<School[]>('/academic/schools');

      setSchools(data);
    } catch (error) {
      console.error('Failed to fetch schools', error);
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const fetchFaculties = useCallback(async (schoolId: string) => {
    if (!schoolId) {
      setFaculties([]);

      return;
    }
    setLoadingFaculties(true);
    try {
      const { data } = await api.get<Faculty[]>(
        `/academic/schools/${schoolId}/faculties`,
      );

      setFaculties(data);
    } catch (error) {
      console.error('Failed to fetch faculties', error);
    } finally {
      setLoadingFaculties(false);
    }
  }, []);

  const fetchDepartments = useCallback(async (facultyId: string) => {
    if (!facultyId) {
      setDepartments([]);

      return;
    }
    setLoadingDepartments(true);
    try {
      const { data } = await api.get<Department[]>(
        `/academic/faculties/${facultyId}/departments`,
      );

      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments', error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchools();
  }, [fetchSchools]);

  return {
    schools,
    faculties,
    departments,
    loadingSchools,
    loadingFaculties,
    loadingDepartments,
    fetchFaculties,
    fetchDepartments,
  };
}
