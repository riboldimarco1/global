export type UserRole = "admin" | "invitado" | null;

const AUTH_STORAGE_KEY = "user_role";
const PASSWORD_STORAGE_KEY = "admin_password";
const DEFAULT_ADMIN_PASSWORD = "3112025";

export function getStoredRole(): UserRole {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === "admin" || stored === "invitado") {
      return stored;
    }
  }
  return null;
}

export function setStoredRole(role: UserRole): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (role) {
      localStorage.setItem(AUTH_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
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
}

export function canEdit(role: UserRole): boolean {
  return role === "admin";
}

export function canDelete(role: UserRole): boolean {
  return role === "admin";
}
