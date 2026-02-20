export interface MenuModule {
  id: string;
  label: string;
  color: string;
}

export const menuModules: MenuModule[] = [
  { id: "administracion", label: "Administración", color: "red" },
  { id: "agrodata", label: "Agrodata", color: "orange" },
  { id: "agronomia", label: "Agronomía", color: "yellow" },
  { id: "almacen", label: "Almacén", color: "green" },
  { id: "arrime", label: "Arrime", color: "teal" },
  { id: "bancos", label: "Bancos", color: "cyan" },
  { id: "bitacora", label: "Bitácora", color: "blue" },
  { id: "cosecha", label: "Cosecha", color: "indigo" },
  { id: "parametros", label: "Parámetros de Sistema", color: "purple" },
  { id: "reparaciones", label: "Reparaciones", color: "pink" },
  { id: "transferencias", label: "Transferencias", color: "rose" },
];
