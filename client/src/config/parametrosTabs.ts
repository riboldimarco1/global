import type { TabConfig } from "@/components/MyTab";

export const parametrosTabs: TabConfig[] = [
  {
    id: "unidades",
    label: "Unidades",
    tipo: "unidades",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "actividades",
    label: "Actividades",
    tipo: "actividades",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    tipo: "clientes",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "insumos",
    label: "Insumos",
    tipo: "insumos",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    tipo: "personal",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "productos",
    label: "Productos",
    tipo: "productos",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "proveedores",
    label: "Proveedores",
    tipo: "proveedores",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "bancos",
    label: "Bancos",
    tipo: "bancos",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones bancarias",
    tipo: "operaciones",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "operador", label: "Operador", defaultWidth: 100, type: "text" },
    ],
  },
  {
    id: "dolar",
    label: "Dólar",
    tipo: "dolar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
      { key: "valor", label: "Valor", defaultWidth: 120, type: "number" },
    ],
  },
  {
    id: "cultivo",
    label: "Cultivos",
    tipo: "cultivo",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "placa",
    label: "Placas",
    tipo: "placa",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Placa", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "chofer",
    label: "Choferes",
    tipo: "chofer",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "ced_rif", label: "Cédula", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
    ],
  },
  {
    id: "lote",
    label: "Lote",
    tipo: "lote",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "destino",
    label: "Destino",
    tipo: "destino",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "ciclo",
    label: "Ciclo",
    tipo: "ciclo",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "almacenes",
    label: "Almacenes",
    tipo: "almacenes",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "categorias",
    label: "Categorias",
    tipo: "categorias",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "origen",
    label: "Origen",
    tipo: "origen",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "tablones",
    label: "Tablones",
    tipo: "tablones",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "cargas",
    label: "Cargas",
    tipo: "cargas",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "claves",
    label: "Claves",
    tipo: "claves",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
  {
    id: "fincas",
    label: "Fincas",
    tipo: "fincas",
    columns: [
      { key: "abilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
    ],
  },
];
