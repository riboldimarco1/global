let cachedDefaults: Record<string, unknown> | null = null;
let fetchPromise: Promise<Record<string, unknown> | null> | null = null;

export async function getGridDefaults(): Promise<Record<string, unknown> | null> {
  if (cachedDefaults !== null) {
    return cachedDefaults;
  }
  
  if (fetchPromise) {
    return fetchPromise;
  }
  
  fetchPromise = (async () => {
    try {
      const response = await fetch("/api/grid-defaults");
      if (!response.ok) return null;
      const data = await response.json();
      if (data.config) {
        cachedDefaults = JSON.parse(data.config);
        return cachedDefaults;
      }
      cachedDefaults = {};
      return cachedDefaults;
    } catch {
      return null;
    }
  })();
  
  return fetchPromise;
}

export function clearGridDefaultsCache() {
  cachedDefaults = null;
  fetchPromise = null;
}
