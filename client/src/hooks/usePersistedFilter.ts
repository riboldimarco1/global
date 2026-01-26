import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "filtro_";

export function usePersistedFilter(
  windowId: string,
  filterName: string,
  defaultValue: string = "all"
): [string, (value: string) => void] {
  const storageKey = `${STORAGE_KEY_PREFIX}${windowId}_${filterName}`;

  const [value, setValue] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
    }
  }, [storageKey, value]);

  const setPersistedValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  return [value, setPersistedValue];
}

export function getPersistedFilter(windowId: string, filterName: string, defaultValue: string = "all"): string {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${windowId}_${filterName}`);
    return stored !== null ? stored : defaultValue;
  } catch {
    return defaultValue;
  }
}
