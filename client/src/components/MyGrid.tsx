import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, GripVertical, Check, Square } from "lucide-react";
import MyButtons from "./MyButtons";
import MyFloating, { calculateNumericSums } from "./MyFloating";
import MyEditingForm from "./MyEditingForm";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface Column {
  key: string;
  label: string;
  defaultWidth?: number;
  minWidth?: number;
  align?: "left" | "center" | "right";
  type?: "text" | "boolean" | "date" | "number" | "numericText";
}

const PROP_COLUMN: Column = { key: "prop", label: "Prop", defaultWidth: 180, minWidth: 100, type: "text", align: "left" };
const UTILITY_COLUMN: Column = { key: "utility", label: "U", defaultWidth: 32, type: "boolean", align: "center" };

interface MyGridProps {
  tableId: string;
  columns: Column[];
  data: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onCopy?: (row: Record<string, any>) => void;
  onEdit?: (row: Record<string, any>) => void;
  onDelete?: (row: Record<string, any>) => void;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
  showPropColumn?: boolean;
  showUtilityColumn?: boolean;
  onAgregar?: () => void;
  onExcel?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
  onRemove?: (id: string | number) => void;
  showAgregar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showBorrarFiltrados?: boolean;
  tableName?: string;
  excelFileName?: string;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  currentTabName?: string;
}

const STORAGE_KEY_PREFIX = "mygrid_widths_";
const STORAGE_KEY_ORDER_PREFIX = "mygrid_order_";
const PAGE_SIZE = 50;

