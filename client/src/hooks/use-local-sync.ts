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
    
    // Skip IndexedDB for now to diagnose sync issues - go straight to server
    setIsLoading(false);
  }, [enabled]);

  const syncWithServer = useCallback(async () => {
    if (!enabled || syncInProgress.current) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncStatus("syncing");
    console.log(`[useLocalSync] Starting sync for ${dataType}`);
    
    try {
      const endpoint = API_ENDPOINTS[dataType];
      console.log(`[useLocalSync] Fetching ${dataType} from ${endpoint}`);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const serverData: T[] = await response.json();
      console.log(`[useLocalSync] Got ${serverData.length} records for ${dataType}`);
      
      // Skip IndexedDB writes for now - just use server data directly
      
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
      console.log(`[useLocalSync] Sync complete for ${dataType}: ${filteredData.length} records`);
    } catch (error) {
      console.error(`[useLocalSync] Error syncing ${dataType}:`, error);
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
      console.log(`[useLocalSync] Sync finished for ${dataType}, isSyncing=false`);
    }
  }, [dataType, enabled]);

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
    
    // Re-sync when unidadId changes (skip IndexedDB reload for now)
    syncWithServer();
  }, [unidadId, enabled, syncWithServer]);

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
