// Client-side session storage using IndexedDB with localStorage fallback.
// Stores full-resolution data URLs without compressing or downscaling.

export type SessionPayload = {
  id: string;
  layout: string;
  photos: string[]; // data URLs
  timer: 3 | 5;
  createdAt: number;
};

const DB_NAME = "photobooth-db";
const STORE = "sessions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB not available"));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open DB"));
  });
}

export async function saveSession(payload: SessionPayload): Promise<boolean> {
  // Try IndexedDB first
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Tx error"));
      tx.objectStore(STORE).put(payload);
    });
    return true;
  } catch {
    // Fallback to localStorage
    try {
      localStorage.setItem(`photobooth:session:${payload.id}`, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }
}

export async function loadSession(id: string): Promise<SessionPayload | null> {
  // Try IndexedDB
  try {
    const db = await openDB();
    const result = await new Promise<SessionPayload | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error || new Error("Tx error"));
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as SessionPayload) || null);
      req.onerror = () => reject(req.error || new Error("Get error"));
    });
    if (result) return result;
  } catch {
    // ignore and try localStorage
  }
  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`photobooth:session:${id}`);
    return raw ? (JSON.parse(raw) as SessionPayload) : null;
  } catch {
    return null;
  }
}

// Update a session with partial fields (e.g., layout after capture)
export async function updateSession(
  id: string,
  patch: Partial<SessionPayload>
): Promise<boolean> {
  try {
    const current = await loadSession(id);
    if (!current) return false;
    const updated: SessionPayload = { ...current, ...patch, id: current.id };
    return await saveSession(updated);
  } catch {
    return false;
  }
}
