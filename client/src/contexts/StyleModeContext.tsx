import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useUserDefaults } from "./UserDefaultsContext";

type StyleMode = "alegre" | "minimizado";

interface StyleModeContextType {
  styleMode: StyleMode;
  setStyleMode: (mode: StyleMode) => void;
  toggleStyleMode: () => void;
  isAlegre: boolean;
  rainbowEnabled: boolean;
  toggleRainbow: () => void;
}

const StyleModeContext = createContext<StyleModeContextType | undefined>(undefined);

const STYLE_MODE_KEY = "styleMode";
const RAINBOW_KEY = "rainbowEnabled";

export function StyleModeProvider({ children }: { children: ReactNode }) {
  const { getValue, setValue, isLoaded } = useUserDefaults();
  const [styleMode, setStyleModeState] = useState<StyleMode>("alegre");
  const [rainbowEnabled, setRainbowEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (isLoaded) {
      const stored = getValue(STYLE_MODE_KEY);
      if (stored === "alegre" || stored === "minimizado") {
        setStyleModeState(stored);
      }
      const storedRainbow = getValue(RAINBOW_KEY);
      if (storedRainbow === "false") {
        setRainbowEnabled(false);
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

  const toggleRainbow = useCallback(() => {
    setRainbowEnabled(prev => {
      const newVal = !prev;
      setValue(RAINBOW_KEY, newVal ? "true" : "false");
      return newVal;
    });
  }, [setValue]);

  return (
    <StyleModeContext.Provider value={{ 
      styleMode, 
      setStyleMode, 
      toggleStyleMode,
      isAlegre: styleMode === "alegre",
      rainbowEnabled,
      toggleRainbow,
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
