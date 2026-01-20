import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY_PREFIX = "column_widths_v2_";

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
        const validWidths: Record<string, number> = {};
        columns.forEach(col => {
          const val = parsed[col.key];
          validWidths[col.key] = (typeof val === 'number' && val > 20) ? val : col.defaultWidth;
        });
        return validWidths;
      }
    } catch (e) {}
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
    const col = columns.find(c => c.key === columnKey);
    const width = widths[columnKey] || col?.defaultWidth || 100;
    const minWidth = col?.minWidth ?? 40;
    return { width, minWidth };
  }, [widths, columns]);

  return { widths, handleResize, getColumnStyle };
}
