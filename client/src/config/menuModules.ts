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
  { id: "cheques", label: "Cheques", color: "blue" },
  { id: "cosecha", label: "Cosecha", color: "indigo" },
  { id: "parametros", label: "Parámetros de Sistema", color: "violet" },
  { id: "transferencias", label: "Transferencias", color: "purple" },
];
