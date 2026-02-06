export interface MenuModule {
  id: string;
  label: string;
  color: string;
}

export const menuModules: MenuModule[] = [
  { id: "administracion", label: "Administración", color: "red" },
  { id: "agrodata", label: "Agrodata", color: "orange" },
  { id: "almacen", label: "Almacén", color: "yellow" },
  { id: "arrime", label: "Arrime", color: "green" },
  { id: "bancos", label: "Bancos", color: "teal" },
  { id: "cheques", label: "Cheques", color: "cyan" },
  { id: "cosecha", label: "Cosecha", color: "blue" },
  { id: "parametros", label: "Parámetros", color: "indigo" },
  { id: "transferencias", label: "Transferencias", color: "violet" },
];
