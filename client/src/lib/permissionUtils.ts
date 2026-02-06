export interface UserPermissions {
  password: string;
  bancos: string[];
  tabs: string[];
  menu: string[];
  unidades: string[];
}

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
  if (perms.unidades.length > 0) {
    parts.push(`unidades:${perms.unidades.join(",")}`);
  }
  return parts.join("|");
}

export function decodePermissions(encoded: string): UserPermissions {
  const perms: UserPermissions = {
    password: "",
    bancos: [],
    tabs: [],
    menu: [],
    unidades: [],
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
      case "unidades":
        perms.unidades = value.split(",").filter(Boolean);
        break;
    }
  }
  
  return perms;
}
