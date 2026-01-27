import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface Parametro {
  id: string;
  tipo: string | null;
  nombre: string | null;
  unidad: string | null;
  habilitado: boolean | null;
  operador?: string | null;
}

interface ParametrosContextType {
  parametros: Parametro[];
  parametrosPorTipo: Record<string, string[]>;
  getOptions: (tipo: string, filtroUnidad?: string | null) => string[];
  getOperadorDeOperacion: (nombreOperacion: string) => string | null;
  isLoading: boolean;
}

const ParametrosContext = createContext<ParametrosContextType | null>(null);

const matchesTipo = (pTipo: string | null, targetTipo: string): boolean => {
  if (!pTipo) return false;
  const variations = new Set<string>();
  variations.add(targetTipo);
  if (targetTipo.endsWith("es")) {
    variations.add(targetTipo.slice(0, -2));
    variations.add(targetTipo.slice(0, -1));
  } else if (targetTipo.endsWith("s")) {
    variations.add(targetTipo.slice(0, -1));
  } else {
    variations.add(targetTipo + "s");
    variations.add(targetTipo + "es");
  }
  return variations.has(pTipo);
};

export function ParametrosProvider({ children }: { children: ReactNode }) {
  const { data: parametros = [], isLoading } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: false,
  });

  const parametrosPorTipo = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    parametros.forEach(p => {
      if (p.tipo && p.nombre && p.habilitado !== false) {
        if (!grouped[p.tipo]) {
          grouped[p.tipo] = [];
        }
        if (!grouped[p.tipo].includes(p.nombre)) {
          grouped[p.tipo].push(p.nombre);
        }
      }
    });
    Object.keys(grouped).forEach(tipo => {
      grouped[tipo].sort((a, b) => a.localeCompare(b));
    });
    return grouped;
  }, [parametros]);

  const getOptions = useMemo(() => {
    return (tipo: string, filtroUnidad?: string | null): string[] => {
      if (!filtroUnidad || filtroUnidad === "all") {
        const exactMatch = parametrosPorTipo[tipo];
        if (exactMatch && exactMatch.length > 0) return exactMatch;
        const matchingKey = Object.keys(parametrosPorTipo).find(k => matchesTipo(k, tipo));
        return matchingKey ? parametrosPorTipo[matchingKey] : [];
      }
      const filtered = parametros.filter(p => 
        matchesTipo(p.tipo, tipo) && 
        p.nombre && 
        p.habilitado !== false &&
        (!p.unidad || p.unidad === filtroUnidad)
      );
      const nombres = Array.from(new Set(filtered.map(p => p.nombre!)));
      return nombres.sort((a, b) => a.localeCompare(b));
    };
  }, [parametros, parametrosPorTipo]);

  const getOperadorDeOperacion = useMemo(() => {
    return (nombreOperacion: string): string | null => {
      const operacion = parametros.find(p => 
        matchesTipo(p.tipo, "formadepago") && 
        p.nombre === nombreOperacion
      );
      return operacion?.operador || null;
    };
  }, [parametros]);

  const value = useMemo(() => ({
    parametros,
    parametrosPorTipo,
    getOptions,
    getOperadorDeOperacion,
    isLoading,
  }), [parametros, parametrosPorTipo, getOptions, getOperadorDeOperacion, isLoading]);

  return (
    <ParametrosContext.Provider value={value}>
      {children}
    </ParametrosContext.Provider>
  );
}

export function useParametros() {
  const context = useContext(ParametrosContext);
  if (!context) {
    throw new Error("useParametros debe usarse dentro de ParametrosProvider");
  }
  return context;
}
