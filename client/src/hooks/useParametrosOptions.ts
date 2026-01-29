import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface Parametro {
  id: number;
  tipo: string;
  nombre: string;
  habilitado: string | boolean;
  unidad?: string;
  banco?: string;
}

interface FilterOptions {
  unidad?: string;
  banco?: string;
}

const FIELD_TO_TIPO_MAP: Record<string, string> = {
  unidad: "unidad",
  insumo: "insumos",
  operacion: "formadepago",
  categoria: "categorias",
  cultivo: "cultivo",
  ciclo: "ciclo",
  chofer: "chofer",
  destino: "destino",
  banco: "bancos",
  actividad: "actividades",
  proveedor: "proveedores",
  personal: "personal",
  producto: "productos",
  cliente: "clientes",
};

function mapFieldToTipo(field: string): string {
  return FIELD_TO_TIPO_MAP[field] || field;
}

function getTipoVariations(tipo: string): string[] {
  const variations = new Set<string>();
  variations.add(tipo);
  
  if (tipo.endsWith("es")) {
    variations.add(tipo.slice(0, -2));
    variations.add(tipo.slice(0, -1));
  } else if (tipo.endsWith("s")) {
    variations.add(tipo.slice(0, -1));
  } else {
    variations.add(tipo + "s");
    variations.add(tipo + "es");
  }
  
  return Array.from(variations);
}

export function matchesTipo(pTipo: string, targetTipo: string): boolean {
  const variations = getTipoVariations(targetTipo);
  return variations.includes(pTipo);
}

export function useParametrosOptions(tipo: string, filterOptions?: FilterOptions): string[] {
  const { options } = useParametrosOptionsWithRefetch(tipo, filterOptions);
  return options;
}

export function useParametrosOptionsWithRefetch(tipo: string, filterOptions?: FilterOptions): { options: string[]; refetch: () => void } {
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const mappedTipo = mapFieldToTipo(tipo);

  const options = useMemo(() => {
    return parametros
      .filter((p) => {
        if (!matchesTipo(p.tipo, mappedTipo)) return false;
        if (!(p.habilitado === true || p.habilitado === "t")) return false;
        if (filterOptions?.unidad && filterOptions.unidad !== "all" && p.unidad && p.unidad !== filterOptions.unidad) return false;
        if (filterOptions?.banco && filterOptions.banco !== "all" && p.banco && p.banco !== filterOptions.banco) return false;
        return true;
      })
      .map((p) => p.nombre);
  }, [parametros, mappedTipo, filterOptions?.unidad, filterOptions?.banco]);

  return { options, refetch };
}

export function useMultipleParametrosOptions(fields: string[], filterOptions?: FilterOptions): Record<string, string[]> {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  return useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const field of fields) {
      const mappedTipo = mapFieldToTipo(field);
      result[field] = parametros
        .filter((p) => {
          if (!matchesTipo(p.tipo, mappedTipo)) return false;
          if (!(p.habilitado === true || p.habilitado === "t")) return false;
          if (filterOptions?.unidad && filterOptions.unidad !== "all" && p.unidad && p.unidad !== filterOptions.unidad) return false;
          if (filterOptions?.banco && filterOptions.banco !== "all" && p.banco && p.banco !== filterOptions.banco) return false;
          return true;
        })
        .map((p) => p.nombre);
    }
    return result;
  }, [parametros, fields, filterOptions?.unidad, filterOptions?.banco]);
}
