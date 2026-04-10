/**
 * useDraftQueue — sauvegarde un brouillon de formulaire hors ligne
 * et le rejoue via Background Sync dès que la connexion revient.
 *
 * Usage :
 *   const { saveDraft, hasPendingDrafts } = useDraftQueue();
 *   await saveDraft('/api/v1/interventions', 'POST', headers, body);
 */

interface DraftEntry {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  savedAt: number;
}

async function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('trackyu-drafts', 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('drafts', {
        keyPath: 'id',
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function saveDraftToQueue(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<void> {
  const db = await openDraftDB();
  const tx = db.transaction('drafts', 'readwrite');
  const store = tx.objectStore('drafts');
  const entry: DraftEntry = { url, method, headers, body, savedAt: Date.now() };
  store.add(entry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
  db.close();

  // Demande au SW de rejouer la queue dès que possible
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('sync-draft-queue');
  }
}

export async function getDraftCount(): Promise<number> {
  try {
    const db = await openDraftDB();
    const tx = db.transaction('drafts', 'readonly');
    const count: number = await new Promise((resolve, reject) => {
      const req = tx.objectStore('drafts').count();
      req.onsuccess = (e) => resolve((e.target as IDBRequest<number>).result);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}
