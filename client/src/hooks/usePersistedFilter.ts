import { useState, useEffect, useCallback, useRef } from "react";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";
import { getStoredUsername } from "@/lib/auth";

const FILTER_TABLE_ID = "filtros_globales";
const GLOBAL_FILTERS = ["unidad"];

export function usePersistedFilter(
  windowId: string,
  filterName: string,
  defaultValue: string = "all"
): [string, (value: string) => void] {
  const isGlobal = GLOBAL_FILTERS.includes(filterName);
  const username = getStoredUsername() || "default";
  const settingType = isGlobal ? `global_${filterName}_${username}` : `${windowId}_${filterName}_${username}`;
  const { getFilterValue, saveFilterValue, loaded } = useGridPreferences();
  const initializedRef = useRef(false);
  const touchedRef = useRef(false);

  const [value, setValue] = useState<string>(() => {
    const stored = getFilterValue(FILTER_TABLE_ID, settingType);
    if (stored !== undefined) {
      initializedRef.current = true;
      return stored;
    }
    return defaultValue;
  });

  useEffect(() => {
    if (!loaded || initializedRef.current) return;
    initializedRef.current = true;
    if (touchedRef.current) return;
    const stored = getFilterValue(FILTER_TABLE_ID, settingType);
    if (stored !== undefined) {
      setValue(stored);
    }
  }, [loaded, settingType, getFilterValue]);

  useEffect(() => {
    if (!isGlobal) return;
    const handler = (e: CustomEvent<{ filterName: string; value: string }>) => {
      if (e.detail.filterName === filterName) {
        setValue(e.detail.value);
      }
    };
    window.addEventListener("globalFilterChanged", handler as EventListener);
    return () => {
      window.removeEventListener("globalFilterChanged", handler as EventListener);
    };
  }, [isGlobal, filterName]);

  const setPersistedValue = useCallback((newValue: string) => {
    touchedRef.current = true;
    setValue(newValue);
    saveFilterValue(FILTER_TABLE_ID, settingType, newValue);
    if (isGlobal) {
      window.dispatchEvent(new CustomEvent("globalFilterChanged", {
        detail: { filterName, value: newValue },
      }));
    }
  }, [settingType, saveFilterValue, isGlobal, filterName]);

  return [value, setPersistedValue];
}
