const CACHE_PREFIX = 'parametros_cache_';
const CACHE_TIMESTAMP_PREFIX = 'parametros_cache_ts_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_PREFIX + key);
    
    if (!cached || !timestamp) {
      return null;
    }
    
    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    
    // Check if cache is still valid (within TTL)
    if (now - ts > CACHE_TTL) {
      // Cache expired, remove it
      localStorage.removeItem(CACHE_PREFIX + key);
      localStorage.removeItem(CACHE_TIMESTAMP_PREFIX + key);
      return null;
    }
    
    return JSON.parse(cached) as T;
  } catch (error) {
    console.error('Error reading from local cache:', error);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_PREFIX + key, Date.now().toString());
  } catch (error) {
    console.error('Error writing to local cache:', error);
    // If localStorage is full, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCache();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_PREFIX + key, Date.now().toString());
      } catch (e) {
        console.error('Still unable to write to cache after clearing:', e);
      }
    }
  }
}

export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(CACHE_PREFIX + key);
      localStorage.removeItem(CACHE_TIMESTAMP_PREFIX + key);
    } else {
      // Clear all cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(CACHE_PREFIX) || k.startsWith(CACHE_TIMESTAMP_PREFIX))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

function clearOldCache(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_TIMESTAMP_PREFIX)) {
        const ts = parseInt(localStorage.getItem(key) || '0', 10);
        if (now - ts > CACHE_TTL) {
          const dataKey = CACHE_PREFIX + key.replace(CACHE_TIMESTAMP_PREFIX, '');
          keysToRemove.push(key);
          keysToRemove.push(dataKey);
        }
      }
    }
    
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
}

// Cache keys for Parámetros tables
export const CACHE_KEYS = {
  UNIDADES_PRODUCCION: 'unidades_produccion',
  ACTIVIDADES: 'actividades',
  CLIENTES: 'clientes',
  INSUMOS: 'insumos',
  PERSONAL: 'personal',
  PRODUCTOS: 'productos',
  PROVEEDORES: 'proveedores',
  BANCOS: 'bancos',
  OPERACIONES_BANCARIAS: 'operaciones_bancarias',
  TASAS_DOLAR: 'tasas_dolar',
  GASTOS: 'gastos',
  NOMINAS: 'nominas',
  VENTAS: 'ventas',
  CUENTAS_COBRAR: 'cuentas_cobrar',
  CUENTAS_PAGAR: 'cuentas_pagar',
  PRESTAMOS: 'prestamos',
  MOVIMIENTOS_BANCARIOS: 'movimientos_bancarios',
} as const;

// Map API endpoints to cache keys
export const API_TO_CACHE_KEY: Record<string, string> = {
  '/api/unidades-produccion': CACHE_KEYS.UNIDADES_PRODUCCION,
  '/api/actividades': CACHE_KEYS.ACTIVIDADES,
  '/api/clientes': CACHE_KEYS.CLIENTES,
  '/api/insumos': CACHE_KEYS.INSUMOS,
  '/api/personal': CACHE_KEYS.PERSONAL,
  '/api/productos': CACHE_KEYS.PRODUCTOS,
  '/api/proveedores': CACHE_KEYS.PROVEEDORES,
  '/api/bancos': CACHE_KEYS.BANCOS,
  '/api/operaciones-bancarias': CACHE_KEYS.OPERACIONES_BANCARIAS,
  '/api/tasas-dolar': CACHE_KEYS.TASAS_DOLAR,
  '/api/administracion/gastos': CACHE_KEYS.GASTOS,
  '/api/administracion/nominas': CACHE_KEYS.NOMINAS,
  '/api/administracion/ventas': CACHE_KEYS.VENTAS,
  '/api/administracion/cuentas-cobrar': CACHE_KEYS.CUENTAS_COBRAR,
  '/api/administracion/cuentas-pagar': CACHE_KEYS.CUENTAS_PAGAR,
  '/api/administracion/prestamos': CACHE_KEYS.PRESTAMOS,
  '/api/administracion/movimientos-bancarios': CACHE_KEYS.MOVIMIENTOS_BANCARIOS,
};
