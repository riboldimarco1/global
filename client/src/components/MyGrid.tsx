import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowUp, ArrowDown, ChevronDown, GripVertical, Check, Square, X, Eye, EyeOff, ArrowUpDown } from "lucide-react";
import MyButtons from "./MyButtons";
import MyFloating, { calculateNumericSums } from "./MyFloating";
import MyEditingForm from "./MyEditingForm";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getGridDefaults } from "@/lib/gridDefaults";
import { useGridSettings } from "@/contexts/GridSettingsContext";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";
import { useTableData } from "@/contexts/TableDataContext";

export interface Column {
  key: string;
  label: string;
  defaultWidth?: number;
  minWidth?: number;
  align?: "left" | "center" | "right";
  type?: "text" | "boolean" | "date" | "number" | "numericText" | "ip" | "mac";
  editable?: boolean;
}

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
  showUtilityColumn?: boolean;
  onAgregar?: () => boolean | void;  // Retornar false para cancelar la apertura del formulario
  onExcel?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
  onRemove?: (id: string | number) => void;
  showAgregar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showBorrarFiltrados?: boolean;
  showRelacionar?: boolean;
  showGraficas?: boolean;
  showPing?: boolean;
  onGraficas?: () => void;
  onRelacionar?: () => void;
  onPing?: () => void;
  tableName?: string;
  excelFileName?: string;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  currentTabName?: string;
  newRecordDefaults?: Record<string, any>;
  onRecordSaved?: (record: Record<string, any>) => void;
  readOnly?: boolean;
  compactHeader?: boolean;
  totalCount?: number;
  disableCrud?: boolean;  // Deshabilita botones CRUD (Agregar, Editar, Copiar, Borrar)
  onDateStartClick?: (data: { fecha: string; id: string }) => void;  // Primer click en fecha: establece fecha inicial
  onDateEndClick?: (data: { fecha: string; id: string }) => void;    // Segundo click en fecha: establece fecha final
  dateClickState?: "none" | "start";  // Estado actual: none=esperando primer click, start=esperando segundo click
  extraButtons?: React.ReactNode;  // Botones adicionales para mostrar junto a los existentes
  middleButtons?: React.ReactNode;  // Botones entre Reportes y Borrar todos
  onReportes?: () => void;  // Función para abrir reportes
  showReportes?: boolean;  // Mostrar botón de reportes
  onOpenInBrowser?: () => void;  // Abrir IP en navegador
  showOpenInBrowser?: boolean;
  onPingOne?: () => void;  // Ping individual a registro seleccionado
  showPingOne?: boolean;
  onNetworkStatus?: () => void;  // Ver gráfica de estado de red
  showNetworkStatus?: boolean;
  onImportar?: () => void;  // Importar archivo bancario
  showImportar?: boolean;
  disableBorrarFiltrados?: boolean;  // Deshabilita "Borrar todos" cuando filtros son "todos"
}

