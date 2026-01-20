import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type WindowId = 
  | "menu" 
  | "parametros" 
  | "administracion" 
  | "bancos"
  | "cosecha" 
  | "almacen" 
  | "arrime" 
  | "finanza"
  | "transferencias";

interface WindowState {
  isOpen: boolean;
  zIndex: number;
}

interface WindowContextType {
  windows: Record<WindowId, WindowState>;
  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  getZIndex: (id: WindowId) => number;
  topZIndex: number;
}

const WindowContext = createContext<WindowContextType | null>(null);

const BASE_Z_INDEX = 100;

export function WindowProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Record<WindowId, WindowState>>({
    menu: { isOpen: true, zIndex: BASE_Z_INDEX },
    parametros: { isOpen: false, zIndex: BASE_Z_INDEX },
    administracion: { isOpen: false, zIndex: BASE_Z_INDEX },
    bancos: { isOpen: false, zIndex: BASE_Z_INDEX },
    cosecha: { isOpen: false, zIndex: BASE_Z_INDEX },
    almacen: { isOpen: false, zIndex: BASE_Z_INDEX },
    arrime: { isOpen: false, zIndex: BASE_Z_INDEX },
    finanza: { isOpen: false, zIndex: BASE_Z_INDEX },
    transferencias: { isOpen: false, zIndex: BASE_Z_INDEX },
  });

  const [topZIndex, setTopZIndex] = useState(BASE_Z_INDEX + 1);

  const focusWindow = useCallback((id: WindowId) => {
    setTopZIndex(prev => {
      const newTop = prev + 1;
      setWindows(w => ({
        ...w,
        [id]: { ...w[id], zIndex: newTop },
      }));
      return newTop;
    });
  }, []);

  const openWindow = useCallback((id: WindowId) => {
    setTopZIndex(prev => {
      const newTop = prev + 1;
      setWindows(w => ({
        ...w,
        [id]: { isOpen: true, zIndex: newTop },
      }));
      return newTop;
    });
  }, []);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows(w => ({
      ...w,
      [id]: { ...w[id], isOpen: false },
    }));
  }, []);

  const getZIndex = useCallback((id: WindowId) => {
    return windows[id]?.zIndex ?? BASE_Z_INDEX;
  }, [windows]);

  return (
    <WindowContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        focusWindow,
        getZIndex,
        topZIndex,
      }}
    >
      {children}
    </WindowContext.Provider>
  );
}

export function useWindows() {
  const ctx = useContext(WindowContext);
  if (!ctx) {
    throw new Error("useWindows must be used within a WindowProvider");
  }
  return ctx;
}
