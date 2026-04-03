'use client';

import { get, set, del, keys } from 'idb-keyval';

const DRAFT_PREFIX = 'kinetic-draft-';

export interface OfflineDraft {
  id: string;
  pushup_reps: number;
  plank_seconds: number;
  run_distance: number;
  notes: string;
  photo_url: string | null;
  saved_at: number;
}

export async function saveDraftOffline(draft: OfflineDraft): Promise<void> {
  await set(`${DRAFT_PREFIX}${draft.id}`, draft);
}

export async function getDraftOffline(): Promise<OfflineDraft | null> {
  const allKeys = await keys();
  const draftKeys = allKeys.filter((k) => String(k).startsWith(DRAFT_PREFIX));
  if (draftKeys.length === 0) return null;

  // Get most recent draft
  let latest: OfflineDraft | null = null;
  for (const key of draftKeys) {
    const draft = await get<OfflineDraft>(String(key));
    if (draft && (!latest || draft.saved_at > latest.saved_at)) {
      latest = draft;
    }
  }
  return latest;
}

export async function deleteDraftOffline(id: string): Promise<void> {
  await del(`${DRAFT_PREFIX}${id}`);
}

export async function getAllOfflineDrafts(): Promise<OfflineDraft[]> {
  const allKeys = await keys();
  const draftKeys = allKeys.filter((k) => String(k).startsWith(DRAFT_PREFIX));
  const drafts: OfflineDraft[] = [];
  for (const key of draftKeys) {
    const draft = await get<OfflineDraft>(String(key));
    if (draft) drafts.push(draft);
  }
  return drafts;
}

// Register service worker and setup background sync
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);

      // Listen for sync messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_DRAFTS') {
          // Trigger re-sync of offline drafts
          window.dispatchEvent(new CustomEvent('kinetic-sync-drafts'));
        }
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  }
}
