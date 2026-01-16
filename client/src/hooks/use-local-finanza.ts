import { useState, useEffect, useCallback } from "react";
import type { FincaFinanza } from "@shared/schema";

const FINCAS_STORAGE_KEY = "finanza_fincas";

export function useLocalFinanza() {
  const [fincas, setFincas] = useState<FincaFinanza[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FINCAS_STORAGE_KEY);
      if (stored) {
        setFincas(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading fincas from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  const saveFincas = useCallback((newFincas: FincaFinanza[]) => {
    try {
      localStorage.setItem(FINCAS_STORAGE_KEY, JSON.stringify(newFincas));
      setFincas(newFincas);
    } catch (error) {
      console.error("Error saving fincas to localStorage:", error);
    }
  }, []);

  const addFinca = useCallback((finca: Omit<FincaFinanza, "id">) => {
    const newFinca: FincaFinanza = {
      ...finca,
      id: crypto.randomUUID(),
    };
    const updated = [...fincas, newFinca];
    saveFincas(updated);
    return newFinca;
  }, [fincas, saveFincas]);

  const updateFinca = useCallback((id: string, updates: Partial<Omit<FincaFinanza, "id">>) => {
    const updated = fincas.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    saveFincas(updated);
  }, [fincas, saveFincas]);

  const deleteFinca = useCallback((id: string) => {
    const updated = fincas.filter((f) => f.id !== id);
    saveFincas(updated);
  }, [fincas, saveFincas]);

  return {
    fincas,
    isLoaded,
    addFinca,
    updateFinca,
    deleteFinca,
  };
}
