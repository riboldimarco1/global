export type UserRole = "admin" | "guest" | "invitado" | null;

export interface UserPermissions {
  bancos: string[];
  tabs: string[];
  menu: string[];
  unidades: string[];
}

const AUTH_STORAGE_KEY = "user_role";
const PASSWORD_STORAGE_KEY = "admin_password";
const AUTH_TIMESTAMP_KEY = "auth_timestamp";
const UNIDAD_STORAGE_KEY = "selected_unidad";
const USERNAME_STORAGE_KEY = "current_username";
const PERMISSIONS_STORAGE_KEY = "user_permissions";
const SESSION_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos
const DEFAULT_ADMIN_PASSWORD = "exito2419bdai";

export function getStoredRole(): UserRole {
  if (typeof window !== "undefined" && window.localStorage) {
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    if (timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      if (elapsed > SESSION_DURATION) {
        logout();
        return null;
      }
    }
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === "admin" || stored === "invitado" || stored === "guest") {
      return stored;
    }
  }
  return null;
}

export function getStoredUnidad(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(UNIDAD_STORAGE_KEY) || "";
  }
  return "";
}

export function setStoredUnidad(unidadId: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (unidadId) {
      localStorage.setItem(UNIDAD_STORAGE_KEY, unidadId);
    } else {
      localStorage.removeItem(UNIDAD_STORAGE_KEY);
    }
  }
}

export function setStoredRole(role: UserRole): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (role) {
      localStorage.setItem(AUTH_STORAGE_KEY, role);
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    }
  }
}

export function getAdminPassword(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
  }
  return DEFAULT_ADMIN_PASSWORD;
}

export function setAdminPassword(password: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password);
  }
}

export function validateAdminPassword(password: string): boolean {
  return password === getAdminPassword();
}

export function logout(): void {
  setStoredRole(null);
  setStoredUnidad("");
  setStoredUsername("");
  setStoredPermissions(null);
}

export function getStoredUsername(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || "";
  }
  return "";
}

export function setStoredUsername(username: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (username) {
      localStorage.setItem(USERNAME_STORAGE_KEY, username);
    } else {
      localStorage.removeItem(USERNAME_STORAGE_KEY);
    }
  }
}

export function getStoredPermissions(): UserPermissions | null {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function setStoredPermissions(permissions: UserPermissions | null): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (permissions) {
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
    } else {
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    }
  }
}

export function hasMenuAccess(menuItem: string): boolean {
  const permissions = getStoredPermissions();
  if (!permissions) return true;
  if (permissions.menu.length === 0) return false;
  return permissions.menu.includes(menuItem);
}

export function hasBancoAccess(banco: string): boolean {
  const permissions = getStoredPermissions();
  if (!permissions) return true;
  if (permissions.bancos.length === 0) return false;
  return permissions.bancos.includes(banco);
}

export function hasTabAccess(tab: string): boolean {
  const permissions = getStoredPermissions();
  if (!permissions) return true;
  if (permissions.tabs.length === 0) return false;
  return permissions.tabs.includes(tab);
}

export function hasAnyTabAccess(tabIds: string[]): boolean {
  return tabIds.some(id => hasTabAccess(id));
}

export function hasUnidadAccess(unidad: string): boolean {
  const permissions = getStoredPermissions();
  if (!permissions) return true;
  if (permissions.unidades.length === 0) return false;
  return permissions.unidades.includes(unidad);
}

export function getAllowedUnidades(): string[] {
  const permissions = getStoredPermissions();
  if (!permissions) return [];
  return permissions.unidades;
}

export function canEdit(role: UserRole): boolean {
  return role === "admin";
}

export function isLoggedIn(role: UserRole): boolean {
  return role === "admin" || role === "guest" || role === "invitado";
}

export function canDelete(role: UserRole): boolean {
  return role === "admin";
}
