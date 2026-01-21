import { useState, useEffect } from 'react';
import type { Material } from '../types/academic';
import api from '../lib/api';
import { Link } from 'react-router-dom';
import { TrendingUp, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BorderSpinner } from './Skeleton';

export function RecommendedMaterials() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRecommendations() {
            try {
                const res = await api.get('/materials/recommendations');
                setMaterials(res.data);
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchRecommendations();
    }, []);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <BorderSpinner size='lg' />
            </div>
        );
    }

    if (materials.length === 0) {
        return null;
    }

    return (
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
            <div className='flex items-center gap-2 mb-4'>
                <TrendingUp className='w-5 h-5 text-primary-600' />
                <h3 className='font-semibold text-lg'>Recommended for You</h3>
            </div>

            <p className="text-xs text-gray-500 mb-4 -mt-2">
                Popular in your department
            </p>

            <div className='space-y-3'>
                {materials.map((material) => (
                    <Link
                        key={material.id}
                        to={`/materials/${material.id}`}
                        className='block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    >
                        <h4 className='font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors'>
                            {material.title}
                        </h4>

                        <div className='flex items-center gap-3 text-xs text-gray-500'>
                            <span className='flex items-center gap-1'>
                                <ThumbsUp className='w-3 h-3' />
                                {material.favoritesCount || 0}
                            </span>
                            <span>•</span>
                            <span className='truncate max-w-[100px]'>
                                {material.courseCode}
                            </span>
                            <span>•</span>
                            <span>
                                {formatDistanceToNow(new Date(material.createdAt), { addSuffix: true })}
                            </span>
                        </div>

                        <div className='mt-2 flex items-center gap-2 text-xs text-gray-400'>
                            {material.uploader?.image ? (
                                <img
                                    src={material.uploader.image}
                                    alt={material.uploader.firstName}
                                    className="w-4 h-4 rounded-full"
                                />
                            ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <span className="text-[8px] font-bold">
                                        {material.uploader?.firstName?.[0]}
                                    </span>
                                </div>
                            )}
                            <span className="truncate">
                                {material.uploader?.firstName} {material.uploader?.lastName}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
