const GRID_DEFAULTS: Record<string, unknown> = {
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

export async function getGridDefaults(): Promise<Record<string, unknown> | null> {
  return GRID_DEFAULTS;
}

export function clearGridDefaultsCache() {
  // No-op: defaults are now static
}
