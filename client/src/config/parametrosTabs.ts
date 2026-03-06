// IMPORTANTE: Los tabs deben mantenerse en orden alfabético por label
// REGLA: Los colores siguen secuencia arcoíris (red, orange, yellow, green, teal, cyan, blue, indigo, violet, purple, pink, rose) repitiendo ciclo
import type { TabConfig } from "@/components/MyTab";

export const parametrosTabs: TabConfig[] = [
  {
    id: "claves",
    label: "Claves",
    tipo: "claves",
    color: "red",
    columns: [
      { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "constantes",
    label: "Constantes",
    tipo: "constante",
    color: "orange",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
      { key: "descripcion", label: "Valor", defaultWidth: 250, type: "text" },
    ],
  },
  {
    id: "unidad",
    label: "Unidades",
    tipo: "unidad",
    color: "yellow",
    columns: [
      { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
    ],
  },
];

const rainbowColors = ["red", "orange", "yellow", "green", "teal", "cyan", "blue", "indigo", "violet", "purple", "pink", "rose"] as const;

export const allParametrosTabsForPermissions: { id: string; label: string; color: string; module: string }[] = [
  { id: "claves", label: "Claves", module: "Parámetros", color: rainbowColors[0] },
  { id: "constantes", label: "Constantes", module: "Parámetros", color: rainbowColors[1] },
  { id: "unidad", label: "Unidades", module: "Parámetros", color: rainbowColors[2] },

  { id: "bancos", label: "Bancos", module: "Bancos", color: rainbowColors[3] },
  { id: "dolar", label: "Dólar", module: "Bancos", color: rainbowColors[4] },
  { id: "formadepago", label: "Operaciones Bancarias", module: "Bancos", color: rainbowColors[5] },

  { id: "actividades", label: "Actividades", module: "Administración", color: rainbowColors[6] },
  { id: "cargos", label: "Cargos", module: "Administración", color: rainbowColors[7] },
  { id: "clientes", label: "Clientes", module: "Administración", color: rainbowColors[8] },
  { id: "insumos", label: "Insumos", module: "Administración", color: rainbowColors[9] },
  { id: "personal", label: "Personal", module: "Administración", color: rainbowColors[10] },
  { id: "productos-admin", label: "Productos", module: "Administración", color: rainbowColors[11] },
  { id: "proveedores", label: "Proveedores", module: "Administración", color: rainbowColors[0] },

  { id: "equiposred", label: "Equipos de Red", module: "Agrodata", color: rainbowColors[1] },
  { id: "planes", label: "Planes", module: "Agrodata", color: rainbowColors[2] },

  { id: "categorias", label: "Categorías", module: "Almacén", color: rainbowColors[3] },
  { id: "fincas-almacen", label: "Fincas", module: "Almacén", color: rainbowColors[4] },
  { id: "suministros", label: "Suministros", module: "Almacén", color: rainbowColors[5] },

  { id: "opagro", label: "Operaciones Agronómicas", module: "Agronomía", color: rainbowColors[6] },

  { id: "centrales", label: "Centrales", module: "Arrime", color: rainbowColors[7] },
  { id: "constantes-arrime", label: "Constantes", module: "Arrime", color: rainbowColors[8] },
  { id: "fincasnucleo", label: "Fincas Núcleo", module: "Arrime", color: rainbowColors[9] },
  { id: "personalnucleo", label: "Personal Núcleo", module: "Arrime", color: rainbowColors[10] },
  { id: "placasnucleo", label: "Placas Núcleo", module: "Arrime", color: rainbowColors[11] },
  { id: "proveedoresnucleo", label: "Proveedores Núcleo", module: "Arrime", color: rainbowColors[0] },

  { id: "chofer", label: "Choferes", module: "Cosecha", color: rainbowColors[1] },
  { id: "ciclos", label: "Ciclos", module: "Cosecha", color: rainbowColors[2] },
  { id: "cultivo", label: "Cultivos", module: "Cosecha", color: rainbowColors[3] },
  { id: "destino", label: "Destino", module: "Cosecha", color: rainbowColors[4] },
  { id: "fincas-cosecha", label: "Fincas", module: "Cosecha", color: rainbowColors[5] },
  { id: "origen", label: "Origen", module: "Cosecha", color: rainbowColors[6] },
  { id: "placa", label: "Placas", module: "Cosecha", color: rainbowColors[7] },
  { id: "productos-cosecha", label: "Productos", module: "Cosecha", color: rainbowColors[8] },
  { id: "tablones", label: "Tablones", module: "Cosecha", color: rainbowColors[9] },

  { id: "maquinarias", label: "Maquinarias", module: "Reparaciones", color: rainbowColors[10] },
];
