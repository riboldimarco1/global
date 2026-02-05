import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useUserDefaults } from "./UserDefaultsContext";

type StyleMode = "alegre" | "minimizado";

interface StyleModeContextType {
  styleMode: StyleMode;
  setStyleMode: (mode: StyleMode) => void;
  toggleStyleMode: () => void;
  isAlegre: boolean;
}

const StyleModeContext = createContext<StyleModeContextType | undefined>(undefined);

const STYLE_MODE_KEY = "styleMode";

export function StyleModeProvider({ children }: { children: ReactNode }) {
  const { getValue, setValue, isLoaded } = useUserDefaults();
  const [styleMode, setStyleModeState] = useState<StyleMode>("alegre");

  useEffect(() => {
    if (isLoaded) {
      const stored = getValue(STYLE_MODE_KEY);
      if (stored === "alegre" || stored === "minimizado") {
        setStyleModeState(stored);
      }
    }
  }, [isLoaded, getValue]);

  const setStyleMode = useCallback((mode: StyleMode) => {
    setStyleModeState(mode);
    setValue(STYLE_MODE_KEY, mode);
  }, [setValue]);

  const toggleStyleMode = useCallback(() => {
    setStyleModeState(prev => {
      const newMode = prev === "alegre" ? "minimizado" : "alegre";
      setValue(STYLE_MODE_KEY, newMode);
      return newMode;
    });
  }, [setValue]);

  return (
    <StyleModeContext.Provider value={{ 
      styleMode, 
      setStyleMode, 
      toggleStyleMode,
      isAlegre: styleMode === "alegre"
    }}>
      {children}
    </StyleModeContext.Provider>
  );
}

export function useStyleMode() {
  const context = useContext(StyleModeContext);
  if (context === undefined) {
    throw new Error("useStyleMode must be used within a StyleModeProvider");
  }
  return context;
}
