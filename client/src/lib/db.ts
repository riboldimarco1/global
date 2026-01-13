import type { Registro, InsertRegistro } from "@shared/schema";

const DB_NAME = "centrales-db";
const DB_VERSION = 1;
const REGISTROS_STORE = "registros";
const PENDING_STORE = "pending";

interface PendingRecord {
  id: string;
  type: "create" | "delete";
  data?: InsertRegistro;
  registroId?: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(REGISTROS_STORE)) {
        const store = db.createObjectStore(REGISTROS_STORE, { keyPath: "id" });
        store.createIndex("fecha", "fecha", { unique: false });
        store.createIndex("central", "central", { unique: false });
      }

      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: "id" });
      }
    };
  });

  return dbPromise;
}

export async function getAllLocalRegistros(): Promise<Registro[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REGISTROS_STORE, "readonly");
    const store = transaction.objectStore(REGISTROS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveLocalRegistros(registros: Registro[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REGISTROS_STORE, "readwrite");
    const store = transaction.objectStore(REGISTROS_STORE);

    store.clear();

    for (const registro of registros) {
      store.put(registro);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function addLocalRegistro(registro: Registro): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REGISTROS_STORE, "readwrite");
    const store = transaction.objectStore(REGISTROS_STORE);
    const request = store.put(registro);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteLocalRegistro(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REGISTROS_STORE, "readwrite");
    const store = transaction.objectStore(REGISTROS_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function addPendingAction(action: PendingRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE, "readwrite");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.put(action);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getPendingActions(): Promise<PendingRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE, "readonly");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE, "readwrite");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearPendingActions(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PENDING_STORE, "readwrite");
    const store = transaction.objectStore(PENDING_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearAllLocalData(): Promise<void> {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  return new Promise((resolve, reject) => {
    dbPromise = null;
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REGISTROS_STORE, PENDING_STORE], "readwrite");
    const registrosStore = transaction.objectStore(REGISTROS_STORE);
    const pendingStore = transaction.objectStore(PENDING_STORE);

    registrosStore.clear();
    pendingStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

