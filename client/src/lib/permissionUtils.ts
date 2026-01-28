export interface UserPermissions {
  password: string;
  bancos: string[];
  tabs: string[];
  menu: string[];
}

export const AVAILABLE_MENU_ITEMS = [
  { id: "parametros", label: "Parámetros" },
  { id: "administracion", label: "Administración" },
  { id: "bancos", label: "Bancos" },
  { id: "cheques", label: "Cheques" },
  { id: "cosecha", label: "Cosecha" },
  { id: "almacen", label: "Almacén" },
  { id: "arrime", label: "Arrime" },
  { id: "transferencias", label: "Transferencias" },
];

export const AVAILABLE_PARAM_TABS = [
  { id: "actividades", label: "Actividades" },
  { id: "almacenes", label: "Almacén" },
  { id: "bancos", label: "Bancos" },
  { id: "cargas", label: "Cargas" },
  { id: "categorias", label: "Categorías" },
  { id: "chofer", label: "Choferes" },
  { id: "ciclos", label: "Ciclos" },
  { id: "claves", label: "Claves" },
  { id: "clientes", label: "Clientes" },
  { id: "cultivo", label: "Cultivos" },
  { id: "destino", label: "Destino" },
  { id: "dolar", label: "Dólar" },
  { id: "fincas", label: "Fincas" },
  { id: "insumos", label: "Insumos" },
  { id: "formadepago", label: "Operaciones" },
  { id: "origen", label: "Origen" },
  { id: "personal", label: "Personal" },
  { id: "placa", label: "Placas" },
  { id: "productos", label: "Productos" },
  { id: "proveedores", label: "Proveedores" },
  { id: "tablones", label: "Tablones" },
  { id: "unidad", label: "Unidad" },
];

export function encodePermissions(perms: UserPermissions): string {
  const parts: string[] = [];
  parts.push(`password:${perms.password}`);
  if (perms.bancos.length > 0) {
    parts.push(`bancos:${perms.bancos.join(",")}`);
  }
  if (perms.tabs.length > 0) {
    parts.push(`tabs:${perms.tabs.join(",")}`);
  }
  if (perms.menu.length > 0) {
    parts.push(`menu:${perms.menu.join(",")}`);
  }
  return parts.join("|");
}

export function decodePermissions(encoded: string): UserPermissions {
  const perms: UserPermissions = {
    password: "",
    bancos: [],
    tabs: [],
    menu: [],
  };
  
  if (!encoded) return perms;
  
  const parts = encoded.split("|");
  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!value) continue;
    
    switch (key) {
      case "password":
        perms.password = value;
        break;
      case "bancos":
        perms.bancos = value.split(",").filter(Boolean);
        break;
      case "tabs":
        perms.tabs = value.split(",").filter(Boolean);
        break;
      case "menu":
        perms.menu = value.split(",").filter(Boolean);
        break;
    }
  }
  
  return perms;
}