const STORAGE_KEY_PREFIX = "mygrid_widths_";
const STORAGE_KEY_ORDER_PREFIX = "mygrid_order_";
function formatDate(value: any): string {
  if (!value) return "-";
  try {
    const str = String(value);
    // Si ya viene en formato dd/mm/aa o dd/mm/aaaa, mostrarlo directamente
    const ddmmMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (ddmmMatch) {
      const [, dd, mm, yy] = ddmmMatch;
      return `${dd}/${mm}/${yy.length > 2 ? yy.slice(-2) : yy}`;
    }
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
  transferencia: "Habilitado para Transferencias",
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
  onHeaderMenu,
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
  onHeaderMenu?: (key: string, x: number, y: number) => void;
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

  const handleHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onHeaderMenu?.(column.key, rect.left, rect.bottom);
  }, [column.key, onHeaderMenu]);

  return (
    <TableHead
      className={`relative select-none border-r last:border-r-0 border-border/40 text-xs font-medium sticky top-0 ${
        isBoolean ? "bg-purple-500/10" : isSortable ? "bg-blue-500/10" : "bg-muted/50"
      } ${
        column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"
      } cursor-pointer hover:bg-blue-500/20 ${isDragging ? "opacity-50" : ""}`}
      style={{ width, minWidth: column.minWidth || 40 }}
      onClick={handleHeaderClick}
      draggable
      onDragStart={() => onDragStart(column.key)}
      onDragOver={(e) => onDragOver(e, column.key)}
      onDrop={() => onDrop(column.key)}
      title={fullName}
      data-testid={`header-${column.key}`}
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
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-border/50 hover:bg-primary/60 active:bg-primary transition-colors z-10"
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
  showRelacionar = false,
  showGraficas = true,
  showPing = false,
  onGraficas,
  onRelacionar,
  onPing,
  tableName,
  excelFileName,
  filtroDeUnidad = "",
  filtroDeBanco = "",
  hasMore = false,
  onLoadMore,
  currentTabName = "",
  newRecordDefaults,
  onRecordSaved,
  readOnly = false,
  compactHeader = false,
  totalCount: totalCountProp,
  disableCrud = false,
  onDateStartClick,
  onDateEndClick,
  dateClickState = "none",
  extraButtons,
  middleButtons,
  onReportes,
  showReportes = false,
  onOpenInBrowser,
  showOpenInBrowser = false,
  onPingOne,
  showPingOne = false,
  onNetworkStatus,
  showNetworkStatus = false,
  onImportar,
  showImportar = false,
  disableBorrarFiltrados = false,
}: MyGridProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { settings: gridSettings } = useGridSettings();
  const { getPrefs, saveWidths: saveServerWidths, saveOrder: saveServerOrder, saveHidden: saveServerHidden, loaded: prefsLoaded } = useGridPreferences();
  const { totalCount: contextTotalCount, addCellFilter } = useTableData();
  
  const totalCount = totalCountProp !== undefined ? totalCountProp : contextTotalCount;
  
  const autoDisableCrud = (filtroDeUnidad === "all") || (filtroDeBanco === "all");
  const effectiveDisableCrud = disableCrud || autoDisableCrud;
  
  const allColumns = useMemo(() => {
    let cols = [...columns];
    if (!gridSettings.showPropietarioColumn) {
      cols = cols.filter(c => c.key !== "propietario");
    }
    if (showUtilityColumn && !cols.some(c => c.key === "utility")) {
      cols.unshift(UTILITY_COLUMN);
    }
    return cols;
  }, [columns, showUtilityColumn, gridSettings.showPropietarioColumn]);

  const serverPrefs = getPrefs(tableId);

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (serverPrefs.widths) {
      const w: Record<string, number> = {};
      allColumns.forEach(col => {
        const val = serverPrefs.widths?.[col.key];
        w[col.key] = typeof val === "number" && val > 20 ? val : col.defaultWidth || 120;
      });
      return w;
    }
    return allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth || 120;
      return acc;
    }, {} as Record<string, number>);
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (serverPrefs.order) {
      const columnKeys = allColumns.map(c => c.key);
      const validOrder = (serverPrefs.order as string[]).filter(k => columnKeys.includes(k));
      const missingKeys = columnKeys.filter(k => !validOrder.includes(k));
      return [...validOrder, ...missingKeys];
    }
    return allColumns.map(c => c.key);
  });

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    return (serverPrefs.hidden as string[]) || [];
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = getPrefs(tableId);
    if (prefs.widths) {
      const w: Record<string, number> = {};
      allColumns.forEach(col => {
        const val = (prefs.widths as Record<string, number>)?.[col.key];
        w[col.key] = typeof val === "number" && val > 20 ? val : col.defaultWidth || 120;
      });
      setWidths(w);
    }
    if (prefs.order) {
      const columnKeys = allColumns.map(c => c.key);
      const validOrder = (prefs.order as string[]).filter(k => columnKeys.includes(k));
      const missingKeys = columnKeys.filter(k => !validOrder.includes(k));
      setColumnOrder([...validOrder, ...missingKeys]);
    }
    if (prefs.hidden) {
      setHiddenColumns(prefs.hidden as string[]);
    }
  }, [prefsLoaded, tableId]);

  useEffect(() => {
    const columnKeys = allColumns.map(c => c.key);
    setColumnOrder(prev => {
      const validOrder = prev.filter(k => columnKeys.includes(k));
      const missingKeys = columnKeys.filter(k => !validOrder.includes(k));
      if (validOrder.length === 0) {
        return columnKeys;
      }
      return [...validOrder, ...missingKeys];
    });
  }, [allColumns]);

  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(key => allColumns.find(c => c.key === key))
      .filter((c): c is Column => c !== undefined)
      .filter(c => !hiddenColumns.includes(c.key));
  }, [columnOrder, allColumns, hiddenColumns]);

  const handleHideColumn = useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      saveServerHidden(tableId, next);
      return next;
    });
  }, [tableId, saveServerHidden]);

  const handleShowAllColumns = useCallback(() => {
    setHiddenColumns([]);
    saveServerHidden(tableId, []);
  }, [tableId, saveServerHidden]);

  // Sorting state - default to fecha DESC for chronological display
  const [sortKey, setSortKey] = useState<string | null>("fecha");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [headerMenu, setHeaderMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isBorrarDialogOpen, setIsBorrarDialogOpen] = useState(false);
  const [isBorrando, setIsBorrando] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const hasInitialSelection = useRef(false);

  // Scroll to top only on initial load (not when loading more data)
  const prevDataLength = useRef(0);
  useEffect(() => {
    if (tableScrollRef.current && data.length > 0) {
      // Only scroll to top if this is a fresh load (previous length was 0)
      if (prevDataLength.current === 0) {
        tableScrollRef.current.scrollTop = 0;
      }
    }
    // Reset when data is cleared (filter change)
    if (data.length === 0) {
      prevDataLength.current = 0;
    } else {
      prevDataLength.current = data.length;
    }
  }, [data.length]);

  const handleCalcular = useCallback(() => {
    setIsFloatingOpen(true);
  }, []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit" | "copy" | "delete">("new");

  const handleAgregar = useCallback(() => {
    // Si onAgregar retorna false, cancelar la apertura del formulario
    if (onAgregar) {
      const result = onAgregar();
      if (result === false) return;
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
      showPop({ title: "Error", message: "No se pudo actualizar el registro" });
    }
  }, [editingRow, tableName, toast, onRefresh, showPop]);

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
      showPop({ title: "Error", message: "No se pudo eliminar el registro" });
      throw new Error("Delete failed");
    }
  }, [tableName, toast, onRemove, onRefresh, data, onRowClick, showPop]);

  const dispatchDebugStep = (mensaje: string, tipo: "info" | "success" | "error" = "info", datos?: any) => {
    window.dispatchEvent(new CustomEvent("debugStep", {
      detail: { mensaje, tipo, datos, timestamp: new Date().toLocaleTimeString() }
    }));
  };

  const handleCellDoubleClick = useCallback((col: Column, value: any) => {
    if (col.key === "id" || col.type === "boolean") return;
    const stringValue = value != null ? String(value) : "";
    if (stringValue.trim() === "" || stringValue === "-") return;
    addCellFilter(col.key, stringValue);
    toast({ title: "Filtro agregado", description: `${col.label}: ${stringValue}` });
  }, [addCellFilter, toast]);

  const handleInternalBooleanChange = useCallback((row: Record<string, any>, field: string, value: boolean) => {
    if (!row.id || !tableName) return;
    
    // Optimistic update with just the boolean field
    const updatedRow = { ...row, [field]: value };
    if (onRefresh) onRefresh(updatedRow);
    
    // Log step for debug
    if (tableName === "bancos" && field === "conciliado") {
      dispatchDebugStep(`Enviando cambio de conciliado=${value} para registro ${row.id.substring(0, 8)}...`, "info");
    }
    
    apiRequest("PUT", `/api/${tableName}/${row.id}`, { [field]: value })
      .then(async (response) => {
        // For bancos table when conciliado changes, all subsequent saldos are recalculated
        // We need a full refresh to show updated saldos for all records
        if (tableName === "bancos" && field === "conciliado") {
          dispatchDebugStep(`Servidor respondio OK (${response.status})`, "success");
          
          try {
            const data = await response.json();
            const bancoNombre = data._bancoNombre || data.banco || "desconocido";
            
            if (data._registrosRecalculados && data._registrosRecalculados.length > 0) {
              dispatchDebugStep(`Servidor recalculo ${data._registrosRecalculados.length} registros para banco: ${bancoNombre}`, "success");
              
              window.dispatchEvent(new CustomEvent("bancosRecalculados", {
                detail: {
                  bancoNombre,
                  registros: data._registrosRecalculados,
                  registroModificadoId: row.id
                }
              }));
            } else {
              dispatchDebugStep(`No se recibieron registros recalculados del servidor`, "info", { responseKeys: Object.keys(data) });
            }
          } catch (e) {
            dispatchDebugStep(`Error al parsear respuesta del servidor: ${e}`, "error");
          }
          
          dispatchDebugStep("Refrescando datos de la grilla...", "info");
          
          // Force full data refresh from server
          if (onRefresh) {
            onRefresh(); // Full refresh without parameter
          }
          // Also force refetch of any cached queries
          await queryClient.refetchQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.startsWith(`/api/${tableName}`);
            }
          });
          
          dispatchDebugStep("Datos refrescados", "success");
        } else {
          // For other boolean fields, just invalidate cache
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const key = query.queryKey[0];
              return typeof key === 'string' && key.startsWith(`/api/${tableName}?`);
            }
          });
        }
      })
      .catch((error) => {
        if (tableName === "bancos" && field === "conciliado") {
          dispatchDebugStep(`Error al enviar cambio: ${error.message}`, "error");
        }
        console.error("Error updating boolean field:", error);
        if (onRefresh) onRefresh(row);
        showPop({ title: "Error", message: "No se pudo actualizar el campo" });
      });
  }, [tableName, toast, onRefresh, showPop]);

  const handleExcelExport = useCallback(() => {
    if (onExcel) {
      onExcel();
      return;
    }
    
    if (data.length === 0) {
      showPop({ title: "Sin datos", message: "No hay registros para exportar" });
      return;
    }
    
    if (columns.length === 0) {
      showPop({ title: "Error", message: "No hay columnas configuradas" });
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

  const handleBorrarFiltrados = useCallback(() => {
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
    
    setIsBorrarDialogOpen(true);
  }, [data, tableName, toast]);

  const handleConfirmarBorrado = useCallback(async () => {
    if (!tableName) return;
    
    const ids = data.map(row => row.id).filter(id => id != null);
    if (ids.length === 0) return;
    
    setIsBorrando(true);
    try {
      const response = await apiRequest("POST", "/api/bulk-delete", { table: tableName, ids });
      const result = await response.json();
      toast({ title: "Borrado", description: `${result.deleted} de ${result.total} registros eliminados` });
      queryClient.invalidateQueries({ queryKey: [`/api/${tableName}`] });
      if (tableName === "bancos") {
        queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      } else if (tableName === "administracion") {
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      }
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error al borrar:", error);
      toast({ title: "Error", description: "No se pudieron borrar los registros" });
    } finally {
      setIsBorrando(false);
      setIsBorrarDialogOpen(false);
    }
  }, [data, tableName, onRefresh, toast]);

  const calculations = useMemo(() => {
    return calculateNumericSums(data, columns);
  }, [data, columns]);

  const widthsInitialized = useRef(false);
  useEffect(() => {
    if (!widthsInitialized.current) {
      widthsInitialized.current = true;
      return;
    }
    saveServerWidths(tableId, widths);
  }, [widths, tableId, saveServerWidths]);

  const orderInitialized = useRef(false);
  useEffect(() => {
    if (!orderInitialized.current) {
      orderInitialized.current = true;
      return;
    }
    saveServerOrder(tableId, columnOrder);
  }, [columnOrder, tableId, saveServerOrder]);

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

  const handleHeaderMenu = useCallback((key: string, x: number, y: number) => {
    setHeaderMenu(prev => prev?.key === key ? null : { key, x, y });
  }, []);

  useEffect(() => {
    if (!headerMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenu(null);
      }
    };
    const handleScroll = () => setHeaderMenu(null);
    document.addEventListener("mousedown", handleClickOutside);
    tableScrollRef.current?.addEventListener("scroll", handleScroll);
    const scrollEl = tableScrollRef.current;
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      scrollEl?.removeEventListener("scroll", handleScroll);
    };
  }, [headerMenu]);

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

      // Si son iguales y ordenamos por fecha, usar id como ordenamiento secundario
      if (comparison === 0 && sortKey === "fecha") {
        const aId = Number(a.id) || 0;
        const bId = Number(b.id) || 0;
        comparison = aId - bId;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, allColumns]);

  // Auto-select first row (newest date) only on initial load
  useEffect(() => {
    if (sortedData.length > 0 && !hasInitialSelection.current) {
      hasInitialSelection.current = true;
      setFocusedRowIndex(0);
      if (onRowClick && sortedData[0]) {
        onRowClick(sortedData[0]);
      }
    } else if (sortedData.length === 0) {
      hasInitialSelection.current = false;
      setFocusedRowIndex(null);
    }
  }, [sortedData.length]);

  // Keyboard navigation handler - only active when grid container is focused
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (sortedData.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedRowIndex(prev => {
        const newIndex = prev === null ? 0 : Math.min(prev + 1, sortedData.length - 1);
        setTimeout(() => {
          rowRefs.current[newIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 0);
        if (sortedData[newIndex] && onRowClick) {
          onRowClick(sortedData[newIndex]);
        }
        return newIndex;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedRowIndex(prev => {
        const newIndex = prev === null ? sortedData.length - 1 : Math.max(prev - 1, 0);
        setTimeout(() => {
          const row = rowRefs.current[newIndex];
          const container = tableScrollRef.current;
          if (row && container) {
            const headerHeight = 40;
            const rowTop = row.offsetTop;
            const containerScrollTop = container.scrollTop;
            if (rowTop < containerScrollTop + headerHeight) {
              container.scrollTo({ top: rowTop - headerHeight, behavior: "smooth" });
            }
          }
        }, 0);
        if (sortedData[newIndex] && onRowClick) {
          onRowClick(sortedData[newIndex]);
        }
        return newIndex;
      });
    }
  }, [sortedData, onRowClick]);

  const renderCellValue = (row: Record<string, any>, col: Column) => {
    const value = row[col.key];

    if (col.type === "boolean") {
      const isEditable = col.editable !== false;
      const handler = isEditable ? (onBooleanChange || (tableName ? handleInternalBooleanChange : undefined)) : undefined;
      return (
        <BooleanIndicator
          value={Boolean(value)}
          onClick={handler ? () => handler(row, col.key, !value) : undefined}
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
    <>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col h-full w-full border rounded-md bg-background">
          <div 
            ref={tableScrollRef}
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            className="flex-1 overflow-auto pb-6 focus:outline-none"
          >
              <Table style={{ tableLayout: "fixed" }}>
                <TableHeader className="sticky top-0 z-30 bg-background">
                  <TableRow className={`bg-muted/50 ${compactHeader ? "[&>th]:py-0.5 [&>th]:text-[10px]" : ""}`}>
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
                        onHeaderMenu={handleHeaderMenu}
                      />
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row, idx) => {
                    const operadorClass = row.operador === "suma" 
                      ? "bg-green-500/10 hover:bg-green-500/20" 
                      : row.operador === "resta" 
                        ? "bg-red-500/10 hover:bg-red-500/20" 
                        : "hover:bg-muted/30";
                    const isFocused = focusedRowIndex === idx;
                    return (
                    <TableRow
                      ref={el => { rowRefs.current[idx] = el; }}
                      key={row.id || idx}
                      className={`cursor-pointer scroll-mt-24 ${selectedRowId === row.id ? "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 ring-2 ring-blue-500 ring-inset" : `${operadorClass} ${row.relacionado === true || row.relacionado === "t" ? "bg-blue-500/15" : ""}`} ${isFocused && selectedRowId !== row.id ? "ring-1 ring-primary/50" : ""}`}
                      onClick={() => {
                        setFocusedRowIndex(idx);
                        onRowClick?.(row);
                        tableScrollRef.current?.focus();
                      }}
                      data-testid={`row-${idx}`}
                    >
                        {orderedColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          style={{ width: widths[col.key] || col.defaultWidth || 120, maxWidth: widths[col.key] || col.defaultWidth || 120 }}
                          className={`text-xs py-1 border-r border-border/10 last:border-r-0 overflow-hidden ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          } ${selectedRowId === row.id ? "" : (col.type === "boolean" ? "bg-purple-500/5" : "")}`}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleCellDoubleClick(col, row[col.key]);
                          }}
                        >
                          {col.type === "boolean" ? (
                            <div className="flex items-center justify-center h-full">
                              {renderCellValue(row, col)}
                            </div>
                          ) : col.type === "date" && (onDateStartClick || onDateEndClick) ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="truncate overflow-hidden whitespace-nowrap w-full cursor-pointer hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (row[col.key] && row.id) {
                                      const data = { fecha: String(row[col.key]), id: String(row.id) };
                                      if (dateClickState === "none" && onDateStartClick) {
                                        onDateStartClick(data);
                                      } else if (dateClickState === "start" && onDateEndClick) {
                                        onDateEndClick(data);
                                      }
                                    }
                                  }}
                                >
                                  {renderCellValue(row, col)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {dateClickState === "none" ? "Click para fecha inicial" : "Click para fecha final"}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div 
                              className="truncate overflow-hidden whitespace-nowrap w-full"
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
          {!readOnly && (
            <div className="flex flex-wrap items-center justify-between px-4 py-2 border-t bg-muted/30 shrink-0 gap-2">
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
                onRelacionar={onRelacionar}
                onCalcular={handleCalcular}
                onExcel={handleExcelExport}
                onBorrarFiltrados={handleBorrarFiltrados}
                onReportes={onReportes}
                onOpenInBrowser={onOpenInBrowser}
                onPingOne={onPingOne}
                onNetworkStatus={onNetworkStatus}
                showAgregar={showAgregar}
                showCalcular={showCalcular}
                showExcel={showExcel}
                showBorrarFiltrados={showBorrarFiltrados && !!tableName}
                showRelacionar={showRelacionar}
                onGraficas={onGraficas}
                showGraficas={showGraficas}
                showPing={showPing}
                showReportes={showReportes}
                showOpenInBrowser={showOpenInBrowser}
                showPingOne={showPingOne}
                showNetworkStatus={showNetworkStatus}
                showImportar={showImportar}
                onPing={onPing}
                onImportar={onImportar}
                selectedRow={selectedRowId ? data.find(r => String(r.id) === String(selectedRowId)) || null : null}
                disableCrud={effectiveDisableCrud}
                disableBorrarFiltrados={disableBorrarFiltrados}
                middleButtons={middleButtons}
              />
              {extraButtons}
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
                initialData={formMode === "new" ? (newRecordDefaults ? newRecordDefaults : editingRow) : (formMode === "edit" && newRecordDefaults?.codrel ? { ...editingRow, codrel: newRecordDefaults.codrel } : editingRow)}
                isEditing={formMode === "edit"}
                mode={formMode === "delete" ? "delete" : (formMode === "edit" ? "edit" : "new")}
                title={formMode === "delete" ? "Eliminar Registro" : (formMode === "copy" ? "Copiar Registro" : (formMode === "edit" ? "Editar Registro" : "Agregar Registro"))}
                currentTabName={currentTabName}
                onRecordSaved={onRecordSaved}
              />
              {hiddenColumns.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MyButtonStyle
                      color="teal"
                      className="text-xs gap-1"
                      onClick={handleShowAllColumns}
                      data-testid="button-show-columns"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Enseñar columnas ({hiddenColumns.length})
                    </MyButtonStyle>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-teal-600 text-white text-xs">
                    Mostrar todas las columnas ocultas
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex items-center gap-3 px-3 py-1 rounded-md bg-gradient-to-br from-amber-500/10 to-orange-500/20 border border-amber-500/30 shrink-0 w-full sm:w-auto order-first sm:order-none">
                <span className="text-xs text-muted-foreground cursor-default whitespace-nowrap">
                  {sortedData.length}{totalCount !== undefined ? ` de ${totalCount}` : ''} registros
                </span>
                {hasMore && onLoadMore && (
                  <MyButtonStyle
                    color="blue"
                    className="h-6 text-xs"
                    onClick={onLoadMore}
                    data-testid="button-load-more"
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Cargar más
                  </MyButtonStyle>
                )}
              </div>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
        MyGrid
      </TooltipContent>
    </Tooltip>

      <AlertDialog open={isBorrarDialogOpen} onOpenChange={setIsBorrarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar {data.length} registros?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todos los registros visibles en la tabla. Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBorrando}>Cancelar</AlertDialogCancel>
            <MyButtonStyle
              color="red"
              onClick={handleConfirmarBorrado}
              disabled={isBorrando}
              data-testid="button-confirmar-borrar-todos"
            >
              {isBorrando ? "Borrando..." : "Borrar todos"}
            </MyButtonStyle>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {headerMenu && ReactDOM.createPortal(
        <div
          ref={headerMenuRef}
          className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[150px]"
          style={{ 
            left: Math.min(headerMenu.x, window.innerWidth - 170), 
            top: Math.min(headerMenu.y, window.innerHeight - 80) 
          }}
          data-testid={`header-menu-${headerMenu.key}`}
        >
          {(() => {
            const col = allColumns.find(c => c.key === headerMenu.key);
            const isSortable = col && (col.type === "date" || col.type === "number" || col.type === "text");
            const isSorted = sortKey === headerMenu.key;
            return (
              <>
                {isSortable && (
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-popover-foreground hover-elevate text-left"
                    onClick={() => {
                      handleSort(headerMenu.key);
                      setHeaderMenu(null);
                    }}
                    data-testid={`header-menu-sort-${headerMenu.key}`}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Ordenar {isSorted ? (sortDirection === "asc" ? "descendente" : "ascendente") : ""}
                  </button>
                )}
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover-elevate text-left"
                  onClick={() => {
                    handleHideColumn(headerMenu.key);
                    setHeaderMenu(null);
                  }}
                  data-testid={`header-menu-hide-${headerMenu.key}`}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar columna
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}
    </>
  );
}
