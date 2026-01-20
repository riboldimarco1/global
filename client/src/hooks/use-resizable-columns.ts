import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY_PREFIX = "column_widths_";

export interface ColumnConfig {
  key: string;
  defaultWidth: number;
  minWidth?: number;
}

export function useResizableColumns(tableId: string, columns: ColumnConfig[]) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;
  
  // Limpiar cualquier valor previo para forzar el reseteo
  useEffect(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getInitialWidths = useCallback(() => {
    // Forzar siempre los anchos por defecto para solucionar la desaparición
    return columns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth;
      return acc;
    }, {} as Record<string, number>);
  }, [columns]);

  const [widths, setWidths] = useState<Record<string, number>>(getInitialWidths);

  // Desactivar temporalmente la persistencia para asegurar el reseteo
  useEffect(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const handleResize = useCallback((columnKey: string, newWidth: number) => {
    setWidths(prev => {
      const col = columns.find(c => c.key === columnKey);
      const minWidth = col?.minWidth ?? 40;
      const clampedWidth = Math.max(minWidth, newWidth);
      return { ...prev, [columnKey]: clampedWidth };
    });
  }, [columns]);

  const getColumnStyle = useCallback((columnKey: string) => {
    const col = columns.find(c => c.key === columnKey);
    const width = widths[columnKey] || col?.defaultWidth || 100;
    const minWidth = col?.minWidth ?? 40;
    return { width, minWidth };
  }, [widths, columns]);

  return { widths, handleResize, getColumnStyle };
}
