import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface Parametro {
  id: number;
  tipo: string;
  nombre: string;
  abilitado: string | boolean;
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

export function useParametrosOptions(tipo: string): string[] {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const mappedTipo = mapFieldToTipo(tipo);

  return useMemo(() => {
    return parametros
      .filter((p) => p.tipo === mappedTipo && (p.abilitado === true || p.abilitado === "t"))
      .map((p) => p.nombre);
  }, [parametros, mappedTipo]);
}

export function useMultipleParametrosOptions(fields: string[]): Record<string, string[]> {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const field of fields) {
      const mappedTipo = mapFieldToTipo(field);
      result[field] = parametros
        .filter((p) => p.tipo === mappedTipo && (p.abilitado === true || p.abilitado === "t"))
        .map((p) => p.nombre);
    }
    return result;
  }, [parametros, fields]);
}
