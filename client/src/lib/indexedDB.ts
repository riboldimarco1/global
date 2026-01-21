import type { Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, MovimientoBancario } from "@shared/schema";

const DB_NAME = "AdminDB";
const DB_VERSION = 1;

type StoreName = "gastos" | "nominas" | "ventas" | "cuentasCobrar" | "cuentasPagar" | "prestamos" | "movimientosBancarios" | "syncMeta";

interface SyncMeta {
  storeName: string;
  lastSync: string;
  recordCount: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      const stores: StoreName[] = ["gastos", "nominas", "ventas", "cuentasCobrar", "cuentasPagar", "prestamos", "movimientosBancarios"];
      
      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("unidadProduccionId", "unidadProduccionId", { unique: false });
          store.createIndex("fecha", "fecha", { unique: false });
        }
      });
      
      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "storeName" });
      }
    };
  });
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getByUnidad<T>(storeName: StoreName, unidadId: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index("unidadProduccionId");
    const request = index.getAll(unidadId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putAll<T extends { id: string }>(storeName: StoreName, records: T[]): Promise<void> {
  if (records.length === 0) return;
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    
    records.forEach(record => {
      store.put(record);
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function putOne<T extends { id: string }>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(record);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteOne(storeName: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getCount(storeName: StoreName): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.count();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSyncMeta(storeName: string): Promise<SyncMeta | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("syncMeta", "readonly");
    const store = transaction.objectStore("syncMeta");
    const request = store.get(storeName);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("syncMeta", "readwrite");
    const store = transaction.objectStore("syncMeta");
    const request = store.put(meta);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const adminDB = {
  gastos: {
    getAll: () => getAll<Gasto>("gastos"),
    getByUnidad: (unidadId: string) => getByUnidad<Gasto>("gastos", unidadId),
    putAll: (records: Gasto[]) => putAll("gastos", records),
    putOne: (record: Gasto) => putOne("gastos", record),
    deleteOne: (id: string) => deleteOne("gastos", id),
    clear: () => clearStore("gastos"),
    count: () => getCount("gastos"),
  },
  nominas: {
    getAll: () => getAll<Nomina>("nominas"),
    getByUnidad: (unidadId: string) => getByUnidad<Nomina>("nominas", unidadId),
    putAll: (records: Nomina[]) => putAll("nominas", records),
    putOne: (record: Nomina) => putOne("nominas", record),
    deleteOne: (id: string) => deleteOne("nominas", id),
    clear: () => clearStore("nominas"),
    count: () => getCount("nominas"),
  },
  ventas: {
    getAll: () => getAll<Venta>("ventas"),
    getByUnidad: (unidadId: string) => getByUnidad<Venta>("ventas", unidadId),
    putAll: (records: Venta[]) => putAll("ventas", records),
    putOne: (record: Venta) => putOne("ventas", record),
    deleteOne: (id: string) => deleteOne("ventas", id),
    clear: () => clearStore("ventas"),
    count: () => getCount("ventas"),
  },
  cuentasCobrar: {
    getAll: () => getAll<CuentaCobrar>("cuentasCobrar"),
    getByUnidad: (unidadId: string) => getByUnidad<CuentaCobrar>("cuentasCobrar", unidadId),
    putAll: (records: CuentaCobrar[]) => putAll("cuentasCobrar", records),
    putOne: (record: CuentaCobrar) => putOne("cuentasCobrar", record),
    deleteOne: (id: string) => deleteOne("cuentasCobrar", id),
    clear: () => clearStore("cuentasCobrar"),
    count: () => getCount("cuentasCobrar"),
  },
  cuentasPagar: {
    getAll: () => getAll<CuentaPagar>("cuentasPagar"),
    getByUnidad: (unidadId: string) => getByUnidad<CuentaPagar>("cuentasPagar", unidadId),
    putAll: (records: CuentaPagar[]) => putAll("cuentasPagar", records),
    putOne: (record: CuentaPagar) => putOne("cuentasPagar", record),
    deleteOne: (id: string) => deleteOne("cuentasPagar", id),
    clear: () => clearStore("cuentasPagar"),
    count: () => getCount("cuentasPagar"),
  },
  prestamos: {
    getAll: () => getAll<Prestamo>("prestamos"),
    getByUnidad: (unidadId: string) => getByUnidad<Prestamo>("prestamos", unidadId),
    putAll: (records: Prestamo[]) => putAll("prestamos", records),
    putOne: (record: Prestamo) => putOne("prestamos", record),
    deleteOne: (id: string) => deleteOne("prestamos", id),
    clear: () => clearStore("prestamos"),
    count: () => getCount("prestamos"),
  },
  movimientosBancarios: {
    getAll: () => getAll<MovimientoBancario>("movimientosBancarios"),
    getByUnidad: (unidadId: string) => getByUnidad<MovimientoBancario>("movimientosBancarios", unidadId),
    putAll: (records: MovimientoBancario[]) => putAll("movimientosBancarios", records),
    putOne: (record: MovimientoBancario) => putOne("movimientosBancarios", record),
    deleteOne: (id: string) => deleteOne("movimientosBancarios", id),
    clear: () => clearStore("movimientosBancarios"),
    count: () => getCount("movimientosBancarios"),
  },
  syncMeta: {
    get: getSyncMeta,
    set: setSyncMeta,
  },
};

export type { SyncMeta };
