/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { StreakCalendar } from './StreakCalendar';
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
  pageCount?: number;
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
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [selectedMaterialForCollection, setSelectedMaterialForCollection] = useState<string | undefined>(undefined);
  const [lastReadPage, setLastReadPage] = useState(1);

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
            weeklyRes.data.goalSeconds > 0
              ? (weeklyRes.data.totalSeconds / weeklyRes.data.goalSeconds) * 100
              : 0,
        });

        if (activityRes.data.lastReadMaterial) {
          setRecentMaterials([
            {
              ...activityRes.data.lastReadMaterial,
              viewedAt: new Date().toISOString(),
            },
          ]);
          setLastReadPage(activityRes.data.lastReadPage || 1);
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

        // Fetch favorites count
        try {
          const favoritesRes = await api.get('/materials/favorites');
          setFavoritesCount(Array.isArray(favoritesRes.data) ? favoritesRes.data.length : 0);
        } catch {
          console.warn('Failed to fetch favorites');
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
      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4 lg:p-6'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6'>
          {/* Hero: Resume Reading / Start Reading (3/4 Width) */}
          <div className='lg:col-span-3 relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none' />

            <div className='relative z-10'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <Activity className='w-4 h-4 lg:w-5 lg:h-5 mr-2 text-primary-500' />
                  {lastOpened ? 'Resume Reading' : 'Start Reading'}
                </h2>
                {lastOpened && (
                  <span className='text-xs font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full'>
                    Jump back in
                  </span>
                )}
              </div>

              {lastOpened ? (
                <div className='flex items-center justify-between'>
                  <div className='cursor-pointer flex-1 min-w-0'>
                    <Link to={`/materials/${lastOpened.id}`} className='block'>
                      <h3 className='text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate'>
                        {lastOpened.title}
                      </h3>
                      <p className='text-gray-500 dark:text-gray-400 text-sm line-clamp-1'>
                        {lastOpened.courseCode
                          ? `${lastOpened.courseCode} • `
                          : ''}
                        {lastOpened.type}
                        {lastReadPage > 1 && (
                          <span className='ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'>
                            📖 Page {lastReadPage}
                          </span>
                        )}
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
                <div className='text-center py-6'>
                  <p className='text-gray-500 dark:text-gray-400 mb-3 text-sm'>
                    No recent files opened.
                  </p>
                  <button
                    onClick={openUploadModal}
                    className='px-5 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20'
                  >
                    Upload Material
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Access: Favorites & Collections (1/4 Width - Vertical Stack) */}
          <div className='lg:col-span-1 lg:border-l lg:border-gray-200/50 dark:lg:border-gray-700/50 lg:pl-4'>
            <h2 className='text-base lg:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3'>
              Quick Access
            </h2>
            <div className='space-y-2 pr-1'>
              <FolderCard
                id='favorites'
                title='Favorites'
                count={favoritesCount}
                isFavorite={true}
                compact={true}
                onClick={() =>
                  setFolderView({
                    id: 'favorites',
                    title: 'Favorites',
                    type: 'favorites',
                  })
                }
              />
              {collections.slice(0, 2).map((col) => (
                <FolderCard
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  count={col.count || 0}
                  color={col.color}
                  compact={true}
                  onClick={() =>
                    setFolderView({
                      id: col.id,
                      title: col.title,
                      type: 'collection',
                    })
                  }
                />
              ))}
              {/* Add New Collection Button (Mini) */}
              <button
                onClick={() => setCollectionModalOpen(true)}
                className='w-full p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800/50 transition-all flex items-center justify-center text-gray-400 hover:text-primary-600'
              >
                <Plus className='w-3 h-3 mr-1.5' />
                <span className='font-medium text-xs'>New Collection</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Upload Button (Restored) */}
        <div
          onClick={openUploadModal}
          className='bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform flex flex-col items-center justify-center text-center min-h-[200px]'
        >
          <div className='w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm'>
            <Upload className='w-8 h-8' />
          </div>
          <h3 className='text-xl font-bold mb-2'>Upload Material</h3>
          <p className='text-primary-100 text-sm max-w-[200px]'>
            Add notes, slides, or books to start studying
          </p>
        </div>

        {/* Partner Status */}
        <div className='bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-transform h-full min-h-[200px]'>
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
      </div>

      {/* Heatmap Highlights (Stats) - Full Width */}
      <div className='bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm'>
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
          {(() => {
            const baseStep = 5 * 3600; // 5 Hours step
            const currentSeconds = weeklyStats.current;
            // Goal is next multiple of 5h
            const dynamicGoal = Math.max(
              baseStep,
              Math.ceil((currentSeconds + 1) / baseStep) * baseStep,
            );
            const percent = Math.min((currentSeconds / dynamicGoal) * 100, 100);
            // Calculate Goal Level (1 = 0-5h, 2 = 5-10h, etc.)
            const goalLevel = Math.floor(dynamicGoal / baseStep);

            return (
              <>
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
                      strokeDashoffset={2 * Math.PI * 56 * (1 - percent / 100)}
                      className={`transition-all duration-1000 ease-out ${percent >= 100 ? 'text-green-500' : 'text-primary-600'
                        }`}
                      strokeLinecap='round'
                    />
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <span className='text-2xl font-bold text-gray-900 dark:text-gray-100 text-center'>
                      {Math.round(percent)}%
                    </span>
                    {goalLevel > 1 && (
                      <span className='text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full mt-1'>
                        Level {goalLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className='flex-1 space-y-4'>
                  <div>
                    <div className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                      {(currentSeconds / 3600).toFixed(1)}{' '}
                      <span className='text-lg text-gray-500 font-medium'>
                        / {(dynamicGoal / 3600).toFixed(0)} Hrs
                      </span>
                    </div>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      Studied this week
                      {goalLevel > 1 && ` (Milestone ${goalLevel} Unlocked!)`}
                    </p>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 flex flex-col items-center justify-center'>
                      <div className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate w-full text-center'>
                        {streak}
                      </div>
                      <div className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-[1px] whitespace-nowrap'>
                        Streak
                      </div>
                    </div>
                    <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 flex flex-col items-center justify-center'>
                      <div className='text-lg font-bold text-gray-900 dark:text-gray-100 truncate w-full text-center'>
                        {stage}
                      </div>
                      <div className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-[1px]'>
                        Level
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Study Activity Calendar */}
      <StreakCalendar />

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
              onAddToCollection={(id) => {
                setSelectedMaterialForCollection(id);
                setCollectionModalOpen(true);
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
        materialId={selectedMaterialForCollection}
      />
    </div>
  );
}
