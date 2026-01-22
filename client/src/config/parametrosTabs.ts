import type { TabConfig } from "@/components/MyTab";

export const parametrosTabs: TabConfig[] = [
  {
    id: "unidades",
    label: "Unidades",
    tipo: "unidades",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "actividades",
    label: "Actividades",
    tipo: "actividades",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    tipo: "clientes",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "insumos",
    label: "Insumos",
    tipo: "insumos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    tipo: "personal",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "productos",
    label: "Productos",
    tipo: "productos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "proveedores",
    label: "Proveedores",
    tipo: "proveedores",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "bancos",
    label: "Bancos",
    tipo: "bancos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
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
    label: "Cultivo",
    tipo: "cultivo",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "placa",
    label: "Placa",
    tipo: "placa",
    columns: [
      { key: "nombre", label: "Placa", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "chofer",
    label: "Chofer",
    tipo: "chofer",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "ced_rif", label: "Cédula", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "lote",
    label: "Lote",
    tipo: "lote",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "destino",
    label: "Destino",
    tipo: "destino",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "ciclo",
    label: "Ciclo",
    tipo: "ciclo",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
];
