export interface MenuModule {
  id: string;
  label: string;
  color: string;
}

export const menuModules: MenuModule[] = [
  { id: "parametros", label: "Parámetros", color: "red" },
  { id: "administracion", label: "Administración", color: "orange" },
  { id: "bancos", label: "Bancos", color: "yellow" },
  { id: "cheques", label: "Cheques", color: "green" },
  { id: "cosecha", label: "Cosecha", color: "teal" },
  { id: "almacen", label: "Almacén", color: "cyan" },
  { id: "arrime", label: "Arrime", color: "blue" },
  { id: "transferencias", label: "Transferencias", color: "indigo" },
  { id: "agrodata", label: "Agrodata", color: "violet" },
];
