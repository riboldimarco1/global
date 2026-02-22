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
  suministro: "suministro",
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
  central: "central",
  cliente: "clientes",
  equipo: "equiposred",
  nucleo: "nucleos",
  placa: "placas",
  plan: "planes",
  ruta: "rutas",
  tablon: "tablones",
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

export interface ParametroOption {
  id: number;
  nombre: string;
}

export function useParametrosOptions(tipo: string, filterOptions?: FilterOptions): string[] {
  const { options } = useParametrosOptionsWithRefetch(tipo, filterOptions);
  return options.map(o => o.nombre);
}

export function useParametrosOptionsWithRefetch(tipo: string, filterOptions?: FilterOptions): { options: ParametroOption[]; refetch: () => void } {
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

  const mappedTipo = mapFieldToTipo(tipo);

  const options = useMemo(() => {
    return parametros
      .filter((p) => {
        if (!p.nombre) return false;
        if (!matchesTipo(p.tipo, mappedTipo)) return false;
        if (!(p.habilitado === true || p.habilitado === "t")) return false;
        if (filterOptions?.unidad && filterOptions.unidad !== "all" && p.unidad && p.unidad !== filterOptions.unidad) return false;
        if (filterOptions?.banco && filterOptions.banco !== "all" && p.banco && p.banco !== filterOptions.banco) return false;
        return true;
      })
      .map((p) => ({ id: p.id, nombre: p.nombre }));
  }, [parametros, mappedTipo, filterOptions?.unidad, filterOptions?.banco]);

  return { options, refetch };
}

export function useMultipleParametrosOptions(fields: string[], filterOptions?: FilterOptions): Record<string, string[]> {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

  const fieldsKey = JSON.stringify(fields);

  return useMemo(() => {
    const parsedFields: string[] = JSON.parse(fieldsKey);
    const result: Record<string, string[]> = {};
    for (const field of parsedFields) {
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
  }, [parametros, fieldsKey, filterOptions?.unidad, filterOptions?.banco]);
}
