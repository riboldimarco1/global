import { useState, useEffect, useCallback, useRef } from "react";
import { adminDB, SyncMeta } from "@/lib/indexedDB";
import type { 
  Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, MovimientoBancario,
  UnidadProduccion, Actividad, Cliente, Insumo, Personal, Producto, Proveedor, Banco, OperacionBancaria, TasaDolar
} from "@shared/schema";

type TransactionalType = "gastos" | "nominas" | "ventas" | "cuentasCobrar" | "cuentasPagar" | "prestamos" | "movimientosBancarios";
type ParameterType = "unidades" | "actividades" | "clientes" | "insumos" | "personal" | "productos" | "proveedores" | "bancos" | "operaciones" | "tasas";
type DataType = TransactionalType | ParameterType;

interface UseLocalSyncOptions {
  dataType: DataType;
  unidadId?: string | null;
  enabled?: boolean;
}

interface UseLocalSyncResult<T> {
  data: T[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  refetch: () => Promise<void>;
  syncStatus: "idle" | "syncing" | "synced" | "error";
}

const API_ENDPOINTS: Record<DataType, string> = {
  gastos: "/api/administracion/gastos",
  nominas: "/api/administracion/nominas",
  ventas: "/api/administracion/ventas",
  cuentasCobrar: "/api/administracion/cuentas-cobrar",
  cuentasPagar: "/api/administracion/cuentas-pagar",
  prestamos: "/api/administracion/prestamos",
  movimientosBancarios: "/api/administracion/movimientos-bancarios",
  unidades: "/api/unidades-produccion",
  actividades: "/api/actividades",
  clientes: "/api/clientes",
  insumos: "/api/insumos",
  personal: "/api/personal",
  productos: "/api/productos",
  proveedores: "/api/proveedores",
  bancos: "/api/bancos",
  operaciones: "/api/operaciones-bancarias",
  tasas: "/api/tasas-dolar",
};

const TRANSACTIONAL_TYPES: TransactionalType[] = ["gastos", "nominas", "ventas", "cuentasCobrar", "cuentasPagar", "prestamos", "movimientosBancarios"];

function isTransactionalType(dataType: DataType): dataType is TransactionalType {
  return TRANSACTIONAL_TYPES.includes(dataType as TransactionalType);
}

export function useLocalSync<T extends { id: string }>({
  dataType,
  unidadId,
  enabled = true,
}: UseLocalSyncOptions): UseLocalSyncResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const syncInProgress = useRef(false);
  const currentUnidadId = useRef(unidadId);

  const getDbStore = useCallback(() => {
    return adminDB[dataType] as any;
  }, [dataType]);

  const loadFromLocal = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const store = getDbStore();
      let localData: T[];
      
      if (isTransactionalType(dataType) && unidadId && unidadId !== "all") {
        localData = await store.getByUnidad(unidadId);
      } else {
        localData = await store.getAll();
      }
      
      localData.sort((a: any, b: any) => {
        if (a.fecha && b.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        if (a.nombre && b.nombre) {
          return a.nombre.localeCompare(b.nombre);
        }
        return 0;
      });
      
      setData(localData);
      
      const meta = await adminDB.syncMeta.get(dataType);
      if (meta) {
        setLastSync(new Date(meta.lastSync));
      }
    } catch (error) {
      console.warn(`Error loading ${dataType} from IndexedDB, will sync from server:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [dataType, unidadId, enabled, getDbStore]);

  const syncWithServer = useCallback(async () => {
    if (!enabled || syncInProgress.current) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncStatus("syncing");
    
    try {
      const endpoint = API_ENDPOINTS[dataType];
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const serverData: T[] = await response.json();
      
      try {
        const store = getDbStore();
        await store.clear();
        await store.putAll(serverData);
        
        const syncMeta: SyncMeta = {
          storeName: dataType,
          lastSync: new Date().toISOString(),
          recordCount: serverData.length,
        };
        await adminDB.syncMeta.set(syncMeta);
      } catch (dbError) {
        console.warn(`IndexedDB error for ${dataType}, using server data directly:`, dbError);
      }
      
      let filteredData: T[];
      if (isTransactionalType(dataType) && currentUnidadId.current && currentUnidadId.current !== "all") {
        filteredData = serverData.filter((item: any) => 
          item.unidadProduccionId === currentUnidadId.current
        );
      } else {
        filteredData = serverData;
      }
      
      filteredData.sort((a: any, b: any) => {
        if (a.fecha && b.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        if (a.nombre && b.nombre) {
          return a.nombre.localeCompare(b.nombre);
        }
        return 0;
      });
      
      setData(filteredData);
      setLastSync(new Date());
      setSyncStatus("synced");
    } catch (error) {
      console.error(`Error syncing ${dataType} with server:`, error);
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [dataType, enabled, getDbStore]);

  const refetch = useCallback(async () => {
    await syncWithServer();
  }, [syncWithServer]);

  useEffect(() => {
    currentUnidadId.current = unidadId;
  }, [unidadId]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }

    loadFromLocal();
    
    syncWithServer();
  }, [enabled, loadFromLocal, syncWithServer]);

  useEffect(() => {
    if (!enabled) return;
    
    const reloadFromLocal = async () => {
      const store = getDbStore();
      let localData: T[];
      
      if (isTransactionalType(dataType) && unidadId && unidadId !== "all") {
        localData = await store.getByUnidad(unidadId);
      } else {
        localData = await store.getAll();
      }
      
      localData.sort((a: any, b: any) => {
        if (a.fecha && b.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        if (a.nombre && b.nombre) {
          return a.nombre.localeCompare(b.nombre);
        }
        return 0;
      });
      
      setData(localData);
    };
    
    reloadFromLocal();
  }, [unidadId, enabled, getDbStore, dataType]);

  return {
    data,
    isLoading,
    isSyncing,
    lastSync,
    refetch,
    syncStatus,
  };
}

export function useLocalMutation<T extends { id: string }>(dataType: DataType) {
  const getDbStore = useCallback(() => {
    return adminDB[dataType] as any;
  }, [dataType]);

  const addLocal = useCallback(async (record: T) => {
    const store = getDbStore();
    await store.putOne(record);
  }, [getDbStore]);

  const updateLocal = useCallback(async (record: T) => {
    const store = getDbStore();
    await store.putOne(record);
  }, [getDbStore]);

  const deleteLocal = useCallback(async (id: string) => {
    const store = getDbStore();
    await store.deleteOne(id);
  }, [getDbStore]);

  return {
    addLocal,
    updateLocal,
    deleteLocal,
  };
}
