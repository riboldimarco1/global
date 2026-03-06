import { createContext, useContext, useState, useCallback, useMemo } from "react";

interface WindowDebugInfo {
  windowId: string;
  tableName: string;
  tableDataLength: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  totalLoaded: number;
}

interface DebugContextType {
  activeWindowDebug: WindowDebugInfo | null;
  allWindowsDebug: Record<string, WindowDebugInfo>;
  updateWindowDebug: (info: WindowDebugInfo) => void;
  removeWindowDebug: (windowId: string) => void;
  setActiveWindow: (windowId: string) => void;
}

const defaultContext: DebugContextType = {
  activeWindowDebug: null,
  allWindowsDebug: {},
  updateWindowDebug: () => {},
  removeWindowDebug: () => {},
  setActiveWindow: () => {},
};

export const DebugContext = createContext<DebugContextType>(defaultContext);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [allWindowsDebug, setAllWindowsDebug] = useState<Record<string, WindowDebugInfo>>({});
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const updateWindowDebug = useCallback((info: WindowDebugInfo) => {
    setAllWindowsDebug(prev => ({
      ...prev,
      [info.windowId]: info
    }));
  }, []);

  const removeWindowDebug = useCallback((windowId: string) => {
    setAllWindowsDebug(prev => {
      const next = { ...prev };
      delete next[windowId];
      return next;
    });
  }, []);

  const setActiveWindow = useCallback((windowId: string) => {
    setActiveWindowId(windowId);
  }, []);

  const activeWindowDebug = useMemo(() => {
    if (activeWindowId && allWindowsDebug[activeWindowId]) {
      return allWindowsDebug[activeWindowId];
    }
    const keys = Object.keys(allWindowsDebug);
    if (keys.length > 0) {
      return allWindowsDebug[keys[keys.length - 1]];
    }
    return null;
  }, [activeWindowId, allWindowsDebug]);

  const value = useMemo(() => ({
    activeWindowDebug,
    allWindowsDebug,
    updateWindowDebug,
    removeWindowDebug,
    setActiveWindow
  }), [activeWindowDebug, allWindowsDebug, updateWindowDebug, removeWindowDebug, setActiveWindow]);

  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebugContext() {
  return useContext(DebugContext);
}
