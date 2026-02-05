import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type StyleMode = "alegre" | "minimizado";

interface StyleModeContextType {
  styleMode: StyleMode;
  setStyleMode: (mode: StyleMode) => void;
  toggleStyleMode: () => void;
  isAlegre: boolean;
}

const StyleModeContext = createContext<StyleModeContextType | undefined>(undefined);

const STYLE_MODE_STORAGE_KEY = "ui_style_mode";

export function StyleModeProvider({ children }: { children: ReactNode }) {
  const [styleMode, setStyleModeState] = useState<StyleMode>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem(STYLE_MODE_STORAGE_KEY);
      if (stored === "alegre" || stored === "minimizado") {
        return stored;
      }
    }
    return "alegre";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STYLE_MODE_STORAGE_KEY, styleMode);
    }
  }, [styleMode]);

  const setStyleMode = (mode: StyleMode) => {
    setStyleModeState(mode);
  };

  const toggleStyleMode = () => {
    setStyleModeState(prev => prev === "alegre" ? "minimizado" : "alegre");
  };

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
