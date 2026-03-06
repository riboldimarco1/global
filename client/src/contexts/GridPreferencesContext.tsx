import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface GridPrefs {
  widths?: Record<string, number>;
  order?: string[];
  hidden?: string[];
  [key: string]: any;
}

interface GridPreferencesContextType {
  getPrefs: (tableId: string) => GridPrefs;
  saveWidths: (tableId: string, widths: Record<string, number>) => void;
  saveOrder: (tableId: string, order: string[]) => void;
  saveHidden: (tableId: string, hidden: string[]) => void;
  flushAll: () => Promise<void>;
  loaded: boolean;
  getFilterValue: (tableId: string, settingType: string) => string | undefined;
  saveFilterValue: (tableId: string, settingType: string, value: string) => void;
}

const GridPreferencesContext = createContext<GridPreferencesContextType | null>(null);

const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function debouncedSave(key: string, tableId: string, settingType: string, value: any) {
  if (saveTimers[key]) clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => {
    apiRequest("PUT", `/api/grid-preferences/${encodeURIComponent(tableId)}/${settingType}`, { value }).catch(err => {
      console.error(`Error saving grid pref ${tableId}/${settingType}:`, err);
    });
  }, 500);
}

export function GridPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Record<string, GridPrefs>>({});
  const [loaded, setLoaded] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    fetch("/api/grid-preferences")
      .then(res => res.json())
      .then((data: Record<string, Record<string, any>>) => {
        const parsed: Record<string, GridPrefs> = {};
        for (const [tableId, settings] of Object.entries(data)) {
          parsed[tableId] = { ...settings };
          if (settings.widths) parsed[tableId].widths = settings.widths;
          if (settings.order) parsed[tableId].order = settings.order;
          if (settings.hidden) parsed[tableId].hidden = settings.hidden;
        }
        setPrefs(parsed);
        setLoaded(true);
      })
      .catch(err => {
        console.error("Error loading grid preferences:", err);
        setLoaded(true);
      });
  }, []);

  const getPrefs = useCallback((tableId: string): GridPrefs => {
    return prefsRef.current[tableId] || {};
  }, []);

  const saveWidths = useCallback((tableId: string, widths: Record<string, number>) => {
    setPrefs(prev => ({
      ...prev,
      [tableId]: { ...prev[tableId], widths },
    }));
    debouncedSave(`${tableId}_widths`, tableId, "widths", widths);
  }, []);

  const saveOrder = useCallback((tableId: string, order: string[]) => {
    setPrefs(prev => ({
      ...prev,
      [tableId]: { ...prev[tableId], order },
    }));
    debouncedSave(`${tableId}_order`, tableId, "order", order);
  }, []);

  const saveHidden = useCallback((tableId: string, hidden: string[]) => {
    setPrefs(prev => ({
      ...prev,
      [tableId]: { ...prev[tableId], hidden },
    }));
    debouncedSave(`${tableId}_hidden`, tableId, "hidden", hidden);
  }, []);

  const getFilterValue = useCallback((tableId: string, settingType: string): string | undefined => {
    const tablePrefs = prefsRef.current[tableId];
    if (!tablePrefs) return undefined;
    const val = tablePrefs[settingType];
    return typeof val === "string" ? val : undefined;
  }, []);

  const saveFilterValue = useCallback((tableId: string, settingType: string, value: string) => {
    setPrefs(prev => ({
      ...prev,
      [tableId]: { ...prev[tableId], [settingType]: value },
    }));
    debouncedSave(`${tableId}_${settingType}`, tableId, settingType, value);
  }, []);

  const flushAll = useCallback(async () => {
    for (const key of Object.keys(saveTimers)) {
      clearTimeout(saveTimers[key]);
      delete saveTimers[key];
    }
    const current = prefsRef.current;
    const promises: Promise<any>[] = [];
    for (const [tableId, settings] of Object.entries(current)) {
      for (const [settingType, value] of Object.entries(settings)) {
        if (value !== undefined) {
          promises.push(
            apiRequest("PUT", `/api/grid-preferences/${encodeURIComponent(tableId)}/${settingType}`, { value })
          );
        }
      }
    }
    await Promise.all(promises);
  }, []);

  return (
    <GridPreferencesContext.Provider value={{ getPrefs, saveWidths, saveOrder, saveHidden, flushAll, loaded, getFilterValue, saveFilterValue }}>
      {children}
    </GridPreferencesContext.Provider>
  );
}

export function useGridPreferences() {
  const context = useContext(GridPreferencesContext);
  if (!context) {
    throw new Error("useGridPreferences must be used within a GridPreferencesProvider");
  }
  return context;
}
