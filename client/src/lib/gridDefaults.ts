const BASELINE_DEFAULTS: Record<string, unknown> = {
  "mygrid_widths_mytab-facturas": {
    "utility": 32,
    "fecha": 90,
    "descripcion": 200,
    "monto": 100,
    "montodol": 100,
    "capital": 80,
    "anticipo": 80,
    "proveedor": 150,
    "insumo": 120,
    "actividad": 120,
    "operacion": 100,
    "comprobante": 100,
    "relacionado": 50,
    "propietario": 150
  },
  "mygrid_order_bancos-movimientos": [
    "fecha", "operacion", "comprobante", "monto", "monto_dolares", "saldo",
    "saldo_conciliado", "descripcion", "banco", "conciliado", "utility",
    "relacionado", "propietario"
  ],
  "mygrid_widths_bancos-movimientos": {
    "fecha": 90,
    "banco": 100,
    "comprobante": 70,
    "operacion": 120,
    "descripcion": 200,
    "monto": 110,
    "monto_dolares": 100,
    "saldo": 110,
    "saldo_conciliado": 110,
    "conciliado": 50,
    "utility": 50,
    "relacionado": 50,
    "propietario": 150
  },
  "mygrid_order_mytab-facturas": [
    "utility", "fecha", "descripcion", "monto", "montodol", "capital",
    "anticipo", "relacionado", "proveedor", "insumo", "actividad",
    "operacion", "comprobante", "propietario"
  ]
};

let cachedDefaults: Record<string, unknown> | null = null;
let fetchPromise: Promise<Record<string, unknown> | null> | null = null;

export async function getGridDefaults(): Promise<Record<string, unknown> | null> {
  if (cachedDefaults !== null) {
    return cachedDefaults;
  }
  
  if (fetchPromise) {
    return fetchPromise;
  }
  
  fetchPromise = (async () => {
    try {
      const response = await fetch("/api/grid-defaults");
      if (!response.ok) {
        cachedDefaults = { ...BASELINE_DEFAULTS };
        return cachedDefaults;
      }
      const data = await response.json();
      if (data.config) {
        try {
          const serverDefaults = JSON.parse(data.config);
          cachedDefaults = { ...BASELINE_DEFAULTS, ...serverDefaults };
        } catch {
          cachedDefaults = { ...BASELINE_DEFAULTS };
        }
      } else {
        cachedDefaults = { ...BASELINE_DEFAULTS };
      }
      return cachedDefaults;
    } catch {
      cachedDefaults = { ...BASELINE_DEFAULTS };
      return cachedDefaults;
    }
  })();
  
  return fetchPromise;
}

export function clearGridDefaultsCache() {
  cachedDefaults = null;
  fetchPromise = null;
}
