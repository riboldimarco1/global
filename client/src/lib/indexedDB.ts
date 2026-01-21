import type { 
  Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, MovimientoBancario,
  UnidadProduccion, Actividad, Cliente, Insumo, Personal, Producto, Proveedor, Banco, OperacionBancaria, TasaDolar
} from "@shared/schema";

const DB_NAME = "AdminDB";
const DB_VERSION = 2;

type TransactionalStore = "gastos" | "nominas" | "ventas" | "cuentasCobrar" | "cuentasPagar" | "prestamos" | "movimientosBancarios";
type ParameterStore = "unidades" | "actividades" | "clientes" | "insumos" | "personal" | "productos" | "proveedores" | "bancos" | "operaciones" | "tasas";
type StoreName = TransactionalStore | ParameterStore | "syncMeta";

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
      
      const transactionalStores: TransactionalStore[] = ["gastos", "nominas", "ventas", "cuentasCobrar", "cuentasPagar", "prestamos", "movimientosBancarios"];
      
      transactionalStores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("unidadProduccionId", "unidadProduccionId", { unique: false });
          store.createIndex("fecha", "fecha", { unique: false });
        }
      });
      
      const parameterStores: ParameterStore[] = ["unidades", "actividades", "clientes", "insumos", "personal", "productos", "proveedores", "bancos", "operaciones", "tasas"];
      
      parameterStores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          if (storeName === "tasas") {
            store.createIndex("fecha", "fecha", { unique: false });
          }
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
  unidades: {
    getAll: () => getAll<UnidadProduccion>("unidades"),
    putAll: (records: UnidadProduccion[]) => putAll("unidades", records),
    putOne: (record: UnidadProduccion) => putOne("unidades", record),
    deleteOne: (id: string) => deleteOne("unidades", id),
    clear: () => clearStore("unidades"),
    count: () => getCount("unidades"),
  },
  actividades: {
    getAll: () => getAll<Actividad>("actividades"),
    putAll: (records: Actividad[]) => putAll("actividades", records),
    putOne: (record: Actividad) => putOne("actividades", record),
    deleteOne: (id: string) => deleteOne("actividades", id),
    clear: () => clearStore("actividades"),
    count: () => getCount("actividades"),
  },
  clientes: {
    getAll: () => getAll<Cliente>("clientes"),
    putAll: (records: Cliente[]) => putAll("clientes", records),
    putOne: (record: Cliente) => putOne("clientes", record),
    deleteOne: (id: string) => deleteOne("clientes", id),
    clear: () => clearStore("clientes"),
    count: () => getCount("clientes"),
  },
  insumos: {
    getAll: () => getAll<Insumo>("insumos"),
    putAll: (records: Insumo[]) => putAll("insumos", records),
    putOne: (record: Insumo) => putOne("insumos", record),
    deleteOne: (id: string) => deleteOne("insumos", id),
    clear: () => clearStore("insumos"),
    count: () => getCount("insumos"),
  },
  personal: {
    getAll: () => getAll<Personal>("personal"),
    putAll: (records: Personal[]) => putAll("personal", records),
    putOne: (record: Personal) => putOne("personal", record),
    deleteOne: (id: string) => deleteOne("personal", id),
    clear: () => clearStore("personal"),
    count: () => getCount("personal"),
  },
  productos: {
    getAll: () => getAll<Producto>("productos"),
    putAll: (records: Producto[]) => putAll("productos", records),
    putOne: (record: Producto) => putOne("productos", record),
    deleteOne: (id: string) => deleteOne("productos", id),
    clear: () => clearStore("productos"),
    count: () => getCount("productos"),
  },
  proveedores: {
    getAll: () => getAll<Proveedor>("proveedores"),
    putAll: (records: Proveedor[]) => putAll("proveedores", records),
    putOne: (record: Proveedor) => putOne("proveedores", record),
    deleteOne: (id: string) => deleteOne("proveedores", id),
    clear: () => clearStore("proveedores"),
    count: () => getCount("proveedores"),
  },
  bancos: {
    getAll: () => getAll<Banco>("bancos"),
    putAll: (records: Banco[]) => putAll("bancos", records),
    putOne: (record: Banco) => putOne("bancos", record),
    deleteOne: (id: string) => deleteOne("bancos", id),
    clear: () => clearStore("bancos"),
    count: () => getCount("bancos"),
  },
  operaciones: {
    getAll: () => getAll<OperacionBancaria>("operaciones"),
    putAll: (records: OperacionBancaria[]) => putAll("operaciones", records),
    putOne: (record: OperacionBancaria) => putOne("operaciones", record),
    deleteOne: (id: string) => deleteOne("operaciones", id),
    clear: () => clearStore("operaciones"),
    count: () => getCount("operaciones"),
  },
  tasas: {
    getAll: () => getAll<TasaDolar>("tasas"),
    putAll: (records: TasaDolar[]) => putAll("tasas", records),
    putOne: (record: TasaDolar) => putOne("tasas", record),
    deleteOne: (id: string) => deleteOne("tasas", id),
    clear: () => clearStore("tasas"),
    count: () => getCount("tasas"),
  },
  syncMeta: {
    get: getSyncMeta,
    set: setSyncMeta,
  },
};

export type { SyncMeta };
