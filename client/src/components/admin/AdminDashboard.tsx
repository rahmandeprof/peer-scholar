import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Flag,
  Trash2,
  Eye,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  FileText,
  User,
  PlayCircle,
  Clock,
  Users,
  BookOpen,
  Brain,
  AlertOctagon,
  Server,
  Zap,
  Search,
  MessageSquare,
  Trophy,
  Upload,
  UserPlus,
  Flame,
  Copy,
  Building,
  Pencil,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { BorderSpinner } from '../Skeleton';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../ConfirmationModal';

interface FlaggedMaterial {
  id: string;
  title: string;
  flagCount: number;
  isHidden: boolean;
  createdAt: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface MaterialFlag {
  id: string;
  reason: string;
  description?: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [materials, setMaterials] = useState<FlaggedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] =
    useState<FlaggedMaterial | null>(null);
  const [flags, setFlags] = useState<MaterialFlag[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Stuck materials state
  const [stuckCount, setStuckCount] = useState(0);
  const [staleCount, setStaleCount] = useState(0);
  const [activeProcessingCount, setActiveProcessingCount] = useState(0);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessingStale, setReprocessingStale] = useState(false);
  const [lastReprocessResult, setLastReprocessResult] = useState<{
    count: number;
    failed: number;
  } | null>(null);

  // Stats state
  const [stats, setStats] = useState<{
    users: { total: number };
    materials: {
      total: number;
      ready: number;
      processing: number;
      failed: number;
      missingSummary: number;
    };
    quizzes: { taken: number };
  } | null>(null);

  // Queue status state
  const [queueStatus, setQueueStatus] = useState<{
    counts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  } | null>(null);

