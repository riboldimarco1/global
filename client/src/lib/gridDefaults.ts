const STORAGE_KEY = "grid_defaults_config";

export function getGridDefaults(): Record<string, unknown> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

export function saveGridDefaults(config: Record<string, unknown>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function clearGridDefaultsCache(): void {
  // No-op for compatibility - localStorage doesn't need cache clearing
}
