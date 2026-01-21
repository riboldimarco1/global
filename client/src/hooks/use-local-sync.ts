import { useState, useEffect, useCallback, useRef } from "react";
import { adminDB, SyncMeta } from "@/lib/indexedDB";
import type { Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, MovimientoBancario } from "@shared/schema";

type DataType = "gastos" | "nominas" | "ventas" | "cuentasCobrar" | "cuentasPagar" | "prestamos" | "movimientosBancarios";

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
};

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return adminDB[dataType] as any;
  }, [dataType]);

  const loadFromLocal = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const store = getDbStore();
      let localData: T[];
      
      if (unidadId && unidadId !== "all") {
        localData = await store.getByUnidad(unidadId);
      } else {
        localData = await store.getAll();
      }
      
      localData.sort((a: any, b: any) => {
        if (a.fecha && b.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        return 0;
      });
      
      setData(localData);
      setIsLoading(false);
      
      const meta = await adminDB.syncMeta.get(dataType);
      if (meta) {
        setLastSync(new Date(meta.lastSync));
      }
    } catch (error) {
      console.error(`Error loading ${dataType} from IndexedDB:`, error);
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
      
      const store = getDbStore();
      await store.clear();
      await store.putAll(serverData);
      
      const syncMeta: SyncMeta = {
        storeName: dataType,
        lastSync: new Date().toISOString(),
        recordCount: serverData.length,
      };
      await adminDB.syncMeta.set(syncMeta);
      
      let filteredData: T[];
      if (currentUnidadId.current && currentUnidadId.current !== "all") {
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
      
      if (unidadId && unidadId !== "all") {
        localData = await store.getByUnidad(unidadId);
      } else {
        localData = await store.getAll();
      }
      
      localData.sort((a: any, b: any) => {
        if (a.fecha && b.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        return 0;
      });
      
      setData(localData);
    };
    
    reloadFromLocal();
  }, [unidadId, enabled, getDbStore]);

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
