import { useState, useEffect, useCallback, useRef } from "react";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";

const FILTER_TABLE_ID = "filtros_globales";

export function usePersistedFilter(
  windowId: string,
  filterName: string,
  defaultValue: string = "all"
): [string, (value: string) => void] {
  const settingType = `${windowId}_${filterName}`;
  const { getFilterValue, saveFilterValue, loaded } = useGridPreferences();
  const initializedRef = useRef(false);
  const touchedRef = useRef(false);

  const [value, setValue] = useState<string>(defaultValue);

  useEffect(() => {
    if (!loaded || initializedRef.current) return;
    initializedRef.current = true;
    if (touchedRef.current) return;
    const stored = getFilterValue(FILTER_TABLE_ID, settingType);
    if (stored !== undefined) {
      setValue(stored);
    }
  }, [loaded, settingType, getFilterValue]);

  const setPersistedValue = useCallback((newValue: string) => {
    touchedRef.current = true;
    setValue(newValue);
    saveFilterValue(FILTER_TABLE_ID, settingType, newValue);
  }, [settingType, saveFilterValue]);

  return [value, setPersistedValue];
}
