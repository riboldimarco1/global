export type UserRole = "admin" | "guest" | "invitado" | null;

const AUTH_STORAGE_KEY = "user_role";
const PASSWORD_STORAGE_KEY = "admin_password";
const AUTH_TIMESTAMP_KEY = "auth_timestamp";
const UNIDAD_STORAGE_KEY = "selected_unidad";
const SESSION_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos
const DEFAULT_ADMIN_PASSWORD = "3112025";

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