  // Backfill state
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    total: number;
  } | null>(null);

  // Failed materials reprocess state
  const [failedCount, setFailedCount] = useState(0);
  const [reprocessingFailed, setReprocessingFailed] = useState(false);

  // Reports state
  const [reports, setReports] = useState<
    {
      id: string;
      reason: string;
      description?: string;
      createdAt: string;
      material: { id: string; title: string } | null;
      reporter: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }[]
  >([]);
  const [showReports, setShowReports] = useState(false);

  // Force reprocess state
  const [forceReprocessing, setForceReprocessing] = useState(false);
  const [materialIdInput, setMaterialIdInput] = useState('');
  const [materialLookupLoading, setMaterialLookupLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<{
    last30Days: { users: number; materials: number; quizzes: number };
    topUploaders: { firstName: string; lastName: string; count: number }[];
    materialsByStatus: Record<string, number>;
  } | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<{
    recentMaterialActivity: {
      id: string;
      title: string;
      status: string;
      processingStatus: string;
      updatedAt: string;
    }[];
    recentQuizzes: {
      id: string;
      userName: string;
      materialTitle: string;
      score: number;
      totalQuestions: number;
      createdAt: string;
    }[];
  } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Bulk delete state
  const [bulkDeleteIds, setBulkDeleteIds] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    deleted: string[];
    errors: { id: string; error: string }[];
  } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Queue management state
  const [clearingCompleted, setClearingCompleted] = useState(false);
  const [clearingFailed, setClearingFailed] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [queueLastUpdated, setQueueLastUpdated] = useState<Date | null>(null);

  // Failed jobs debugging state
  const [failedJobs, setFailedJobs] = useState<
    {
      id: string;
      name: string;
      data: { materialId?: string };
      failedReason: string;
      stacktrace: string[];
      attemptsMade: number;
      timestamp: number;
    }[]
  >([]);
  const [failedJobsLoading, setFailedJobsLoading] = useState(false);
  const [showFailedJobs, setShowFailedJobs] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState<
    {
      id: string;
      message: string;
      userEmail: string;
      userName: string | null;
      createdAt: string;
      isRead: boolean;
    }[]
  >([]);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  // Leaderboards state
  const [leaderboards, setLeaderboards] = useState<{
    reputation: { id: string; name: string; email: string; value: number }[];
    uploaders: { id: string; name: string; email: string; value: number }[];
    referrers: { id: string; name: string; email: string; value: number }[];
    streaks: {
      id: string;
      name: string;
      email: string;
      value: number;
      longest: number;
    }[];
  } | null>(null);
  const [showLeaderboards, setShowLeaderboards] = useState(false);
  const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);

  // Materials Visibility state
  const [allMaterials, setAllMaterials] = useState<
    {
      id: string;
      title: string;
      scope: string;
      type: string;
      status: string;
      createdAt: string;
      uploader: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
      course: {
        id: string;
        title: string;
        department: { id: string; name: string } | null;
      } | null;
    }[]
  >([]);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [materialsTotalPages, setMaterialsTotalPages] = useState(1);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [showMaterialsManager, setShowMaterialsManager] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [bulkScope, setBulkScope] = useState('department');
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  // University seeding state
  const [showUniversities, setShowUniversities] = useState(false);
  const [schools, setSchools] = useState<
    {
      id: string;
      name: string;
      country: string;
      facultyCount: number;
      userCount: number;
      materialCount: number;
    }[]
  >([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [seedForm, setSeedForm] = useState({
    schoolName: '',
    country: 'Nigeria',
    facultyName: '',
    departments: '',
  });
  const [seeding, setSeeding] = useState(false);

  // University CRUD state
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<
    {
      id: string;
      name: string;
      departmentCount?: number;
    }[]
  >([]);
  const [facultiesLoading, setFacultiesLoading] = useState(false);
  const [expandedFacultyId, setExpandedFacultyId] = useState<string | null>(
    null,
  );
  const [departments, setDepartments] = useState<
    {
      id: string;
      name: string;
    }[]
  >([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [editingSchool, setEditingSchool] = useState<{
    id: string;
    name: string;
    country: string;
  } | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [addingFaculty, setAddingFaculty] = useState<string | null>(null); // schoolId
  const [newFacultyName, setNewFacultyName] = useState('');
  const [addingDepartment, setAddingDepartment] = useState<string | null>(null); // facultyId
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [savingEntity, setSavingEntity] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/dashboard');
    }
  }, [user, navigate, toast]);

  const fetchFlaggedMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/materials/admin/flagged');
      setMaterials(res.data);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to load flagged materials',
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStuckCount = async () => {
    try {
      const res = await api.get('/admin/stuck-materials/count');
      // Handle both old format (count) and new format (pending, stale, total)
      if (typeof res.data.total !== 'undefined') {
        setStuckCount(res.data.pending || 0);
        setStaleCount(res.data.stale || 0);
        setActiveProcessingCount(res.data.activeProcessing || 0);
      } else {
        setStuckCount(res.data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch stuck count:', err);
    }
  };

  /**
   * Fetch all admin overview data in one batched call
   * Combines stats, queue status, and stuck count for faster dashboard load
   */
  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/overview');
      const {
        stats: statsData,
        stuckCount: stuckData,
        queueStatus: queueData,
      } = res.data;

      // Set stats
      setStats(statsData);
      setFailedCount(statsData.materials?.failed || 0);

      // Set stuck count
      setStuckCount(stuckData || 0);

      // Set queue status
      if (queueData) {
        setQueueStatus({ success: true, ...queueData });
        setQueueLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
      // Fallback to individual fetches if overview fails
      fetchStats();
      fetchStuckCount();
      fetchQueueStatus();
    }
  };

  const handleReprocessStuck = async () => {
    setReprocessing(true);
    setLastReprocessResult(null);
    try {
      const res = await api.post('/admin/reprocess-stuck');
      toast.success(res.data.message);
      setLastReprocessResult({
        count: res.data.count,
        failed: res.data.failed,
      });
      fetchStuckCount();
      fetchStats();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to reprocess materials',
      );
    } finally {
      setReprocessing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
      setFailedCount(res.data.materials?.failed || 0);
      // Also fetch quiz stats
      fetchQuizStats();
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const res = await api.get('/admin/queue-status');
      if (res.data.success) {
        setQueueStatus(res.data);
        setQueueLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    }
  };

  const fetchQuizStats = async () => {
    try {
      const res = await api.get('/admin/quiz-stats');
      // Update stats with quiz count
      setStats((prev) => ({
        ...prev!,
        quizzes: { taken: res.data.total },
      }));
      // Update logs with recent quizzes
      setLogs((prev) => ({
        ...prev!,
        recentQuizzes: res.data.recentQuizzes,
      }));
    } catch (err) {
      console.error('Failed to fetch quiz stats:', err);
    }
  };

  const handleClearCompleted = async () => {
    setClearingCompleted(true);
    try {
      await api.post('/admin/queue/clear-completed');
      toast.success('Completed jobs cleared');
      fetchQueueStatus();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to clear completed jobs',
      );
    } finally {
      setClearingCompleted(false);
    }
  };

  const handleClearFailed = async () => {
    setClearingFailed(true);
    try {
      await api.post('/admin/queue/clear-failed');
      toast.success('Failed jobs cleared');
      fetchQueueStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear failed jobs');
    } finally {
      setClearingFailed(false);
    }
  };

  const handleRetryFailed = async () => {
    setRetryingFailed(true);
    try {
      const res = await api.post('/admin/queue/retry-failed');
      toast.success(res.data.message || 'Retried failed jobs');
      fetchQueueStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to retry failed jobs');
    } finally {
      setRetryingFailed(false);
    }
  };

  const fetchFailedJobs = async () => {
    setFailedJobsLoading(true);
    try {
      const res = await api.get('/admin/queue/failed-jobs');
      if (res.data.success) {
        setFailedJobs(res.data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch failed jobs:', err);
      toast.error('Failed to fetch failed jobs');
    } finally {
      setFailedJobsLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    try {
      const res = await api.get('/feedback');
      setFeedbacks(res.data.feedbacks || []);
      setUnreadFeedbackCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch feedbacks:', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  const handleToggleFeedbackRead = async (id: string) => {
    try {
      const res = await api.patch(`/feedback/${id}/read`);
      // Update local state
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isRead: res.data.isRead } : f)),
      );
      // Update unread count
      setUnreadFeedbackCount((prev) => (res.data.isRead ? prev - 1 : prev + 1));
    } catch (err) {
      toast.error('Failed to update feedback status');
    }
  };

  const handleBackfillSummaries = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await api.post('/admin/backfill-summaries', { limit: 10 });
      toast.success(res.data.message);
      setBackfillResult({
        processed: res.data.processed,
        total: res.data.total,
      });
      fetchStats();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to backfill summaries',
      );
    } finally {
      setBackfilling(false);
    }
  };

  const fetchLeaderboards = async () => {
    setLeaderboardsLoading(true);
    try {
      const res = await api.get('/users/admin/leaderboards');
      setLeaderboards(res.data);
    } catch (err) {
      toast.error('Failed to fetch leaderboards');
    } finally {
      setLeaderboardsLoading(false);
    }
  };

  const fetchAllMaterials = async (page = 1) => {
    setMaterialsLoading(true);
    try {
      const res = await api.get(`/materials/admin/all?page=${page}&limit=50`);
      setAllMaterials(res.data.data);
      setMaterialsPage(res.data.page);
      setMaterialsTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error('Failed to fetch materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleBulkVisibilityUpdate = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.error('Select at least one material');
      return;
    }
    setUpdatingVisibility(true);
    try {
      const res = await api.patch('/materials/admin/bulk-visibility', {
        materialIds: selectedMaterialIds,
        scope: bulkScope,
      });
      toast.success(`Updated ${res.data.updated} materials to ${bulkScope}`);
      setSelectedMaterialIds([]);
      fetchAllMaterials(materialsPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAllMaterials = () => {
    if (selectedMaterialIds.length === allMaterials.length) {
      setSelectedMaterialIds([]);
    } else {
      setSelectedMaterialIds(allMaterials.map((m) => m.id));
    }
  };

  const fetchSchools = async () => {
    setSchoolsLoading(true);
    try {
      const res = await api.get('/admin/schools');
      setSchools(res.data.schools || []);
    } catch (err) {
      toast.error('Failed to fetch schools');
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleSeedUniversity = async () => {
    const departments = seedForm.departments
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    if (
      !seedForm.schoolName ||
      !seedForm.facultyName ||
      departments.length === 0
    ) {
      toast.error('Please fill all fields');
      return;
    }

    setSeeding(true);
    try {
      const res = await api.post('/admin/schools/seed', {
        schoolName: seedForm.schoolName,
        country: seedForm.country,
        facultyName: seedForm.facultyName,
        departments,
      });
      toast.success(res.data.message);
      setSeedForm({
        schoolName: '',
        country: 'Nigeria',
        facultyName: '',
        departments: '',
      });
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  // Fetch faculties for a school
  const fetchFaculties = async (schoolId: string) => {
    setFacultiesLoading(true);
    try {
      const res = await api.get(`/admin/schools/${schoolId}/faculties`);
      setFaculties(res.data.faculties || []);
    } catch (err) {
      toast.error('Failed to fetch faculties');
    } finally {
      setFacultiesLoading(false);
    }
  };

  // Fetch departments for a faculty
  const fetchDepartments = async (facultyId: string) => {
    setDepartmentsLoading(true);
    try {
      const res = await api.get(`/admin/faculties/${facultyId}/departments`);
      setDepartments(res.data.departments || []);
    } catch (err) {
      toast.error('Failed to fetch departments');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Toggle school expansion
  const toggleSchoolExpand = (schoolId: string) => {
    if (expandedSchoolId === schoolId) {
      setExpandedSchoolId(null);
      setFaculties([]);
      setExpandedFacultyId(null);
      setDepartments([]);
    } else {
      setExpandedSchoolId(schoolId);
      setExpandedFacultyId(null);
      setDepartments([]);
      fetchFaculties(schoolId);
    }
  };

  // Toggle faculty expansion
  const toggleFacultyExpand = (facultyId: string) => {
    if (expandedFacultyId === facultyId) {
      setExpandedFacultyId(null);
      setDepartments([]);
    } else {
      setExpandedFacultyId(facultyId);
      fetchDepartments(facultyId);
    }
  };

  // Update school
  const handleUpdateSchool = async () => {
    if (!editingSchool) return;
    setSavingEntity(true);
    try {
      await api.patch(`/admin/schools/${editingSchool.id}`, {
        name: editingSchool.name,
        country: editingSchool.country,
      });
      toast.success('School updated');
      setEditingSchool(null);
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update school');
    } finally {
      setSavingEntity(false);
    }
  };

  // Delete school
  const handleDeleteSchool = async (schoolId: string) => {
    if (!confirm('Are you sure? This will delete the school.')) return;
    try {
      await api.delete(`/admin/schools/${schoolId}`);
      toast.success('School deleted');
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete school');
    }
  };

  // Create faculty
  const handleCreateFaculty = async (schoolId: string) => {
    if (!newFacultyName.trim()) return;
    setSavingEntity(true);
    try {
      await api.post('/admin/faculties', { name: newFacultyName, schoolId });
      toast.success('Faculty created');
      setNewFacultyName('');
      setAddingFaculty(null);
      fetchFaculties(schoolId);
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create faculty');
    } finally {
      setSavingEntity(false);
    }
  };

  // Update faculty
  const handleUpdateFaculty = async () => {
    if (!editingFaculty) return;
    setSavingEntity(true);
    try {
      await api.patch(`/admin/faculties/${editingFaculty.id}`, {
        name: editingFaculty.name,
      });
      toast.success('Faculty updated');
      setEditingFaculty(null);
      if (expandedSchoolId) fetchFaculties(expandedSchoolId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update faculty');
    } finally {
      setSavingEntity(false);
    }
  };

  // Delete faculty
  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm('Are you sure? This will delete the faculty.')) return;
    try {
      await api.delete(`/admin/faculties/${facultyId}`);
      toast.success('Faculty deleted');
      if (expandedSchoolId) fetchFaculties(expandedSchoolId);
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete faculty');
    }
  };

  // Create department
  const handleCreateDepartment = async (facultyId: string) => {
    if (!newDepartmentName.trim()) return;
    setSavingEntity(true);
    try {
      await api.post('/admin/departments', {
        name: newDepartmentName,
        facultyId,
      });
      toast.success('Department created');
      setNewDepartmentName('');
      setAddingDepartment(null);
      fetchDepartments(facultyId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    } finally {
      setSavingEntity(false);
    }
  };

  // Update department
  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;
    setSavingEntity(true);
    try {
      await api.patch(`/admin/departments/${editingDepartment.id}`, {
        name: editingDepartment.name,
      });
      toast.success('Department updated');
      setEditingDepartment(null);
      if (expandedFacultyId) fetchDepartments(expandedFacultyId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update department');
    } finally {
      setSavingEntity(false);
    }
  };

  // Delete department
  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Are you sure? This will delete the department.')) return;
    try {
      await api.delete(`/admin/departments/${departmentId}`);
      toast.success('Department deleted');
      if (expandedFacultyId) fetchDepartments(expandedFacultyId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete department');
    }
  };

  const handleReprocessFailed = async () => {
    setReprocessingFailed(true);
    try {
      const res = await api.post('/admin/reprocess-failed');
      toast.success(res.data.message);
      fetchStats();
      fetchStuckCount();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to reprocess failed materials',
      );
    } finally {
      setReprocessingFailed(false);
    }
  };

  const handleReprocessStale = async () => {
    setReprocessingStale(true);
    try {
      const res = await api.post('/admin/reprocess-stale', {
        staleMinutes: 30,
      });
      toast.success(res.data.message);
      fetchStats();
      fetchStuckCount();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to reprocess stale materials',
      );
    } finally {
      setReprocessingStale(false);
    }
  };

  const handleForceReprocess = async () => {
    if (!materialIdInput.trim()) {
      toast.error('Please enter a material ID');
      return;
    }
    setForceReprocessing(true);
    try {
      const res = await api.post(
        `/admin/materials/${materialIdInput}/force-reprocess`,
      );
      toast.success(res.data.message);
      setMaterialIdInput('');
      fetchStats();
      fetchStuckCount();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to force reprocess material',
      );
    } finally {
      setForceReprocessing(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data.reports);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const handleClearMaterialCache = async () => {
    if (!materialIdInput.trim()) {
      toast.error('Please enter a material ID');
      return;
    }
    setClearingCache(true);
    try {
      const res = await api.post(
        `/admin/materials/${materialIdInput}/clear-cache`,
      );
      toast.success(res.data.message);
      setMaterialIdInput('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  const handleViewSegments = async () => {
    if (!materialIdInput.trim()) {
      toast.error('Please enter a material ID');
      return;
    }
    setMaterialLookupLoading(true);
    try {
      const res = await api.get(`/admin/materials/${materialIdInput}/segments`);
      toast.success(
        `Found ${res.data.segmentCount} segments (${res.data.totalTokens} tokens)`,
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Material not found');
    } finally {
      setMaterialLookupLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleBulkDelete = async () => {
    const ids = bulkDeleteIds
      .split(/[,\n]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) return;

    setBulkDeleting(true);
    setBulkDeleteResult(null);
    try {
      const res = await api.post('/admin/bulk-delete', { materialIds: ids });
      setBulkDeleteResult(res.data);
      if (res.data.deleted.length > 0) {
        toast.success(`Deleted ${res.data.deleted.length} material(s)`);
        setBulkDeleteIds('');
        fetchFlaggedMaterials(); // Refresh lists
        fetchStats();
      }
      if (res.data.errors.length > 0) {
        toast.warning(`${res.data.errors.length} deletion(s) failed`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  useEffect(() => {
    fetchFlaggedMaterials();
    fetchOverview(); // Batched endpoint for stats, stuck count, queue status
    fetchReports();
    fetchAnalytics();
    fetchLogs();

    // Queue status polling - pauses when tab is hidden
    let interval: ReturnType<typeof setInterval> | null = setInterval(
      fetchQueueStatus,
      30000,
    );

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - stop polling
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        // Tab visible - resume polling
        if (!interval) {
          fetchQueueStatus(); // Immediate refresh on return
          interval = setInterval(fetchQueueStatus, 30000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Refresh all dashboard data
  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFlaggedMaterials(),
        fetchOverview(), // Batched endpoint for stats, stuck count, queue status
        fetchReports(),
        fetchAnalytics(),
        fetchLogs(),
      ]);
      toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error('Failed to refresh some data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlags = async (materialId: string) => {
    setLoadingFlags(true);
    try {
      const res = await api.get(`/materials/admin/${materialId}/flags`);
      setFlags(res.data);
    } catch (err) {
      toast.error('Failed to load flag details');
    } finally {
      setLoadingFlags(false);
    }
  };

  const handleSelectMaterial = (material: FlaggedMaterial) => {
    setSelectedMaterial(material);
    fetchFlags(material.id);
  };

  const handleDismissFlags = async (materialId: string) => {
    setActionLoading(materialId);
    try {
      await api.post(`/materials/admin/${materialId}/dismiss-flags`);
      toast.success('Flags dismissed, material unhidden');
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      if (selectedMaterial?.id === materialId) {
        setSelectedMaterial(null);
        setFlags([]);
      }
    } catch (err) {
      toast.error('Failed to dismiss flags');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceDelete = async (materialId: string) => {
    setActionLoading(materialId);
    try {
      await api.delete(`/materials/admin/${materialId}/force`);
      toast.success('Material permanently deleted');
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      if (selectedMaterial?.id === materialId) {
        setSelectedMaterial(null);
        setFlags([]);
      }
    } catch (err) {
      toast.error('Failed to delete material');
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      wrong_content: 'Wrong Content',
      low_quality: 'Low Quality',
      duplicate: 'Duplicate',
      inappropriate: 'Inappropriate',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center'>
            <div className='w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3'>
              <Shield className='w-5 h-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                Admin Dashboard
              </h1>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Manage flagged content
              </p>
            </div>
          </div>
          <button
            onClick={refreshAll}
            disabled={loading}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50'
            title='Refresh all data'
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className='max-w-7xl mx-auto p-4 space-y-6'>
        {/* Stats Grid */}
        {stats && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                  <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {stats.users.total}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Total Users
                  </p>
                </div>
              </div>
            </div>
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                  <BookOpen className='w-5 h-5 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {stats.materials.total}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Materials ({stats.materials.ready} ready)
                  </p>
                </div>
              </div>
            </div>
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center'>
                  <Brain className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {stats.quizzes.taken}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Quizzes Taken
                  </p>
                </div>
              </div>
            </div>
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
                  <AlertOctagon className='w-5 h-5 text-red-600 dark:text-red-400' />
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {stats.materials.failed}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Failed Processing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Status & Actions Row */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Queue Status */}
          {queueStatus && (
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <Server className='w-4 h-4 text-gray-500' />
                  <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                    Queue Status
                  </h3>
                </div>
                <div className='flex items-center gap-2'>
                  {queueLastUpdated && (
                    <span className='text-xs text-gray-400'>
                      {queueLastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={fetchQueueStatus}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
                    title='Refresh queue status'
                  >
                    <RefreshCw className='w-3 h-3 text-gray-400' />
                  </button>
                </div>
              </div>
              <div className='grid grid-cols-4 gap-2 text-center mb-3'>
                <div className='p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg'>
                  <p className='text-lg font-bold text-yellow-600 dark:text-yellow-400'>
                    {queueStatus.counts.waiting}
                  </p>
                  <p className='text-xs text-gray-500'>Waiting</p>
                </div>
                <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                  <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                    {queueStatus.counts.active}
                  </p>
                  <p className='text-xs text-gray-500'>Active</p>
                </div>
                <div className='p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                  <p className='text-lg font-bold text-green-600 dark:text-green-400'>
                    {queueStatus.counts.completed}
                  </p>
                  <p className='text-xs text-gray-500'>Completed</p>
                </div>
                <div className='p-2 bg-red-50 dark:bg-red-900/20 rounded-lg'>
                  <p className='text-lg font-bold text-red-600 dark:text-red-400'>
                    {queueStatus.counts.failed}
                  </p>
                  <p className='text-xs text-gray-500'>Failed</p>
                </div>
              </div>
              {/* Queue Actions */}
              <div className='flex flex-wrap gap-2'>
                {queueStatus.counts.completed > 0 && (
                  <button
                    onClick={handleClearCompleted}
                    disabled={clearingCompleted}
                    className='text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 flex items-center gap-1'
                  >
                    {clearingCompleted ? (
                      <BorderSpinner size='xs' />
                    ) : (
                      <Trash2 className='w-3 h-3' />
                    )}
                    Clear Done
                  </button>
                )}
                {queueStatus.counts.failed > 0 && (
                  <>
                    <button
                      onClick={handleRetryFailed}
                      disabled={retryingFailed}
                      className='text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 flex items-center gap-1'
                    >
                      {retryingFailed ? (
                        <BorderSpinner size='xs' />
                      ) : (
                        <RefreshCw className='w-3 h-3' />
                      )}
                      Retry Failed
                    </button>
                    <button
                      onClick={handleClearFailed}
                      disabled={clearingFailed}
                      className='text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 flex items-center gap-1'
                    >
                      {clearingFailed ? (
                        <BorderSpinner size='xs' />
                      ) : (
                        <Trash2 className='w-3 h-3' />
                      )}
                      Clear Failed
                    </button>
                    <button
                      onClick={() => {
                        setShowFailedJobs(!showFailedJobs);
                        if (!showFailedJobs) fetchFailedJobs();
                      }}
                      className='text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1'
                    >
                      <Eye className='w-3 h-3' />
                      {showFailedJobs ? 'Hide' : 'View'} Details
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Failed Jobs Debug Panel */}
          {showFailedJobs && queueStatus && queueStatus.counts.failed > 0 && (
            <div className='md:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <AlertTriangle className='w-4 h-4 text-red-500' />
                  <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                    Failed Jobs ({failedJobs.length})
                  </h3>
                </div>
                <button
                  onClick={fetchFailedJobs}
                  disabled={failedJobsLoading}
                  className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
                >
                  <RefreshCw
                    className={`w-3 h-3 text-gray-400 ${failedJobsLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              {failedJobsLoading ? (
                <div className='flex justify-center py-4'>
                  <BorderSpinner size='sm' />
                </div>
              ) : failedJobs.length === 0 ? (
                <p className='text-sm text-gray-500 text-center py-4'>
                  No failed jobs found
                </p>
              ) : (
                <div className='space-y-2 max-h-[400px] overflow-y-auto'>
                  {failedJobs.map((job) => (
                    <div
                      key={job.id}
                      className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
                    >
                      <button
                        onClick={() =>
                          setExpandedJobId(
                            expandedJobId === job.id ? null : job.id,
                          )
                        }
                        className='w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                      >
                        <div className='flex items-center gap-3 text-left'>
                          <span className='text-xs font-mono text-gray-500'>
                            #{job.id}
                          </span>
                          <span className='text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]'>
                            {job.failedReason || 'Unknown error'}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs text-gray-400'>
                            {job.attemptsMade} attempts
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-gray-400 transition-transform ${expandedJobId === job.id ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </button>
                      {expandedJobId === job.id && (
                        <div className='px-3 py-2 bg-white dark:bg-gray-900 text-xs space-y-2'>
                          <div className='flex items-center justify-between mb-2'>
                            <span className='text-gray-500 font-medium'>
                              Job Details
                            </span>
                            <button
                              onClick={() => {
                                const logText = `Job ID: ${job.id}\nMaterial ID: ${job.data?.materialId || 'N/A'}\nAttempts: ${job.attemptsMade}\n\nError:\n${job.failedReason}\n\n${job.stacktrace && job.stacktrace.length > 0 ? `Stack Trace:\n${job.stacktrace.join('\n')}` : ''}`;
                                navigator.clipboard.writeText(logText);
                                toast.success('Error logs copied to clipboard');
                              }}
                              className='flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors'
                              title='Copy error logs'
                            >
                              <Copy className='w-3 h-3' />
                              Copy Logs
                            </button>
                          </div>
                          <div>
                            <span className='text-gray-500'>Material ID:</span>{' '}
                            <span className='font-mono text-gray-700 dark:text-gray-300'>
                              {job.data?.materialId || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className='text-gray-500'>Error:</span>
                            <pre className='mt-1 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded overflow-x-auto whitespace-pre-wrap'>
                              {job.failedReason}
                            </pre>
                          </div>
                          {job.stacktrace && job.stacktrace.length > 0 && (
                            <div>
                              <span className='text-gray-500'>
                                Stack Trace:
                              </span>
                              <pre className='mt-1 p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded overflow-x-auto text-[10px] max-h-[150px] overflow-y-auto'>
                                {job.stacktrace.join('\n')}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Backfill Summaries */}
          <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <Zap className='w-4 h-4 text-amber-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                Backfill Summaries
              </h3>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-3'>
              {stats?.materials.missingSummary || 0} materials need summaries
            </p>
            <button
              onClick={handleBackfillSummaries}
              disabled={
                backfilling || (stats?.materials.missingSummary || 0) === 0
              }
              className='w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2'
            >
              {backfilling ? (
                <BorderSpinner size='sm' />
              ) : (
                <Zap className='w-4 h-4' />
              )}
              {backfilling ? 'Generating...' : 'Generate 10'}
            </button>
            {backfillResult && (
              <p className='mt-2 text-xs text-green-600 dark:text-green-400'>
                ✓ Generated {backfillResult.processed}/{backfillResult.total}
              </p>
            )}
          </div>

          {/* Reprocess Failed */}
          <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <AlertOctagon className='w-4 h-4 text-red-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                Failed Materials
              </h3>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-3'>
              {failedCount} materials failed processing
            </p>
            <button
              onClick={handleReprocessFailed}
              disabled={reprocessingFailed || failedCount === 0}
              className='w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2'
            >
              {reprocessingFailed ? (
                <BorderSpinner size='sm' />
              ) : (
                <RefreshCw className='w-4 h-4' />
              )}
              {reprocessingFailed ? 'Reprocessing...' : 'Retry All'}
            </button>
          </div>
        </div>

        {/* Material Lookup Card */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <Search className='w-4 h-4 text-gray-500' />
            <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
              Material Actions
            </h3>
          </div>
          <div className='space-y-2'>
            <input
              type='text'
              value={materialIdInput}
              onChange={(e) => setMaterialIdInput(e.target.value)}
              placeholder='Material ID (UUID)'
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
            />
            <div className='flex gap-2'>
              <button
                onClick={handleViewSegments}
                disabled={materialLookupLoading}
                className='flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1'
              >
                {materialLookupLoading ? (
                  <BorderSpinner size='sm' />
                ) : (
                  'Segments'
                )}
              </button>
              <button
                onClick={handleClearMaterialCache}
                disabled={clearingCache}
                className='flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1'
              >
                {clearingCache ? <BorderSpinner size='sm' /> : 'Clear Cache'}
              </button>
            </div>
            <button
              onClick={handleForceReprocess}
              disabled={forceReprocessing || !materialIdInput.trim()}
              className='w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1'
            >
              {forceReprocessing ? (
                <BorderSpinner size='sm' />
              ) : (
                <RefreshCw className='w-4 h-4' />
              )}
              {forceReprocessing ? 'Processing...' : 'Force Reprocess'}
            </button>
          </div>
        </div>

        {/* Reports Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <button
            onClick={() => setShowReports(!showReports)}
            className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
          >
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-orange-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                Material Reports ({reports.length})
              </h3>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${showReports ? 'rotate-90' : ''}`}
            />
          </button>
          {showReports && reports.length > 0 && (
            <div className='border-t border-gray-100 dark:border-gray-800 max-h-64 overflow-y-auto'>
              {reports.map((report) => (
                <div
                  key={report.id}
                  className='p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0'
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-sm font-medium text-gray-900 dark:text-white'>
                      {report.reason}
                    </span>
                    <span className='text-xs text-gray-500'>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {report.description && (
                    <p className='text-xs text-gray-600 dark:text-gray-400 mb-1'>
                      {report.description}
                    </p>
                  )}
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    <span>{report.material?.title || 'Unknown material'}</span>
                    <span>•</span>
                    <span>
                      by {report.reporter?.firstName}{' '}
                      {report.reporter?.lastName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showReports && reports.length === 0 && (
            <div className='p-4 text-center text-gray-500 text-sm'>
              No reports found
            </div>
          )}
        </div>

        {/* Feedbacks Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <button
            onClick={() => {
              setShowFeedbacks(!showFeedbacks);
              if (!showFeedbacks && feedbacks.length === 0) {
                fetchFeedbacks();
              }
            }}
            className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
          >
            <div className='flex items-center gap-2'>
              <MessageSquare className='w-4 h-4 text-green-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                User Feedbacks ({feedbacks.length})
              </h3>
              {unreadFeedbackCount > 0 && (
                <span className='px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full'>
                  {unreadFeedbackCount}
                </span>
              )}
            </div>
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${showFeedbacks ? 'rotate-90' : ''}`}
            />
          </button>
          {showFeedbacks && feedbacksLoading && (
            <div className='p-4 text-center'>
              <BorderSpinner size='md' className='mx-auto text-gray-400' />
            </div>
          )}
          {showFeedbacks && !feedbacksLoading && feedbacks.length > 0 && (
            <div className='border-t border-gray-100 dark:border-gray-800 max-h-80 overflow-y-auto'>
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    !feedback.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => handleToggleFeedbackRead(feedback.id)}
                  title={
                    feedback.isRead
                      ? 'Click to mark as unread'
                      : 'Click to mark as read'
                  }
                >
                  <div className='flex items-center justify-between mb-1'>
                    <div className='flex items-center gap-2'>
                      {!feedback.isRead && (
                        <span className='w-2 h-2 bg-blue-500 rounded-full' />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          !feedback.isRead
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {feedback.userName || 'Anonymous'}
                      </span>
                    </div>
                    <span className='text-xs text-gray-500'>
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className={`text-sm mb-2 whitespace-pre-wrap ${
                      !feedback.isRead
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-500 dark:text-gray-500'
                    }`}
                  >
                    {feedback.message}
                  </p>
                  <div className='text-xs text-gray-400'>
                    {feedback.userEmail}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showFeedbacks && !feedbacksLoading && feedbacks.length === 0 && (
            <div className='p-4 text-center text-gray-500 text-sm'>
              No feedbacks yet
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
          >
            <div className='flex items-center gap-2'>
              <Zap className='w-4 h-4 text-purple-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                Analytics (Last 30 Days)
              </h3>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${showAnalytics ? 'rotate-90' : ''}`}
            />
          </button>
          {showAnalytics && analytics && (
            <div className='border-t border-gray-100 dark:border-gray-800 p-4 space-y-4'>
              {/* 30-Day Stats */}
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                  <p className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                    {analytics.last30Days.users}
                  </p>
                  <p className='text-xs text-gray-500'>New Users</p>
                </div>
                <div className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                  <p className='text-xl font-bold text-green-600 dark:text-green-400'>
                    {analytics.last30Days.materials}
                  </p>
                  <p className='text-xs text-gray-500'>Materials</p>
                </div>
                <div className='p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
                  <p className='text-xl font-bold text-purple-600 dark:text-purple-400'>
                    {analytics.last30Days.quizzes}
                  </p>
                  <p className='text-xs text-gray-500'>Quizzes</p>
                </div>
              </div>
              {/* Top Uploaders */}
              {analytics.topUploaders.length > 0 && (
                <div>
                  <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2'>
                    Top Uploaders
                  </h4>
                  <div className='space-y-1'>
                    {analytics.topUploaders.slice(0, 3).map((u, i) => (
                      <div
                        key={i}
                        className='flex items-center justify-between text-sm'
                      >
                        <span className='text-gray-700 dark:text-gray-300'>
                          {u.firstName} {u.lastName}
                        </span>
                        <span className='font-medium text-gray-900 dark:text-white'>
                          {u.count} uploads
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
          >
            <div className='flex items-center gap-2'>
              <FileText className='w-4 h-4 text-gray-500' />
              <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                Activity Logs
              </h3>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${showLogs ? 'rotate-90' : ''}`}
            />
          </button>
          {showLogs && logs && (
            <div className='border-t border-gray-100 dark:border-gray-800 max-h-80 overflow-y-auto'>
              {/* Recent Quiz Results */}
              {logs.recentQuizzes.length > 0 && (
                <div className='p-4 border-b border-gray-100 dark:border-gray-800'>
                  <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2'>
                    Recent Quizzes
                  </h4>
                  <div className='space-y-2'>
                    {logs.recentQuizzes.slice(0, 5).map((q) => (
                      <div
                        key={q.id}
                        className='flex items-center justify-between text-xs'
                      >
                        <div className='flex-1 min-w-0'>
                          <span className='text-gray-700 dark:text-gray-300 truncate block'>
                            {q.userName}
                          </span>
                          <span className='text-gray-500 truncate block'>
                            {q.materialTitle}
                          </span>
                        </div>
                        <span
                          className={`font-medium ml-2 ${q.score >= q.totalQuestions / 2 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {q.score}/{q.totalQuestions}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Recent Material Activity */}
              {logs.recentMaterialActivity.length > 0 && (
                <div className='p-4'>
                  <h4 className='text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2'>
                    Recent Materials
                  </h4>
                  <div className='space-y-2'>
                    {logs.recentMaterialActivity.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className='flex items-center justify-between text-xs'
                      >
                        <span className='text-gray-700 dark:text-gray-300 truncate flex-1'>
                          {m.title}
                        </span>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                            m.processingStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : m.processingStatus === 'FAILED'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {m.processingStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-center'>
              <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'>
                <Clock className='w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400' />
              </div>
              <div>
                <h2 className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                  Stuck Materials
                </h2>
                <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                  {stuckCount} pending • {staleCount} stale (&gt;30min) •{' '}
                  {activeProcessingCount} active
                </p>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={handleReprocessStuck}
                disabled={reprocessing || stuckCount === 0}
                className='flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors'
              >
                {reprocessing ? (
                  <BorderSpinner size='sm' />
                ) : (
                  <PlayCircle className='w-4 h-4' />
                )}
                {reprocessing ? 'Processing...' : 'Pending'}
              </button>
              <button
                onClick={handleReprocessStale}
                disabled={reprocessingStale || staleCount === 0}
                className='flex-1 sm:flex-none px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors'
              >
                {reprocessingStale ? (
                  <BorderSpinner size='sm' />
                ) : (
                  <RefreshCw className='w-4 h-4' />
                )}
                {reprocessingStale ? 'Processing...' : 'Stale'}
              </button>
            </div>
          </div>
          {lastReprocessResult && (
            <div className='mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-xs sm:text-sm'>
              ✓ Queued {lastReprocessResult.count} materials
              {lastReprocessResult.failed > 0 && (
                <span className='text-red-500 ml-2'>
                  ({lastReprocessResult.failed} failed)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bulk Delete Section */}
        <div className='bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/50 p-4 sm:p-6 shadow-sm'>
          <div className='flex items-center mb-4'>
            <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0'>
              <Trash2 className='w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <h2 className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                Bulk Delete Materials
              </h2>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                Delete multiple materials by ID (max 50)
              </p>
            </div>
          </div>

          <textarea
            value={bulkDeleteIds}
            onChange={(e) => setBulkDeleteIds(e.target.value)}
            placeholder='Enter material IDs (one per line or comma-separated)\ne.g.:\nuuid-1\nuuid-2\nor: uuid-1, uuid-2, uuid-3'
            className='w-full h-32 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-500 outline-none'
          />

          <div className='flex flex-col sm:flex-row gap-2 mt-3'>
            <button
              onClick={() => {
                const ids = bulkDeleteIds
                  .split(/[,\n]+/)
                  .map((id) => id.trim())
                  .filter((id) => id.length > 0);
                if (ids.length === 0) {
                  toast.warning('Please enter at least one material ID');
                  return;
                }
                if (ids.length > 50) {
                  toast.warning('Maximum 50 IDs allowed at once');
                  return;
                }
                setShowBulkDeleteConfirm(true);
              }}
              disabled={bulkDeleting || !bulkDeleteIds.trim()}
              className='flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors'
            >
              {bulkDeleting ? (
                <BorderSpinner size='sm' />
              ) : (
                <Trash2 className='w-4 h-4' />
              )}
              {bulkDeleting ? 'Deleting...' : 'Delete Materials'}
            </button>
            <button
              onClick={() => {
                setBulkDeleteIds('');
                setBulkDeleteResult(null);
              }}
              className='px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
            >
              Clear
            </button>
          </div>

          {bulkDeleteResult && (
            <div className='mt-3 space-y-2'>
              {bulkDeleteResult.deleted.length > 0 && (
                <div className='p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-xs sm:text-sm'>
                  ✓ Successfully deleted {bulkDeleteResult.deleted.length}{' '}
                  material(s)
                </div>
              )}
              {bulkDeleteResult.errors.length > 0 && (
                <div className='p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-xs sm:text-sm'>
                  ✗ Failed:{' '}
                  {bulkDeleteResult.errors
                    .map((e) => `${e.id} (${e.error})`)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Flagged Materials List */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
            <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex items-center'>
              <Flag className='w-5 h-5 text-red-500 mr-2' />
              <h2 className='font-bold text-gray-900 dark:text-white'>
                Flagged Materials ({materials.length})
              </h2>
            </div>

            {loading ? (
              <div className='p-8 flex justify-center'>
                <BorderSpinner size='lg' className='text-primary-600' />
              </div>
            ) : materials.length === 0 ? (
              <div className='p-8 text-center'>
                <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Shield className='w-8 h-8 text-green-600 dark:text-green-400' />
                </div>
                <p className='text-gray-500 dark:text-gray-400'>
                  No flagged materials. All clear!
                </p>
              </div>
            ) : (
              <div className='divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto'>
                {materials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => handleSelectMaterial(material)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      selectedMaterial?.id === material.id
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : ''
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          <FileText className='w-4 h-4 text-gray-400 flex-shrink-0' />
                          <h3 className='font-medium text-gray-900 dark:text-white truncate'>
                            {material.title}
                          </h3>
                        </div>
                        <div className='flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400'>
                          <span className='flex items-center'>
                            <User className='w-3 h-3 mr-1' />
                            {material.uploader.firstName}{' '}
                            {material.uploader.lastName}
                          </span>
                          <span className='flex items-center text-red-500'>
                            <Flag className='w-3 h-3 mr-1' />
                            {material.flagCount} flags
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {material.isHidden && (
                          <span className='px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full'>
                            Hidden
                          </span>
                        )}
                        <ChevronRight className='w-4 h-4 text-gray-400' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Flag Details Panel */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
            {!selectedMaterial ? (
              <div className='p-8 text-center h-full flex flex-col items-center justify-center'>
                <AlertTriangle className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-4' />
                <p className='text-gray-500 dark:text-gray-400'>
                  Select a material to view details
                </p>
              </div>
            ) : (
              <>
                <div className='p-4 border-b border-gray-100 dark:border-gray-800'>
                  <h2 className='font-bold text-gray-900 dark:text-white mb-1'>
                    {selectedMaterial.title}
                  </h2>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    By {selectedMaterial.uploader.firstName}{' '}
                    {selectedMaterial.uploader.lastName}
                  </p>
                </div>

                {/* Actions */}
                <div className='p-4 border-b border-gray-100 dark:border-gray-800 flex gap-2'>
                  <button
                    onClick={() =>
                      navigate(`/materials/${selectedMaterial.id}`)
                    }
                    className='flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm flex items-center justify-center'
                  >
                    <Eye className='w-4 h-4 mr-2' />
                    View
                  </button>
                  <button
                    onClick={() => handleDismissFlags(selectedMaterial.id)}
                    disabled={actionLoading === selectedMaterial.id}
                    className='flex-1 px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg font-medium text-sm flex items-center justify-center disabled:opacity-50'
                  >
                    {actionLoading === selectedMaterial.id ? (
                      <BorderSpinner size='sm' />
                    ) : (
                      <>
                        <XCircle className='w-4 h-4 mr-2' />
                        Dismiss
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(selectedMaterial.id)}
                    className='flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-medium text-sm flex items-center justify-center'
                  >
                    <Trash2 className='w-4 h-4 mr-2' />
                    Delete
                  </button>
                </div>

                {/* Flags List */}
                <div className='p-4'>
                  <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3'>
                    Reports ({flags.length})
                  </h3>
                  {loadingFlags ? (
                    <div className='flex justify-center py-4'>
                      <BorderSpinner size='lg' className='text-primary-600' />
                    </div>
                  ) : (
                    <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                      {flags.map((flag) => (
                        <div
                          key={flag.id}
                          className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'
                        >
                          <div className='flex items-center justify-between mb-1'>
                            <span className='text-sm font-medium text-gray-900 dark:text-white'>
                              {getReasonLabel(flag.reason)}
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                              {new Date(flag.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {flag.description && (
                            <p className='text-sm text-gray-600 dark:text-gray-300 mb-2'>
                              {flag.description}
                            </p>
                          )}
                          <p className='text-xs text-gray-400'>
                            by {flag.user.firstName} {flag.user.lastName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboards Section */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
        <button
          onClick={() => {
            setShowLeaderboards(!showLeaderboards);
            if (!leaderboards && !leaderboardsLoading) {
              fetchLeaderboards();
            }
          }}
          className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
        >
          <div className='flex items-center gap-2'>
            <Trophy className='w-4 h-4 text-yellow-500' />
            <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
              Leaderboards
            </h3>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${showLeaderboards ? 'rotate-90' : ''}`}
          />
        </button>
        {showLeaderboards && (
          <div className='border-t border-gray-100 dark:border-gray-800 p-4'>
            {leaderboardsLoading ? (
              <div className='flex justify-center py-4'>
                <BorderSpinner size='md' className='text-gray-400' />
              </div>
            ) : leaderboards ? (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Top Reputation */}
                <div className='bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-3'>
                  <h4 className='text-xs font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1'>
                    <Trophy className='w-3 h-3' /> Top Reputation
                  </h4>
                  <div className='space-y-1'>
                    {leaderboards.reputation.slice(0, 5).map((u, i) => (
                      <div key={u.id} className='flex justify-between text-xs'>
                        <span className='text-gray-700 dark:text-gray-300 truncate'>
                          {i + 1}. {u.name}
                        </span>
                        <span className='font-bold text-purple-600 dark:text-purple-400'>
                          {u.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Uploaders */}
                <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-3'>
                  <h4 className='text-xs font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1'>
                    <Upload className='w-3 h-3' /> Top Uploaders
                  </h4>
                  <div className='space-y-1'>
                    {leaderboards.uploaders.slice(0, 5).map((u, i) => (
                      <div
                        key={u.id || i}
                        className='flex justify-between text-xs'
                      >
                        <span className='text-gray-700 dark:text-gray-300 truncate'>
                          {i + 1}. {u.name}
                        </span>
                        <span className='font-bold text-blue-600 dark:text-blue-400'>
                          {u.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Referrers */}
                <div className='bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-3'>
                  <h4 className='text-xs font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1'>
                    <UserPlus className='w-3 h-3' /> Top Referrers
                  </h4>
                  <div className='space-y-1'>
                    {leaderboards.referrers.slice(0, 5).map((u, i) => (
                      <div
                        key={u.id || i}
                        className='flex justify-between text-xs'
                      >
                        <span className='text-gray-700 dark:text-gray-300 truncate'>
                          {i + 1}. {u.name}
                        </span>
                        <span className='font-bold text-green-600 dark:text-green-400'>
                          {u.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Streaks */}
                <div className='bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-lg p-3'>
                  <h4 className='text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1'>
                    <Flame className='w-3 h-3' /> Top Streaks
                  </h4>
                  <div className='space-y-1'>
                    {leaderboards.streaks.slice(0, 5).map((u, i) => (
                      <div
                        key={u.id || i}
                        className='flex justify-between text-xs'
                      >
                        <span className='text-gray-700 dark:text-gray-300 truncate'>
                          {i + 1}. {u.name}
                        </span>
                        <span className='font-bold text-orange-600 dark:text-orange-400'>
                          {u.value} 🔥
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className='text-sm text-gray-500 text-center'>
                No data available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Materials Visibility Manager Section */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
        <button
          onClick={() => {
            setShowMaterialsManager(!showMaterialsManager);
            if (!allMaterials.length && !materialsLoading) {
              fetchAllMaterials(1);
            }
          }}
          className='w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50'
        >
          <div className='flex items-center gap-2'>
            <Eye className='w-4 h-4 text-blue-500' />
            <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
              Materials Visibility Manager
            </h3>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${showMaterialsManager ? 'rotate-90' : ''}`}
          />
        </button>
        {showMaterialsManager && (
          <div className='border-t border-gray-100 dark:border-gray-800 p-4'>
            {materialsLoading ? (
              <div className='flex justify-center py-4'>
                <BorderSpinner />
              </div>
            ) : allMaterials.length > 0 ? (
              <div className='space-y-4'>
                {/* Bulk Actions */}
                <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    {selectedMaterialIds.length} selected
                  </span>
                  <select
                    value={bulkScope}
                    onChange={(e) => setBulkScope(e.target.value)}
                    className='text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  >
                    <option value='public'>Public</option>
                    <option value='faculty'>Faculty</option>
                    <option value='department'>Department</option>
                    <option value='course'>Course</option>
                    <option value='private'>Private</option>
                  </select>
                  <button
                    onClick={handleBulkVisibilityUpdate}
                    disabled={
                      updatingVisibility || selectedMaterialIds.length === 0
                    }
                    className='px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
                  >
                    {updatingVisibility ? 'Updating...' : 'Set Visibility'}
                  </button>
                </div>

                {/* Materials Table */}
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='bg-gray-50 dark:bg-gray-800'>
                        <th className='p-2 text-left'>
                          <input
                            type='checkbox'
                            checked={
                              selectedMaterialIds.length === allMaterials.length
                            }
                            onChange={selectAllMaterials}
                            className='rounded'
                          />
                        </th>
                        <th className='p-2 text-left text-gray-700 dark:text-gray-300'>
                          Title
                        </th>
                        <th className='p-2 text-left text-gray-700 dark:text-gray-300'>
                          Scope
                        </th>
                        <th className='p-2 text-left text-gray-700 dark:text-gray-300'>
                          Uploader
                        </th>
                        <th className='p-2 text-left text-gray-700 dark:text-gray-300'>
                          Course
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMaterials.map((m) => (
                        <tr
                          key={m.id}
                          className='border-t border-gray-100 dark:border-gray-800'
                        >
                          <td className='p-2'>
                            <input
                              type='checkbox'
                              checked={selectedMaterialIds.includes(m.id)}
                              onChange={() => toggleMaterialSelection(m.id)}
                              className='rounded'
                            />
                          </td>
                          <td
                            className='p-2 text-gray-900 dark:text-white max-w-xs truncate'
                            title={m.title}
                          >
                            {m.title}
                          </td>
                          <td className='p-2'>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                m.scope === 'public'
                                  ? 'bg-green-100 text-green-800'
                                  : m.scope === 'department'
                                    ? 'bg-blue-100 text-blue-800'
                                    : m.scope === 'faculty'
                                      ? 'bg-purple-100 text-purple-800'
                                      : m.scope === 'course'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {m.scope || 'private'}
                            </span>
                          </td>
                          <td className='p-2 text-gray-600 dark:text-gray-400'>
                            {m.uploader
                              ? `${m.uploader.firstName} ${m.uploader.lastName}`
                              : '-'}
                          </td>
                          <td className='p-2 text-gray-600 dark:text-gray-400'>
                            {m.course?.title || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className='flex justify-between items-center'>
                  <button
                    onClick={() => fetchAllMaterials(materialsPage - 1)}
                    disabled={materialsPage <= 1}
                    className='px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50'
                  >
                    Previous
                  </button>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Page {materialsPage} of {materialsTotalPages}
                  </span>
                  <button
                    onClick={() => fetchAllMaterials(materialsPage + 1)}
                    disabled={materialsPage >= materialsTotalPages}
                    className='px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50'
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <p className='text-sm text-gray-500 text-center'>
                No materials found
              </p>
            )}
          </div>
        )}

        {/* Universities Management Section */}
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
          <button
            onClick={() => {
              setShowUniversities(!showUniversities);
              if (!showUniversities) fetchSchools();
            }}
            className='w-full flex items-center justify-between'
          >
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center'>
                <Building className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
              </div>
              <div className='text-left'>
                <h3 className='font-semibold text-gray-900 dark:text-white'>
                  Universities
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Manage schools, faculties & departments
                </p>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${showUniversities ? 'rotate-90' : ''}`}
            />
          </button>

          {showUniversities && (
            <div className='mt-4 space-y-4'>
              {/* Seeding Form */}
              <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg'>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
                  Quick Add University Data
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      University Name
                    </label>
                    <input
                      type='text'
                      value={seedForm.schoolName}
                      onChange={(e) =>
                        setSeedForm({ ...seedForm, schoolName: e.target.value })
                      }
                      placeholder='e.g. Usmanu Danfodiyo University'
                      className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Country
                    </label>
                    <input
                      type='text'
                      value={seedForm.country}
                      onChange={(e) =>
                        setSeedForm({ ...seedForm, country: e.target.value })
                      }
                      placeholder='Nigeria'
                      className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Faculty Name
                    </label>
                    <input
                      type='text'
                      value={seedForm.facultyName}
                      onChange={(e) =>
                        setSeedForm({
                          ...seedForm,
                          facultyName: e.target.value,
                        })
                      }
                      placeholder='e.g. Faculty of Science'
                      className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Departments (one per line)
                    </label>
                    <textarea
                      value={seedForm.departments}
                      onChange={(e) =>
                        setSeedForm({
                          ...seedForm,
                          departments: e.target.value,
                        })
                      }
                      placeholder={'Physics\nChemistry\nMathematics\nBiology'}
                      rows={4}
                      className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    />
                  </div>
                </div>
                <button
                  onClick={handleSeedUniversity}
                  disabled={seeding}
                  className='mt-3 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2'
                >
                  {seeding ? (
                    <BorderSpinner size='xs' />
                  ) : (
                    <Upload className='w-4 h-4' />
                  )}
                  Add University Data
                </button>
              </div>

              {/* Schools List */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                    Universities ({schools.length})
                  </h4>
                  <button
                    onClick={fetchSchools}
                    disabled={schoolsLoading}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded'
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-400 ${schoolsLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>

                {schoolsLoading ? (
                  <div className='flex justify-center py-4'>
                    <BorderSpinner size='sm' />
                  </div>
                ) : schools.length === 0 ? (
                  <p className='text-sm text-gray-500 text-center py-4'>
                    No universities found
                  </p>
                ) : (
                  <div className='space-y-2'>
                    {schools.map((school) => (
                      <div
                        key={school.id}
                        className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'
                      >
                        {/* School Row */}
                        <div className='flex items-center justify-between p-3 bg-white dark:bg-gray-900'>
                          <button
                            onClick={() => toggleSchoolExpand(school.id)}
                            className='flex items-center gap-2 flex-1 text-left'
                          >
                            <ChevronDown
                              className={`w-4 h-4 text-gray-400 transition-transform ${expandedSchoolId === school.id ? '' : '-rotate-90'}`}
                            />
                            <div>
                              {editingSchool?.id === school.id ? (
                                <div
                                  className='flex items-center gap-2'
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type='text'
                                    value={editingSchool.name}
                                    onChange={(e) =>
                                      setEditingSchool({
                                        ...editingSchool,
                                        name: e.target.value,
                                      })
                                    }
                                    className='px-2 py-1 text-sm border rounded'
                                  />
                                  <input
                                    type='text'
                                    value={editingSchool.country}
                                    onChange={(e) =>
                                      setEditingSchool({
                                        ...editingSchool,
                                        country: e.target.value,
                                      })
                                    }
                                    className='px-2 py-1 text-sm border rounded w-24'
                                  />
                                  <button
                                    onClick={handleUpdateSchool}
                                    disabled={savingEntity}
                                    className='px-2 py-1 bg-green-600 text-white text-xs rounded'
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSchool(null)}
                                    className='px-2 py-1 bg-gray-400 text-white text-xs rounded'
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <p className='font-medium text-gray-900 dark:text-white'>
                                    {school.name}
                                  </p>
                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                    {school.country}
                                  </p>
                                </>
                              )}
                            </div>
                          </button>
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center gap-4 text-xs text-gray-500'>
                              <span>{school.facultyCount} fac</span>
                              <span>{school.userCount} users</span>
                            </div>
                            {!editingSchool && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSchool({
                                      id: school.id,
                                      name: school.name,
                                      country: school.country,
                                    });
                                  }}
                                  className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded'
                                >
                                  <Pencil className='w-4 h-4 text-gray-400' />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSchool(school.id);
                                  }}
                                  className='p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded'
                                >
                                  <Trash2 className='w-4 h-4 text-red-400' />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Faculties */}
                        {expandedSchoolId === school.id && (
                          <div className='border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-2'>
                            {facultiesLoading ? (
                              <div className='flex justify-center py-2'>
                                <BorderSpinner size='xs' />
                              </div>
                            ) : (
                              <>
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                                    Faculties ({faculties.length})
                                  </span>
                                  <button
                                    onClick={() => {
                                      setAddingFaculty(school.id);
                                      setNewFacultyName('');
                                    }}
                                    className='text-xs text-indigo-600 hover:underline flex items-center gap-1'
                                  >
                                    <Plus className='w-3 h-3' /> Add Faculty
                                  </button>
                                </div>
                                {addingFaculty === school.id && (
                                  <div className='flex items-center gap-2 mb-2 p-2 bg-white dark:bg-gray-700 rounded'>
                                    <input
                                      type='text'
                                      value={newFacultyName}
                                      onChange={(e) =>
                                        setNewFacultyName(e.target.value)
                                      }
                                      placeholder='Faculty name'
                                      className='flex-1 px-2 py-1 text-sm border rounded'
                                    />
                                    <button
                                      onClick={() =>
                                        handleCreateFaculty(school.id)
                                      }
                                      disabled={savingEntity}
                                      className='px-2 py-1 bg-indigo-600 text-white text-xs rounded'
                                    >
                                      {savingEntity ? (
                                        <BorderSpinner size='xs' />
                                      ) : (
                                        'Add'
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setAddingFaculty(null)}
                                      className='text-gray-400 text-xs'
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                {faculties.length === 0 && !addingFaculty ? (
                                  <p className='text-xs text-gray-500 py-2'>
                                    No faculties
                                  </p>
                                ) : (
                                  <div className='space-y-1'>
                                    {faculties.map((fac) => (
                                      <div
                                        key={fac.id}
                                        className='border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700'
                                      >
                                        {/* Faculty Row */}
                                        <div className='flex items-center justify-between p-2'>
                                          <button
                                            onClick={() =>
                                              toggleFacultyExpand(fac.id)
                                            }
                                            className='flex items-center gap-2 flex-1 text-left'
                                          >
                                            <ChevronDown
                                              className={`w-3 h-3 text-gray-400 transition-transform ${expandedFacultyId === fac.id ? '' : '-rotate-90'}`}
                                            />
                                            {editingFaculty?.id === fac.id ? (
                                              <div
                                                className='flex items-center gap-2'
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <input
                                                  type='text'
                                                  value={editingFaculty.name}
                                                  onChange={(e) =>
                                                    setEditingFaculty({
                                                      ...editingFaculty,
                                                      name: e.target.value,
                                                    })
                                                  }
                                                  className='px-2 py-1 text-sm border rounded'
                                                />
                                                <button
                                                  onClick={handleUpdateFaculty}
                                                  disabled={savingEntity}
                                                  className='px-2 py-1 bg-green-600 text-white text-xs rounded'
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setEditingFaculty(null)
                                                  }
                                                  className='text-gray-400 text-xs'
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            ) : (
                                              <span className='text-sm text-gray-700 dark:text-gray-200'>
                                                {fac.name}
                                              </span>
                                            )}
                                          </button>
                                          {!editingFaculty && (
                                            <div className='flex items-center gap-1'>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingFaculty({
                                                    id: fac.id,
                                                    name: fac.name,
                                                  });
                                                }}
                                                className='p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded'
                                              >
                                                <Pencil className='w-3 h-3 text-gray-400' />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteFaculty(fac.id);
                                                }}
                                                className='p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded'
                                              >
                                                <Trash2 className='w-3 h-3 text-red-400' />
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Departments */}
                                        {expandedFacultyId === fac.id && (
                                          <div className='border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-3 py-2'>
                                            {departmentsLoading ? (
                                              <div className='flex justify-center py-1'>
                                                <BorderSpinner size='xs' />
                                              </div>
                                            ) : (
                                              <>
                                                <div className='flex items-center justify-between mb-1'>
                                                  <span className='text-xs text-gray-500'>
                                                    Departments (
                                                    {departments.length})
                                                  </span>
                                                  <button
                                                    onClick={() => {
                                                      setAddingDepartment(
                                                        fac.id,
                                                      );
                                                      setNewDepartmentName('');
                                                    }}
                                                    className='text-xs text-indigo-600 hover:underline flex items-center gap-1'
                                                  >
                                                    <Plus className='w-3 h-3' />{' '}
                                                    Add
                                                  </button>
                                                </div>
                                                {addingDepartment ===
                                                  fac.id && (
                                                  <div className='flex items-center gap-2 mb-2 p-2 bg-white dark:bg-gray-700 rounded'>
                                                    <input
                                                      type='text'
                                                      value={newDepartmentName}
                                                      onChange={(e) =>
                                                        setNewDepartmentName(
                                                          e.target.value,
                                                        )
                                                      }
                                                      placeholder='Department name'
                                                      className='flex-1 px-2 py-1 text-sm border rounded'
                                                    />
                                                    <button
                                                      onClick={() =>
                                                        handleCreateDepartment(
                                                          fac.id,
                                                        )
                                                      }
                                                      disabled={savingEntity}
                                                      className='px-2 py-1 bg-indigo-600 text-white text-xs rounded'
                                                    >
                                                      {savingEntity ? (
                                                        <BorderSpinner size='xs' />
                                                      ) : (
                                                        'Add'
                                                      )}
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        setAddingDepartment(
                                                          null,
                                                        )
                                                      }
                                                      className='text-gray-400 text-xs'
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                )}
                                                {departments.length === 0 &&
                                                !addingDepartment ? (
                                                  <p className='text-xs text-gray-500'>
                                                    No departments
                                                  </p>
                                                ) : (
                                                  <div className='space-y-1'>
                                                    {departments.map((dept) => (
                                                      <div
                                                        key={dept.id}
                                                        className='flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded'
                                                      >
                                                        {editingDepartment?.id ===
                                                        dept.id ? (
                                                          <div className='flex items-center gap-2 flex-1'>
                                                            <input
                                                              type='text'
                                                              value={
                                                                editingDepartment.name
                                                              }
                                                              onChange={(e) =>
                                                                setEditingDepartment(
                                                                  {
                                                                    ...editingDepartment,
                                                                    name: e
                                                                      .target
                                                                      .value,
                                                                  },
                                                                )
                                                              }
                                                              className='flex-1 px-2 py-1 text-sm border rounded'
                                                            />
                                                            <button
                                                              onClick={
                                                                handleUpdateDepartment
                                                              }
                                                              disabled={
                                                                savingEntity
                                                              }
                                                              className='px-2 py-1 bg-green-600 text-white text-xs rounded'
                                                            >
                                                              Save
                                                            </button>
                                                            <button
                                                              onClick={() =>
                                                                setEditingDepartment(
                                                                  null,
                                                                )
                                                              }
                                                              className='text-gray-400 text-xs'
                                                            >
                                                              Cancel
                                                            </button>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            <span className='text-sm text-gray-600 dark:text-gray-300'>
                                                              {dept.name}
                                                            </span>
                                                            <div className='flex items-center gap-1'>
                                                              <button
                                                                onClick={() =>
                                                                  setEditingDepartment(
                                                                    {
                                                                      id: dept.id,
                                                                      name: dept.name,
                                                                    },
                                                                  )
                                                                }
                                                                className='p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded'
                                                              >
                                                                <Pencil className='w-3 h-3 text-gray-400' />
                                                              </button>
                                                              <button
                                                                onClick={() =>
                                                                  handleDeleteDepartment(
                                                                    dept.id,
                                                                  )
                                                                }
                                                                className='p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded'
                                                              >
                                                                <Trash2 className='w-3 h-3 text-red-400' />
                                                              </button>
                                                            </div>
                                                          </>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title='Bulk Delete Materials'
        message={`Are you sure you want to delete ${bulkDeleteIds.split(/[,\n]+/).filter((id) => id.trim()).length} material(s)? This cannot be undone.`}
        confirmText='Delete All'
        isDangerous={true}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleForceDelete(deleteConfirm)}
        title='Delete Material Permanently'
        message='This action cannot be undone. The material and all associated data will be permanently deleted.'
        confirmText='Delete'
        isDangerous={true}
      />
    </div>
  );
}

export default AdminDashboard;
