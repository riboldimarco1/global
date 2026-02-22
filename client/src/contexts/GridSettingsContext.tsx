import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface GridSettings {
  showPropietarioColumn: boolean;
  showUtilityColumn: boolean;
}

interface GridSettingsContextType {
  settings: GridSettings;
  togglePropietarioColumn: () => void;
  toggleUtilityColumn: () => void;
}

const STORAGE_KEY = "grid_settings";

const defaultSettings: GridSettings = {
  showPropietarioColumn: true,
  showUtilityColumn: true,
};

const GridSettingsContext = createContext<GridSettingsContextType | null>(null);

export function GridSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GridSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Error loading grid settings:", e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving grid settings:", e);
    }
  }, [settings]);

  const togglePropietarioColumn = () => {
    setSettings(prev => ({
      ...prev,
      showPropietarioColumn: !prev.showPropietarioColumn,
    }));
  };

  const toggleUtilityColumn = () => {
    setSettings(prev => ({
      ...prev,
      showUtilityColumn: !prev.showUtilityColumn,
    }));
  };

  return (
    <GridSettingsContext.Provider value={{ settings, togglePropietarioColumn, toggleUtilityColumn }}>
      {children}
    </GridSettingsContext.Provider>
  );
}

export function useGridSettings() {
  const context = useContext(GridSettingsContext);
  if (!context) {
    throw new Error("useGridSettings must be used within a GridSettingsProvider");
  }
  return context;
}
