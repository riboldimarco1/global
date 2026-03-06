import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { getStoredUsername } from "@/lib/auth";

interface UserDefaultsContextType {
  valores: Record<string, any>;
  getValue: (key: string) => any;
  setValue: (key: string, value: any) => void;
  deleteValue: (key: string) => void;
  isLoaded: boolean;
  syncToServer: () => Promise<void>;
}

const UserDefaultsContext = createContext<UserDefaultsContextType | null>(null);

export function UserDefaultsProvider({ children }: { children: ReactNode }) {
  const [valores, setValores] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef(false);

  const loadFromServer = useCallback(async () => {
    const username = getStoredUsername();
    if (!username) {
      setIsLoaded(true);
      return;
    }

    try {
      const response = await fetch(`/api/defaults/${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.valores && typeof data.valores === "object") {
          setValores(data.valores);
        }
      }
    } catch (error) {
      console.error("Error cargando configuración del usuario:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const syncToServer = useCallback(async () => {
    const username = getStoredUsername();
    if (!username) return;

    try {
      await fetch(`/api/defaults/${encodeURIComponent(username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      pendingChangesRef.current = false;
    } catch (error) {
      console.error("Error guardando configuración:", error);
    }
  }, [valores]);

  const scheduleSyncToServer = useCallback(() => {
    pendingChangesRef.current = true;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncToServer();
    }, 2000);
  }, [syncToServer]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  useEffect(() => {
    const handleAuthChange = () => {
      loadFromServer();
    };
    
    window.addEventListener("authChange", handleAuthChange);
    return () => {
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, [loadFromServer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingChangesRef.current) {
        const username = getStoredUsername();
        if (username) {
          navigator.sendBeacon(
            `/api/defaults/${encodeURIComponent(username)}`,
            JSON.stringify({ valores })
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [valores]);

  const getValue = useCallback((key: string) => {
    return valores[key];
  }, [valores]);

  const setValue = useCallback((key: string, value: any) => {
    setValores(prev => {
      const newValores = { ...prev, [key]: value };
      return newValores;
    });
    scheduleSyncToServer();
  }, [scheduleSyncToServer]);

  const deleteValue = useCallback((key: string) => {
    setValores(prev => {
      const newValores = { ...prev };
      delete newValores[key];
      return newValores;
    });
    scheduleSyncToServer();
  }, [scheduleSyncToServer]);

  return (
    <UserDefaultsContext.Provider value={{ 
      valores, 
      getValue, 
      setValue, 
      deleteValue, 
      isLoaded,
      syncToServer 
    }}>
      {children}
    </UserDefaultsContext.Provider>
  );
}

export function useUserDefaults() {
  const context = useContext(UserDefaultsContext);
  if (!context) {
    throw new Error("useUserDefaults must be used within a UserDefaultsProvider");
  }
  return context;
}
