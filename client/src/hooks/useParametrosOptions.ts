import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface Parametro {
  id: number;
  tipo: string;
  nombre: string;
  abilitado: string | boolean;
}

export function useParametrosOptions(tipo: string): string[] {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    return parametros
      .filter((p) => p.tipo === tipo && (p.abilitado === true || p.abilitado === "t"))
      .map((p) => p.nombre);
  }, [parametros, tipo]);
}

export function useMultipleParametrosOptions(tipos: string[]): Record<string, string[]> {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const tipo of tipos) {
      result[tipo] = parametros
        .filter((p) => p.tipo === tipo && (p.abilitado === true || p.abilitado === "t"))
        .map((p) => p.nombre);
    }
    return result;
  }, [parametros, tipos]);
}
