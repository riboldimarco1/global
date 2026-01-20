import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY_PREFIX = "column_widths_";

export interface ColumnConfig {
  key: string;
  defaultWidth: number;
  minWidth?: number;
}

export function useResizableColumns(tableId: string, columns: ColumnConfig[]) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;
  
  const getInitialWidths = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return columns.reduce((acc, col) => {
          acc[col.key] = parsed[col.key] ?? col.defaultWidth;
          return acc;
        }, {} as Record<string, number>);
      }
    } catch {}
    return columns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth;
      return acc;
    }, {} as Record<string, number>);
  }, [storageKey, columns]);

  const [widths, setWidths] = useState<Record<string, number>>(getInitialWidths);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {}
  }, [widths, storageKey]);

  const handleResize = useCallback((columnKey: string, newWidth: number) => {
    setWidths(prev => {
      const col = columns.find(c => c.key === columnKey);
      const minWidth = col?.minWidth ?? 40;
      const clampedWidth = Math.max(minWidth, newWidth);
      return { ...prev, [columnKey]: clampedWidth };
    });
  }, [columns]);

  const getColumnStyle = useCallback((columnKey: string) => {
    return { width: widths[columnKey] || 100, minWidth: columns.find(c => c.key === columnKey)?.minWidth ?? 40 };
  }, [widths, columns]);

  return { widths, handleResize, getColumnStyle };
}
