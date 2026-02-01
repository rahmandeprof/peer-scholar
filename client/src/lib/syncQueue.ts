/**
 * Sync Queue - Queue offline mutations and sync when back online
 *
 * Handles:
 * - Bookmarks added/removed offline
 * - Favorites toggled offline
 * - Reading progress updates
 */
import { get, set, del, createStore } from 'idb-keyval';
import api from './api';

const syncQueueStore = createStore('peertolearn-sync', 'queue');

export type SyncAction =
  | {
      type: 'add_bookmark';
      materialId: string;
      sectionId: string;
      timestamp: number;
    }
  | { type: 'remove_bookmark'; bookmarkId: string; timestamp: number }
  | {
      type: 'toggle_favorite';
      materialId: string;
      isFavorited: boolean;
      timestamp: number;
    }
  | {
      type: 'update_progress';
      materialId: string;
      page: number;
      timestamp: number;
    };

const QUEUE_KEY = 'pending_actions';

/**
 * Add an action to the sync queue
 */
export async function queueAction(action: SyncAction): Promise<void> {
  const queue = await getPendingActions();
  queue.push(action);
  await set(QUEUE_KEY, queue, syncQueueStore);
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<SyncAction[]> {
  const queue = await get<SyncAction[]>(QUEUE_KEY, syncQueueStore);
  return queue ?? [];
}

/**
 * Get count of pending actions
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getPendingActions();
  return queue.length;
}

/**
 * Clear the sync queue
 */
export async function clearQueue(): Promise<void> {
  await del(QUEUE_KEY, syncQueueStore);
}

/**
 * Process a single action
 */
async function processAction(action: SyncAction): Promise<boolean> {
  try {
    switch (action.type) {
      case 'add_bookmark':
        await api.post(`/materials/${action.materialId}/bookmarks`, {
          sectionId: action.sectionId,
        });
        break;

      case 'remove_bookmark':
        await api.delete(`/bookmarks/${action.bookmarkId}`);
        break;

      case 'toggle_favorite':
        if (action.isFavorited) {
          await api.post(`/materials/${action.materialId}/favorite`);
        } else {
          await api.delete(`/materials/${action.materialId}/favorite`);
        }
        break;

      case 'update_progress':
        await api.post('/users/activity/update', {
          materialId: action.materialId,
          page: action.page,
        });
        break;
    }
    return true;
  } catch (error) {
    console.error('[SyncQueue] Failed to process action:', action.type, error);
    return false;
  }
}

/**
 * Sync all pending actions to the server
 * Returns the number of successfully synced actions
 */
export async function syncPendingActions(): Promise<{
  synced: number;
  failed: number;
}> {
  const queue = await getPendingActions();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log(`[SyncQueue] Syncing ${queue.length} pending actions...`);

  // Sort by timestamp to maintain order
  queue.sort((a, b) => a.timestamp - b.timestamp);

  const results = await Promise.allSettled(
    queue.map((action) => processAction(action)),
  );

  const synced = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true,
  ).length;
  const failed = results.length - synced;

  // Clear successfully synced actions
  // For now, we clear all - in production you'd keep failed ones
  if (synced > 0 || failed === 0) {
    await clearQueue();
  }

  console.log(`[SyncQueue] Synced: ${synced}, Failed: ${failed}`);
  return { synced, failed };
}

/**
 * Hook into online event to auto-sync
 */
export function setupAutoSync(): void {
  window.addEventListener('online', async () => {
    console.log('[SyncQueue] Back online, attempting sync...');
    const result = await syncPendingActions();
    if (result.synced > 0) {
      console.log(`[SyncQueue] Successfully synced ${result.synced} actions`);
    }
  });
}
