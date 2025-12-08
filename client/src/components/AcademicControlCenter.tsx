import { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  BookOpen,
  Flame,
  Upload,
  Users,
  ArrowRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { StudySessionModal } from './StudySessionModal';
import { MaterialCard } from './MaterialCard';
import { FolderCard } from './FolderCard';
import { FolderView } from './FolderView';
import { CollectionModal } from './CollectionModal';
import { Plus } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

interface PartnerStats {
  id: string;
  firstName: string;
  lastName: string;
  currentStreak: number;
  combinedStreak: number;
  image?: string;
}

interface RecentMaterial {
  id: string;
  title: string;
  type: string;
  courseCode?: string;
  viewedAt: string;
}

export function AcademicControlCenter() {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { openUploadModal } = useOutletContext<{
    openUploadModal: () => void;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setCourses] = useState<Course[]>([]);
  const [partners, setPartners] = useState<PartnerStats[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<RecentMaterial[]>([]);
  const [streak, setStreak] = useState(0);
  const [stage, setStage] = useState('Novice');
  const [weeklyStats, setWeeklyStats] = useState({
    current: 0,
    goal: 18000,
    percent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [folderView, setFolderView] = useState<{
    id: string;
    title: string;
    type: 'collection' | 'favorites';
  } | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streakRes, activityRes, weeklyRes] = await Promise.all([
          api.get('/study/streak'),
          api.get('/users/activity/recent'),
          api.get('/study/stats/weekly'),
        ]);

        setStreak(streakRes.data.currentStreak || 0);
        setStage(streakRes.data.stage || 'Novice');

        setWeeklyStats({
          current: weeklyRes.data.totalSeconds,
          goal: weeklyRes.data.goalSeconds,
          percent:
            (weeklyRes.data.totalSeconds / weeklyRes.data.goalSeconds) * 100,
        });

        if (activityRes.data.lastReadMaterial) {
          setRecentMaterials([
            {
              ...activityRes.data.lastReadMaterial,
              viewedAt: new Date().toISOString(), // Or add lastViewedAt to backend
            },
          ]);
        }

        if (user?.department?.id) {
          const coursesRes = await api.get(
            `/academic/departments/${user.department.id}/courses`,
          );
          setCourses(coursesRes.data.slice(0, 4)); // Show top 4 courses
        }

        try {
          const partnerRes = await api.get('/users/partner');
          // Ensure we handle array response
          setPartners(Array.isArray(partnerRes.data) ? partnerRes.data : []);
        } catch {
          // Ignore if no partner
        }

        // Fetch collections
        try {
          const collectionsRes = await api.get('/academic/collections');
          setCollections(collectionsRes.data);
        } catch {
          console.warn('Failed to fetch collections');
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  // Helper to get top partner
  const topPartner = partners.length > 0 ? partners[0] : null;
  const lastOpened = recentMaterials.length > 0 ? recentMaterials[0] : null;

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full overflow-y-auto space-y-8'>
      {/* ... (Header) ... */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight'>
            Academic Control Center
          </h1>
          <p className='text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1'>
            Welcome back, {user?.firstName || 'Student'}. Ready to learn?
          </p>
        </div>
        <div className='flex items-center self-start md:self-auto'>
          <div className='flex items-center bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-orange-100 dark:border-orange-800/30'>
            <Flame
              className='w-4 h-4 md:w-5 md:h-5 text-orange-500 mr-2'
              fill='currentColor'
            />
            <span className='font-bold text-sm md:text-base text-orange-700 dark:text-orange-400'>
              {streak} Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* Hero: Resume Reading / Start Reading */}
      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none' />

        <div className='relative z-10'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
              <Activity className='w-5 h-5 mr-2 text-primary-500' />
              {lastOpened ? 'Resume Reading' : 'Start Reading'}
            </h2>
            {lastOpened && (
              <span className='text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full'>
                Jump back in
              </span>
            )}
          </div>

          {lastOpened ? (
            <div className='flex items-center justify-between mt-4'>
              <div className='cursor-pointer flex-1'>
                <Link to={`/materials/${lastOpened.id}`} className='block'>
                  <h3 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors'>
                    {lastOpened.title}
                  </h3>
                  <p className='text-gray-500 dark:text-gray-400 text-sm line-clamp-1'>
                    {lastOpened.courseCode ? `${lastOpened.courseCode} • ` : ''}
                    {lastOpened.type}
                  </p>
                </Link>
              </div>
              <Link
                to={`/materials/${lastOpened.id}`}
                className='hidden md:flex ml-4 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors items-center shadow-lg shadow-primary-500/20'
              >
                Continue
                <ArrowRight className='w-4 h-4 ml-2' />
              </Link>
            </div>
          ) : (
            <div className='text-center py-8'>
              <p className='text-gray-500 dark:text-gray-400 mb-4'>
                No recent files opened.
              </p>
              <button
                onClick={openUploadModal}
                className='px-6 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20'
              >
                Upload Material
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access: Favorites & Collections */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
            Quick Access
          </h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <FolderCard
            id='favorites'
            title='Favorites'
            count={0} // To implement count logic later
            isFavorite={true}
            compact={true} // Always compact if empty, logic to be refined with real data
            onClick={() =>
              setFolderView({
                id: 'favorites',
                title: 'Favorites',
                type: 'favorites',
              })
            }
          />
          {collections.map((col) => (
            <FolderCard
              key={col.id}
              id={col.id}
              title={col.title}
              count={col.count || 0}
              color={col.color}
              onClick={() =>
                setFolderView({
                  id: col.id,
                  title: col.title,
                  type: 'collection',
                })
              }
            />
          ))}
          {/* Add New Collection Card */}
          <button
            onClick={() => setCollectionModalOpen(true)}
            className='p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800/50 transition-all flex items-center justify-center text-gray-400 hover:text-primary-600 min-h-[80px]'
          >
            <Plus className='w-5 h-5 mr-2' />
            <span className='font-medium text-sm'>New Collection</span>
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Partner Status */}
        <div className='bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-transform h-full'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none' />

          <div className='relative z-10 h-full flex flex-col justify-between'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-bold flex items-center text-white'>
                <Users className='w-5 h-5 mr-2' />
                Partner
              </h2>
              {topPartner && (
                <span className='bg-white/20 px-2 py-1 rounded-lg text-xs font-bold'>
                  {topPartner.combinedStreak} Combined
                </span>
              )}
            </div>

            {topPartner ? (
              <div
                onClick={() => navigate('/study-partner')}
                className='cursor-pointer'
              >
                <div className='text-2xl font-bold mb-1'>
                  {topPartner.firstName}
                  {partners.length > 1 && (
                    <span className='text-sm font-normal opacity-80 ml-2'>
                      +{partners.length - 1} more
                    </span>
                  )}
                </div>
                <div className='flex items-center text-indigo-100 text-sm'>
                  <span className='w-2 h-2 bg-green-400 rounded-full mr-2 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse'></span>
                  {topPartner.currentStreak} day streak
                </div>
              </div>
            ) : (
              <div className='text-center py-4'>
                <p className='text-indigo-100 mb-4 text-sm'>
                  Find a study partner to boost your motivation!
                </p>
                <button
                  onClick={() => navigate('/study-partner')}
                  className='bg-white/20 hover:bg-white/30 transition-colors rounded-lg py-2 px-4 text-sm font-bold text-center w-full'
                >
                  Find Partner
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Heatmap Highlights (Stats) */}
        <div className='md:col-span-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
              <TrendingUp className='w-5 h-5 mr-2 text-green-500' />
              Weekly Goal
            </h2>
            <button
              onClick={() => setStudyModalOpen(true)}
              className='text-sm font-medium text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
            >
              Start Timer
            </button>
          </div>

          <div className='flex items-center space-x-8'>
            {/* Circular Progress */}
            <div className='relative w-32 h-32 flex-shrink-0'>
              <svg className='w-full h-full transform -rotate-90'>
                <circle
                  cx='64'
                  cy='64'
                  r='56'
                  stroke='currentColor'
                  strokeWidth='12'
                  fill='transparent'
                  className='text-gray-200 dark:text-gray-700'
                />
                <circle
                  cx='64'
                  cy='64'
                  r='56'
                  stroke='currentColor'
                  strokeWidth='12'
                  fill='transparent'
                  strokeDasharray={2 * Math.PI * 56}
                  strokeDashoffset={
                    2 *
                    Math.PI *
                    56 *
                    (1 - Math.min(weeklyStats.percent / 100, 1))
                  }
                  className={`transition-all duration-1000 ease-out ${
                    weeklyStats.percent >= 100
                      ? 'text-green-500'
                      : 'text-primary-600'
                  }`}
                  strokeLinecap='round'
                />
              </svg>
              <div className='absolute inset-0 flex flex-col items-center justify-center'>
                <span className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                  {Math.round(weeklyStats.percent)}%
                </span>
              </div>
            </div>

            <div className='flex-1 space-y-4'>
              <div>
                <div className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                  {(weeklyStats.current / 3600).toFixed(1)}{' '}
                  <span className='text-lg text-gray-500 font-medium'>
                    / {(weeklyStats.goal / 3600).toFixed(0)} Hrs
                  </span>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Studied this week
                </p>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3'>
                  <div className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate'>
                    {streak}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap'>
                    Streak
                  </div>
                </div>
                <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3'>
                  <div className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate'>
                    {stage}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Level
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Opened (Replaces Course Shelves) */}
      <div>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
            <BookOpen className='w-6 h-6 mr-3 text-primary-500' />
            Recently Opened
          </h2>
          <Link
            to='/department'
            className='text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
          >
            View Library
          </Link>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {recentMaterials.slice(0, 3).map((material) => (
            <MaterialCard
              key={material.id}
              material={{
                ...material,
                description: '',
                fileUrl: '',
                fileType: 'pdf',
                size: 0,
                createdAt: material.viewedAt,
                uploader: {
                  id: (material as any).uploader?.id || '',
                  firstName: (material as any).uploader?.firstName || '',
                  lastName: (material as any).uploader?.lastName || '',
                },
                course: { code: material.courseCode || '' },
              }}
            />
          ))}

          {recentMaterials.length === 0 && (
            <div className='col-span-full text-center py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700'>
              <BookOpen className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100'>
                No recently opened files
              </h3>
              <p className='text-gray-500 dark:text-gray-400'>
                Start studying to see your recent files here.
              </p>
            </div>
          )}
        </div>
      </div>

      <StudySessionModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        onUpload={openUploadModal}
      />

      {folderView && (
        <FolderView
          folder={folderView}
          onClose={() => setFolderView(null)}
          onUpdate={() => {
            // Refresh collections count if needed
            api
              .get('/academic/collections')
              .then((res) => setCollections(res.data));
          }}
        />
      )}

      <CollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
      />
    </div>
  );
}
