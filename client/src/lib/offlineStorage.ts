/**
 * Offline Storage Utility
 * Uses IndexedDB via idb-keyval for persistent offline data caching
 */
import { get, set, del, keys, createStore } from 'idb-keyval';

// Create separate stores for different data types
const apiCacheStore = createStore('peertolearn-api-cache', 'responses');
const materialStore = createStore('peertolearn-materials', 'pdfs');
const metaStore = createStore('peertolearn-meta', 'info');

// Keys for cached API endpoints
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  STUDY_INSIGHTS: 'study_insights',
  RECENT_MATERIALS: 'recent_materials',
  FAVORITE_MATERIALS: 'favorite_materials',
  COURSES: 'courses',
  DEPARTMENT_INFO: 'department_info',
  DASHBOARD_DATA: 'dashboard_data',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Default cache duration: 24 hours
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

/**
 * Save API response to offline cache
 */
export async function saveToCache<T>(
  key: CacheKey,
  data: T,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  const cached: CachedData<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };
  await set(key, cached, apiCacheStore);
}

/**
 * Get data from offline cache
 * Returns null if not found or expired
 */
export async function getFromCache<T>(key: CacheKey): Promise<T | null> {
  try {
    const cached = await get<CachedData<T>>(key, apiCacheStore);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      await del(key, apiCacheStore);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Get data from cache, ignoring expiry (for offline use)
 */
export async function getFromCacheStale<T>(key: CacheKey): Promise<T | null> {
  try {
    const cached = await get<CachedData<T>>(key, apiCacheStore);
    return cached?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key: CacheKey): Promise<void> {
  await del(key, apiCacheStore);
}

/**
 * Clear all API cache
 */
export async function clearAllCache(): Promise<void> {
  const allKeys = await keys(apiCacheStore);
  for (const key of allKeys) {
    await del(key, apiCacheStore);
  }
}

// ================== PDF Material Storage ==================

interface OfflineMaterial {
  id: string;
  title: string;
  pdfBlob: Blob;
  thumbnail?: string;
  savedAt: number;
  fileSize: number;
  isUserSaved: boolean; // true = explicit save, false = auto-cached
}

/**
 * Save a PDF for offline access
 */
export async function saveMaterialOffline(
  id: string,
  title: string,
  pdfBlob: Blob,
  isUserSaved: boolean = true,
  thumbnail?: string,
): Promise<void> {
  const material: OfflineMaterial = {
    id,
    title,
    pdfBlob,
    thumbnail,
    savedAt: Date.now(),
    fileSize: pdfBlob.size,
    isUserSaved,
  };
  await set(`material_${id}`, material, materialStore);

  // Update the list of offline material IDs
  const offlineIds =
    (await get<string[]>('offline_material_ids', metaStore)) || [];
  if (!offlineIds.includes(id)) {
    offlineIds.push(id);
    await set('offline_material_ids', offlineIds, metaStore);
  }
}

/**
 * Get a PDF from offline storage
 */
export async function getMaterialOffline(
  id: string,
): Promise<OfflineMaterial | null> {
  try {
    const result = await get<OfflineMaterial>(`material_${id}`, materialStore);
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a material is available offline
 */
export async function isMaterialOffline(id: string): Promise<boolean> {
  const material = await getMaterialOffline(id);
  return material !== null;
}

/**
 * Delete a material from offline storage
 */
export async function deleteMaterialOffline(id: string): Promise<void> {
  await del(`material_${id}`, materialStore);

  // Update the list of offline material IDs
  const offlineIds =
    (await get<string[]>('offline_material_ids', metaStore)) || [];
  const updated = offlineIds.filter((i) => i !== id);
  await set('offline_material_ids', updated, metaStore);
}

/**
 * Get all offline materials info (without PDF blobs for performance)
 */
export async function getOfflineMaterialsList(): Promise<
  Omit<OfflineMaterial, 'pdfBlob'>[]
> {
  const offlineIds =
    (await get<string[]>('offline_material_ids', metaStore)) || [];
  const materials: Omit<OfflineMaterial, 'pdfBlob'>[] = [];

  for (const id of offlineIds) {
    const material = await getMaterialOffline(id);
    if (material) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pdfBlob, ...info } = material;
      materials.push(info);
    }
  }

  return materials.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Get total offline storage usage in bytes
 */
export async function getOfflineStorageUsage(): Promise<number> {
  const materials = await getOfflineMaterialsList();
  return materials.reduce((total, m) => total + m.fileSize, 0);
}

/**
 * Evict oldest auto-cached materials if over limit
 */
export async function evictOldAutoCached(maxCount: number = 5): Promise<void> {
  const materials = await getOfflineMaterialsList();
  const autoCached = materials.filter((m) => !m.isUserSaved);

  if (autoCached.length > maxCount) {
    // Sort by oldest first
    const toEvict = autoCached
      .sort((a, b) => a.savedAt - b.savedAt)
      .slice(0, autoCached.length - maxCount);

    for (const material of toEvict) {
      await deleteMaterialOffline(material.id);
    }
  }
}
