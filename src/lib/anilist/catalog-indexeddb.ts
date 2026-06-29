import type { DiscoverItem } from "@/lib/mal/jikan";

const DB_NAME = "anime-watchlist";
const STORE_NAME = "anilist-catalog";
const CACHE_KEY = "catalog-v2";
const MAX_AGE_MS = 15 * 60 * 1000;

export type CatalogCacheRecord = {
  items: DiscoverItem[];
  loadedPages: number;
  totalPages: number;
  totalItems: number;
  complete: boolean;
  updatedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function readCatalogCache(): Promise<CatalogCacheRecord | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const value = request.result as CatalogCacheRecord | undefined;
        resolve(value ?? null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function writeCatalogCache(
  record: CatalogCacheRecord,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record, CACHE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // Cache write failures should not break catalog loading.
  }
}

export async function clearCatalogCache(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(CACHE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}

export function isCatalogCacheFresh(record: CatalogCacheRecord): boolean {
  if (!record.complete) return false;
  const age = Date.now() - new Date(record.updatedAt).getTime();
  return age >= 0 && age < MAX_AGE_MS;
}
