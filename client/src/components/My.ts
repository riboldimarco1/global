// ============================================================================
// My.tsx - Archivo índice que exporta todos los componentes My*
// ============================================================================

// MyPag - Utilidad de paginación (definida aquí)
export interface MyPagOptions {
  limit?: number;
  offset?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

export interface MyPagResult {
  limit: number;
  offset: number;
  toQueryString: () => string;
  toSQLClause: () => string;
  apply: <T>(data: T[]) => T[];
}

export function MyPag(query: Record<string, any> = {}, options: MyPagOptions = {}): MyPagResult {
  const defaultLimit = options.defaultLimit ?? 100;
  const maxLimit = options.maxLimit ?? 500;
  
  const limit = Math.min(
    parseInt(query.limit as string) || options.limit || defaultLimit,
    maxLimit
  );
  const offset = parseInt(query.offset as string) || options.offset || 0;

  return {
    limit,
    offset,
    toQueryString: () => `limit=${limit}&offset=${offset}`,
    toSQLClause: () => `LIMIT ${limit} OFFSET ${offset}`,
    apply: <T>(data: T[]): T[] => data.slice(offset, offset + limit),
  };
}

// Re-exportar componentes desde sus archivos originales
export { default as MyWindow } from "./MyWindow";
export { default as MyGrid, type Column } from "./MyGrid";
export { default as MyTab, type TabConfig } from "./MyTab";
export { default as MyEditingForm } from "./MyEditingForm";
export { default as MyFiltroDeUnidad } from "./MyFiltroDeUnidad";
export { default as MyFiltroDeFecha } from "./MyFiltroDeFecha";
export { default as MyFiltroDeBanco, filterBancosByMoneda } from "./MyFiltroDeBanco";
export { default as MyButtons } from "./MyButtons";
export { default as MyFloating, calculateNumericSums } from "./MyFloating";
export { default as MyFilter, type BooleanFilter, type TextFilter, type SearchFilter, type ReportFilters } from "./MyFilter";
