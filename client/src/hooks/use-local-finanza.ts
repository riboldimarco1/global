import { useState, useEffect, useCallback } from "react";
import type { FincaFinanza, PagoFinanza } from "@shared/schema";

const FINCAS_STORAGE_KEY = "finanza_fincas";
const PAGOS_STORAGE_KEY = "finanza_pagos";

export function useLocalFinanza() {
  const [fincas, setFincas] = useState<FincaFinanza[]>([]);
  const [pagos, setPagos] = useState<PagoFinanza[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedFincas = localStorage.getItem(FINCAS_STORAGE_KEY);
      if (storedFincas) {
        setFincas(JSON.parse(storedFincas));
      }
      const storedPagos = localStorage.getItem(PAGOS_STORAGE_KEY);
      if (storedPagos) {
        setPagos(JSON.parse(storedPagos));
      }
    } catch (error) {
      console.error("Error loading finanza data from localStorage:", error);
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

  const savePagos = useCallback((newPagos: PagoFinanza[]) => {
    try {
      localStorage.setItem(PAGOS_STORAGE_KEY, JSON.stringify(newPagos));
      setPagos(newPagos);
    } catch (error) {
      console.error("Error saving pagos to localStorage:", error);
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

  const addPago = useCallback((pago: Omit<PagoFinanza, "id">) => {
    const newPago: PagoFinanza = {
      ...pago,
      id: crypto.randomUUID(),
    };
    const updated = [...pagos, newPago];
    savePagos(updated);
    return newPago;
  }, [pagos, savePagos]);

  const updatePago = useCallback((id: string, updates: Partial<Omit<PagoFinanza, "id">>) => {
    const updated = pagos.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    savePagos(updated);
  }, [pagos, savePagos]);

  const deletePago = useCallback((id: string) => {
    const updated = pagos.filter((p) => p.id !== id);
    savePagos(updated);
  }, [pagos, savePagos]);

  return {
    fincas,
    pagos,
    isLoaded,
    addFinca,
    updateFinca,
    deleteFinca,
    addPago,
    updatePago,
    deletePago,
  };
}