function formatDate(value: any): string {
  if (!value) return "-";
  try {
    const str = String(value);
    // Si viene en formato yyyy-MM-dd, extraer directamente sin convertir a Date
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    // Si viene en otro formato, intentar parsear
    const date = new Date(str + "T12:00:00");
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

function formatNumber(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      className="cursor-pointer flex items-center justify-center"
      data-testid="boolean-toggle"
      title={value ? "Sí (click para cambiar)" : "No (click para cambiar)"}
    >
      <span className={`text-xs font-medium ${value ? "text-green-600" : "text-red-500"}`}>
        {value ? "si" : "no"}
      </span>
    </div>
  );
}

type SortDirection = "asc" | "desc";

const BOOLEAN_COLUMN_NAMES: Record<string, string> = {
  capital: "Capital",
  utility: "Utilidad",
  anticipo: "Anticipo",
};

function ResizableHeaderCell({
  column,
  width,
  onResize,
  isLast,
  sortKey,
  sortDirection,
  onSort,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  column: Column;
  width: number;
  onResize: (key: string, newWidth: number) => void;
  isLast: boolean;
  sortKey: string | null;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDrop: (key: string) => void;
  isDragging: boolean;
}) {
  const startX = useRef(0);
  const startWidth = useRef(0);
  const isSortable = column.type === "date" || column.type === "number" || column.type === "text";
  const isSorted = sortKey === column.key;
  const isBoolean = column.type === "boolean";
  const fullName = BOOLEAN_COLUMN_NAMES[column.key] || column.label;

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
      className={`relative select-none border-r last:border-r-0 border-border/40 text-xs font-medium sticky top-0 ${
        isBoolean ? "bg-purple-500/10" : isSortable ? "bg-blue-500/10" : "bg-muted/50"
      } ${
        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
      } ${isSortable ? "cursor-pointer hover:bg-blue-500/20" : ""} ${isDragging ? "opacity-50" : ""}`}
      style={{ width, minWidth: column.minWidth || 40 }}
      onClick={handleHeaderClick}
      draggable
      onDragStart={() => onDragStart(column.key)}
      onDragOver={(e) => onDragOver(e, column.key)}
      onDrop={() => onDrop(column.key)}
      title={fullName}
    >
      <div className={`truncate flex items-center gap-1 ${isBoolean ? "justify-center" : "pr-4"}`}>
        {!isBoolean && <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />}
        {isSortable && !isSorted && <ArrowUp className="h-3 w-3 text-muted-foreground/40" />}
        {isSorted && (
          sortDirection === "asc" 
            ? <ArrowUp className="h-3 w-3" /> 
            : <ArrowDown className="h-3 w-3" />
        )}
        <span>{column.label}</span>
        {!isBoolean && <span className="text-muted-foreground text-[10px]">({width})</span>}
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
  onCopy,
  onEdit,
  onDelete,
  onBooleanChange,
  showPropColumn = true,
  showUtilityColumn = true,
  onAgregar,
  onExcel,
  onSaveNew,
  onRefresh,
  onRemove,
  showAgregar = true,
  showCalcular = true,
  showExcel = true,
  showBorrarFiltrados = true,
  tableName,
  excelFileName,
  filtroDeUnidad = "",
  filtroDeBanco = "",
  hasMore = false,
  onLoadMore,
  currentTabName = "",
}: MyGridProps) {
  const { toast } = useToast();
  // Use passed columns directly, add utility column at start and prop column at end if enabled
  const allColumns = useMemo(() => {
    const cols = [...columns];
    // Add utility column at the beginning if enabled and not already present
    if (showUtilityColumn && !cols.some(c => c.key === "utility")) {
      cols.unshift(UTILITY_COLUMN);
    }
    if (showPropColumn) {
      cols.push(PROP_COLUMN);
    }
    return cols;
  }, [columns, showPropColumn, showUtilityColumn]);

  const storageKey = `${STORAGE_KEY_PREFIX}${tableId}`;

  const getInitialWidths = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const widths: Record<string, number> = {};
        allColumns.forEach((col) => {
          const val = parsed[col.key];
          widths[col.key] = typeof val === "number" && val > 20 ? val : col.defaultWidth || 120;
        });
        return widths;
      }
    } catch {}
    return allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth || 120;
      return acc;
    }, {} as Record<string, number>);
  }, [storageKey, allColumns]);

  const [widths, setWidths] = useState<Record<string, number>>(getInitialWidths);

  // Column order state
  const orderStorageKey = `${STORAGE_KEY_ORDER_PREFIX}${tableId}`;
  const getInitialOrder = useCallback(() => {
    try {
      const stored = localStorage.getItem(orderStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const columnKeys = allColumns.map(c => c.key);
        const validOrder = parsed.filter(k => columnKeys.includes(k));
        const missingKeys = columnKeys.filter(k => !validOrder.includes(k));
        return [...validOrder, ...missingKeys];
      }
    } catch {}
    return allColumns.map(c => c.key);
  }, [orderStorageKey, allColumns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(getInitialOrder);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Sync columnOrder when allColumns changes (e.g., excludeBooleanColumns prop changes)
  useEffect(() => {
    const columnKeys = allColumns.map(c => c.key);
    setColumnOrder(prev => {
      const validOrder = prev.filter(k => columnKeys.includes(k));
      const missingKeys = columnKeys.filter(k => !validOrder.includes(k));
      // If nothing valid, use default order
      if (validOrder.length === 0) {
        return columnKeys;
      }
      return [...validOrder, ...missingKeys];
    });
  }, [allColumns]);

  // Reordered columns based on order state
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(key => allColumns.find(c => c.key === key))
      .filter((c): c is Column => c !== undefined);
  }, [columnOrder, allColumns]);

  // Sorting state - default to fecha column if exists
  const defaultSortKey = useMemo(() => {
    const fechaCol = allColumns.find(c => c.key === "fecha" && c.type === "date");
    return fechaCol ? "fecha" : null;
  }, [allColumns]);
  
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(0);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const handleCalcular = useCallback(() => {
    setIsFloatingOpen(true);
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit" | "copy" | "delete">("new");

  const handleAgregar = useCallback(() => {
    if (onAgregar) {
      onAgregar();
    }
    setEditingRow(null);
    setFormMode("new");
    setIsFormOpen(true);
  }, [onAgregar]);

  const handleEditRow = useCallback((row: Record<string, any>) => {
    setEditingRow(row);
    setFormMode("edit");
    setIsFormOpen(true);
  }, []);

  const handleCopyRow = useCallback((row: Record<string, any>) => {
    const { id, created_at, ...rowWithoutId } = row;
    setEditingRow(rowWithoutId);
    setFormMode("copy");
    setIsFormOpen(true);
  }, []);

  const handleDeleteRow = useCallback((row: Record<string, any>) => {
    setEditingRow(row);
    setFormMode("delete");
    setIsFormOpen(true);
  }, []);

  const handleSaveNewRecord = useCallback((newData: Record<string, any>) => {
    if (onSaveNew) {
      onSaveNew(newData, (savedRecord) => {
        if (onRefresh) {
          onRefresh(savedRecord);
        }
        if (tableName) {
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
            }
          });
        }
      });
    }
  }, [onSaveNew, onRefresh, tableName]);

  const handleSaveEditedRecord = useCallback(async (formData: Record<string, any>) => {
    if (!editingRow || !tableName) return;
    
    try {
      const updateData = { ...formData, id: editingRow.id };
      await apiRequest("PUT", `/api/${tableName}/${editingRow.id}`, updateData);
      toast({ title: "Guardado", description: "Registro actualizado correctamente" });
      setEditingRow(null);
      setIsFormOpen(false);
      if (onRefresh) onRefresh(updateData);
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
        }
      });
    } catch (error) {
      console.error("Error updating record:", error);
      toast({ title: "Error", description: "No se pudo actualizar el registro", variant: "destructive" });
    }
  }, [editingRow, tableName, toast, onRefresh]);

  const handleFormSave = useCallback((formData: Record<string, any>) => {
    if (editingRow && formMode === "edit") {
      handleSaveEditedRecord(formData);
    } else {
      handleSaveNewRecord(formData);
    }
  }, [editingRow, formMode, handleSaveEditedRecord, handleSaveNewRecord]);

  const handleDeleteConfirm = useCallback(async (row: Record<string, any>) => {
    if (!row.id || !tableName) return;
    
    // Find index of deleted row to auto-select next
    const currentIndex = data.findIndex(r => String(r.id) === String(row.id));
    
    const response = await fetch(`/api/${tableName}/${row.id}`, { method: "DELETE" });
    if (response.ok) {
      toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
      
      // Auto-select next row (or previous if was last)
      if (currentIndex !== -1 && data.length > 1) {
        const nextIndex = currentIndex < data.length - 1 ? currentIndex + 1 : currentIndex - 1;
        const nextRow = data[nextIndex];
        if (nextRow && onRowClick) {
          onRowClick(nextRow);
        }
      }
      
      // For bancos, do full refresh to get recalculated saldo values
      // For other tables, remove record locally (no refresh needed)
      if (tableName === "bancos" && onRefresh) {
        onRefresh();
      } else if (onRemove) {
        onRemove(row.id);
      }
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
        }
      });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar el registro", variant: "destructive" });
      throw new Error("Delete failed");
    }
  }, [tableName, toast, onRemove, onRefresh, data, onRowClick]);

  const handleInternalBooleanChange = useCallback((row: Record<string, any>, field: string, value: boolean) => {
    if (!row.id || !tableName) return;
    
    const updatedRow = { ...row, [field]: value };
    if (onRefresh) onRefresh(updatedRow);
    
    apiRequest("PUT", `/api/${tableName}/${row.id}`, { [field]: value })
      .then(() => {
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
          }
        });
      })
      .catch((error) => {
        console.error("Error updating boolean field:", error);
        if (onRefresh) onRefresh(row);
        toast({ title: "Error", description: "No se pudo actualizar el campo", variant: "destructive" });
      });
  }, [tableName, toast, onRefresh]);

  const handleExcelExport = useCallback(() => {
    if (onExcel) {
      onExcel();
      return;
    }
    
    if (data.length === 0) {
      toast({ title: "Sin datos", description: "No hay registros para exportar" });
      return;
    }
    
    if (columns.length === 0) {
      toast({ title: "Error", description: "No hay columnas configuradas" });
      return;
    }
    
    try {
      const exportData = data.map(row => {
        const exportRow: Record<string, any> = {};
        columns.forEach(col => {
          let value = row[col.key];
          if (col.type === "date" && value) {
            value = formatDate(value);
          } else if (col.type === "boolean") {
            value = value ? "Sí" : "No";
          }
          exportRow[col.label] = value ?? "";
        });
        return exportRow;
      });
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const fileName = excelFileName || `${tableId}_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(blob, fileName);
      toast({ title: "Exportado", description: `${data.length} registros exportados a Excel` });
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast({ title: "Error", description: "No se pudo exportar a Excel" });
    }
  }, [onExcel, data, columns, tableId, excelFileName, toast]);

  const handleBorrarFiltrados = useCallback(async () => {
    if (data.length === 0) {
      toast({ title: "Sin datos", description: "No hay registros para borrar" });
      return;
    }
    
    if (!tableName) {
      toast({ title: "Error", description: "No se puede borrar: tabla no configurada" });
      return;
    }
    
    const ids = data.map(row => row.id).filter(id => id != null);
    if (ids.length === 0) {
      toast({ title: "Error", description: "No hay registros con ID válido" });
      return;
    }
    
    toast({
      title: `¿Borrar ${ids.length} registros filtrados?`,
      description: "Esta acción no se puede deshacer",
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={async () => {
            try {
              const response = await apiRequest("POST", "/api/bulk-delete", { table: tableName, ids });
              const result = await response.json();
              toast({ title: "Borrado", description: `${result.deleted} de ${result.total} registros eliminados` });
              queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
              if (onRefresh) onRefresh();
            } catch (error) {
              console.error("Error al borrar:", error);
              toast({ title: "Error", description: "No se pudieron borrar los registros" });
            }
          }}
        >
          Confirmar
        </Button>
      ),
    });
  }, [data, tableName, onRefresh, toast]);

  const calculations = useMemo(() => {
    return calculateNumericSums(data, columns);
  }, [data, columns]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {}
  }, [widths, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(columnOrder));
    } catch {}
  }, [columnOrder, orderStorageKey]);

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

  const handleDragStart = useCallback((key: string) => {
    setDraggedColumn(key);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetKey: string) => {
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      return;
    }
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const draggedIdx = newOrder.indexOf(draggedColumn);
      const targetIdx = newOrder.indexOf(targetKey);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColumn);
      return newOrder;
    });
    setDraggedColumn(null);
  }, [draggedColumn]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    
    const col = allColumns.find(c => c.key === sortKey);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (col.type === "date") {
        // Comparar fechas como strings - formato yyyy-MM-dd es lexicográficamente ordenable
        comparison = String(aVal).localeCompare(String(bVal));
      } else if (col.type === "number") {
        comparison = Number(aVal) - Number(bVal);
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, allColumns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  // Reset page when sort changes or data is replaced (not appended)
  const prevDataLengthRef = useRef(data.length);
  useEffect(() => {
    const prevLength = prevDataLengthRef.current;
    prevDataLengthRef.current = data.length;
    
    // Only reset if data decreased (replaced) or sort changed, not when appending
    if (data.length < prevLength) {
      setCurrentPage(0);
    }
  }, [data.length]);
  
  useEffect(() => {
    setCurrentPage(0);
  }, [sortKey, sortDirection]);

  const renderCellValue = (row: Record<string, any>, col: Column) => {
    const value = row[col.key];

    if (col.type === "boolean") {
      const handler = onBooleanChange || (tableName ? handleInternalBooleanChange : undefined);
      return (
        <BooleanIndicator
          value={Boolean(value)}
          onClick={() => handler?.(row, col.key, !value)}
        />
      );
    }

    if (col.type === "date") {
      return formatDate(value);
    }

    if (col.type === "number") {
      return formatNumber(value);
    }

    if (value === null || value === undefined) {
      return "-";
    }

    return String(value);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col h-full w-full border rounded-md bg-background">
          <div 
            ref={tableScrollRef}
            className="flex-1 overflow-auto pb-6"
          >
              <Table style={{ tableLayout: "fixed" }}>
                <TableHeader className="sticky top-0 z-30 bg-background">
                  <TableRow className="bg-muted/50">
                    {orderedColumns.map((col, idx) => (
                      <ResizableHeaderCell
                        key={col.key}
                        column={col}
                        width={widths[col.key] || col.defaultWidth || 120}
                        onResize={handleResize}
                        isLast={idx === orderedColumns.length - 1}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragging={draggedColumn === col.key}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, idx) => {
                    const operadorClass = row.operador === "suma" 
                      ? "bg-green-500/10 hover:bg-green-500/20" 
                      : row.operador === "resta" 
                        ? "bg-red-500/10 hover:bg-red-500/20" 
                        : "hover:bg-muted/30";
                    return (
                    <TableRow
                      key={row.id || idx}
                      className={`cursor-pointer ${operadorClass} ${selectedRowId === row.id ? "bg-muted" : ""}`}
                      onClick={() => onRowClick?.(row)}
                      data-testid={`row-${idx}`}
                    >
                        {orderedColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          style={{ width: widths[col.key] || col.defaultWidth || 120, maxWidth: widths[col.key] || col.defaultWidth || 120 }}
                          className={`text-xs py-1 border-r border-border/10 last:border-r-0 overflow-hidden ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          } ${col.type === "boolean" ? "bg-purple-500/5" : ""}`}
                        >
                          {col.type === "boolean" ? (
                            <div className="flex items-center justify-center h-full">
                              {renderCellValue(row, col)}
                            </div>
                          ) : (
                            <div 
                              className="truncate overflow-hidden whitespace-nowrap" 
                              style={{ maxWidth: widths[col.key] || col.defaultWidth || 120 }}
                              title={row[col.key] != null ? String(row[col.key]) : ""}
                            >
                              {renderCellValue(row, col)}
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 shrink-0 gap-2">
            <MyButtons
              onAgregar={handleAgregar}
              onEditar={() => {
                const selectedRow = data.find(r => String(r.id) === String(selectedRowId));
                if (selectedRow) handleEditRow(selectedRow);
              }}
              onCopiar={() => {
                const selectedRow = data.find(r => String(r.id) === String(selectedRowId));
                if (selectedRow) handleCopyRow(selectedRow);
              }}
              onBorrar={() => {
                const selectedRow = data.find(r => String(r.id) === String(selectedRowId));
                if (selectedRow) handleDeleteRow(selectedRow);
              }}
              onCalcular={handleCalcular}
              onExcel={handleExcelExport}
              onBorrarFiltrados={handleBorrarFiltrados}
              showAgregar={showAgregar}
              showCalcular={showCalcular}
              showExcel={showExcel}
              showBorrarFiltrados={showBorrarFiltrados && !!tableName}
              selectedRow={selectedRowId ? data.find(r => String(r.id) === String(selectedRowId)) || null : null}
            />
            <MyFloating
              isOpen={isFloatingOpen}
              onClose={() => setIsFloatingOpen(false)}
              totalRecords={data.length}
              calculations={calculations}
            />
            <MyEditingForm
              isOpen={isFormOpen}
              onClose={() => {
                setIsFormOpen(false);
                setEditingRow(null);
                setFormMode("new");
              }}
              onSave={handleFormSave}
              onDelete={handleDeleteConfirm}
              columns={columns}
              filtroDeUnidad={filtroDeUnidad}
              filtroDeBanco={filtroDeBanco}
              initialData={editingRow}
              isEditing={formMode === "edit"}
              mode={formMode === "delete" ? "delete" : (formMode === "edit" ? "edit" : "new")}
              title={formMode === "delete" ? "Eliminar Registro" : (formMode === "copy" ? "Copiar Registro" : (formMode === "edit" ? "Editar Registro" : "Agregar Registro"))}
              currentTabName={currentTabName}
            />
            <div className="flex items-center gap-3 px-3 py-1 rounded-md bg-gradient-to-br from-amber-500/10 to-orange-500/20 border border-amber-500/30">
              <span className="text-xs text-muted-foreground cursor-default">
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
                  onClick={() => {
                    const nextPage = currentPage + 1;
                    if (nextPage < totalPages) {
                      setCurrentPage(nextPage);
                    }
                    if (hasMore && nextPage >= totalPages - 1 && onLoadMore) {
                      onLoadMore();
                    }
                  }}
                  disabled={currentPage >= totalPages - 1 && !hasMore}
                  data-testid="pagination-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
        MyGrid
      </TooltipContent>
    </Tooltip>
  );
}
