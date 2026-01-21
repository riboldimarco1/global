import type { TabConfig } from "@/components/MyTab";

export const parametrosTabs: TabConfig[] = [
  {
    id: "unidades",
    label: "Unidades",
    clase: "unidades",
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
    clase: "actividades",
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
    clase: "clientes",
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
    clase: "insumos",
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
    clase: "personal",
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
    clase: "productos",
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
    clase: "proveedores",
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
    clase: "bancos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    clase: "operaciones",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "operador", label: "Operador", defaultWidth: 100, type: "text" },
    ],
  },
  {
    id: "dolar",
    label: "Dólar",
    clase: "dolar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
      { key: "valor", label: "Valor", defaultWidth: 120, type: "number" },
    ],
  },
];
