import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, Edit2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  defaultWidth?: number;
  minWidth?: number;
  align?: "left" | "center" | "right";
  type?: "text" | "boolean" | "date" | "number";
}

interface MyGridProps {
  tableId: string;
  columns: Column[];
  data: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onDelete?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onEdit?: (row: Record<string, any>) => void;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
}

const STORAGE_KEY_PREFIX = "mygrid_widths_";
const PAGE_SIZE = 50;

function formatDate(value: any): string {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

function BooleanIndicator({ value, onClick }: { value: boolean; onClick?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          onClick?.();
        }
      }}
      className={`w-4 h-4 rounded-full cursor-pointer ${
        value ? "bg-green-500" : "bg-red-500"
      }`}
      data-testid="boolean-toggle"
      title={value ? "Sí (click para cambiar)" : "No (click para cambiar)"}
    />
  );
}

type SortDirection = "asc" | "desc";

function ResizableHeaderCell({
  column,
  width,
  onResize,
  isLast,
  sortKey,
  sortDirection,
  onSort,
}: {
  column: Column;
  width: number;
  onResize: (key: string, newWidth: number) => void;
  isLast: boolean;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
}) {
  const startX = useRef(0);
  const startWidth = useRef(0);
  const isSortable = column.type === "date" || column.type === "number";
  const isSorted = sortKey === column.key;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startWidth.current = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX.current;
        const newWidth = Math.max(column.minWidth || 40, startWidth.current + delta);
        onResize(column.key, newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [column.key, column.minWidth, width, onResize]
  );

  const handleHeaderClick = useCallback(() => {
    if (isSortable) {
      onSort(column.key);
    }
  }, [isSortable, column.key, onSort]);

  return (
    <TableHead
      className={`relative select-none border-r last:border-r-0 border-border/40 bg-muted/50 text-xs font-medium ${
        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
      } ${isSortable ? "cursor-pointer hover:bg-muted/80" : ""}`}
      style={{ width, minWidth: column.minWidth || 40 }}
      onClick={handleHeaderClick}
    >
      <div className="truncate pr-4 flex items-center gap-1">
        <span>{column.label}</span>
        {isSorted && (
          sortDirection === "asc" 
            ? <ArrowUp className="h-3 w-3" /> 
            : <ArrowDown className="h-3 w-3" />
        )}
        <span className="text-muted-foreground text-[10px]">({width})</span>
      </div>
      {!isLast && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border/20 hover:bg-primary/40 active:bg-primary transition-colors z-10"
          onMouseDown={handleMouseDown}
          data-testid={`resize-handle-${column.key}`}
        />
      )}
    </TableHead>
  );
}

export default function MyGrid({
  tableId,
  columns,
  data,
  onRowClick,
  selectedRowId,
  onDelete,
  onCopy,
  onEdit,
  onBooleanChange,
}: MyGridProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;

  const getInitialWidths = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const widths: Record<string, number> = {};
        columns.forEach((col) => {
          const val = parsed[col.key];
          widths[col.key] = typeof val === "number" && val > 20 ? val : col.defaultWidth || 120;
        });
        return widths;
      }
    } catch {}
    return columns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth || 120;
      return acc;
    }, {} as Record<string, number>);
  }, [storageKey, columns]);

  const [widths, setWidths] = useState<Record<string, number>>(getInitialWidths);

  // Sorting state - default to fecha column if exists
  const defaultSortKey = useMemo(() => {
    const fechaCol = columns.find(c => c.key === "fecha" && c.type === "date");
    return fechaCol ? "fecha" : null;
  }, [columns]);
  
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {}
  }, [widths, storageKey]);

  const handleResize = useCallback((key: string, newWidth: number) => {
    setWidths((prev) => ({ ...prev, [key]: newWidth }));
  }, []);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }, [sortKey]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    
    const col = columns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (col.type === "date") {
        const dateA = new Date(aVal).getTime();
        const dateB = new Date(bVal).getTime();
        comparison = dateA - dateB;
      } else if (col.type === "number") {
        comparison = Number(aVal) - Number(bVal);
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(0);
  }, [data.length, sortKey, sortDirection]);

  const renderCellValue = (row: Record<string, any>, col: Column) => {
    const value = row[col.key];

    if (col.type === "boolean") {
      return (
        <BooleanIndicator
          value={Boolean(value)}
          onClick={() => onBooleanChange?.(row, col.key, !value)}
        />
      );
    }

    if (col.type === "date") {
      return formatDate(value);
    }

    if (value === null || value === undefined) {
      return "-";
    }

    return String(value);
  };

  const hasActions = onDelete || onCopy || onEdit;
  const actionsWidth = 90;

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="flex-1">
        <Table style={{ tableLayout: "fixed" }}>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {hasActions && (
              <TableHead
                className="bg-muted/50 text-xs font-medium text-center border-r border-border/40"
                style={{ width: actionsWidth, minWidth: actionsWidth }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Acc.</span>
                  <span className="text-muted-foreground text-[10px]">({actionsWidth})</span>
                </div>
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <ResizableHeaderCell
                key={col.key}
                column={col}
                width={widths[col.key] || col.defaultWidth || 120}
                onResize={handleResize}
                isLast={idx === columns.length - 1}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((row, idx) => (
            <TableRow
              key={row.id || idx}
              className={`cursor-pointer hover:bg-muted/30 ${selectedRowId === row.id ? "bg-muted" : ""}`}
              onClick={() => onRowClick?.(row)}
              data-testid={`row-${idx}`}
            >
              {hasActions && (
                <TableCell
                  className="text-center py-0.5 border-r border-border/20"
                  style={{ width: actionsWidth }}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    {onEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(row);
                        }}
                        title="Editar"
                        data-testid={`action-edit-${idx}`}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                    )}
                    {onCopy && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy(row);
                        }}
                        title="Copiar"
                        data-testid={`action-copy-${idx}`}
                      >
                        <Copy className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(row);
                        }}
                        title="Borrar"
                        data-testid={`action-delete-${idx}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  style={{ width: widths[col.key] || col.defaultWidth || 120 }}
                  className={`text-xs py-1 truncate border-r border-border/10 last:border-r-0 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  } ${col.type === "boolean" ? "flex items-center justify-center" : ""}`}
                >
                  {renderCellValue(row, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground">
          {sortedData.length} registros | Página {currentPage + 1} de {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            data-testid="pagination-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            data-testid="pagination-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
