import { useState, useMemo, useCallback, useEffect } from "react";
import { Building2 } from "lucide-react";

import { MyWindow, MyFilter, MyFiltroDeUnidad, MyTab, MyGrid, type BooleanFilter, type TextFilter, type TabConfig, type Column, type ReportFilters } from "@/components/My";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTableData } from "@/contexts/TableDataContext";
import { getStoredUsername } from "@/lib/auth";

const bancosRelacionadosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "operacion", label: "Operación", defaultWidth: 100 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
];

type RowHandler = (row: Record<string, any>) => void;

const TAB_TEXT_FILTER_FIELDS: Record<string, { field: string; label: string }[]> = {
  facturas: [
    { field: "actividad", label: "Actividad" },
    { field: "proveedor", label: "Proveedor" },
    { field: "insumo", label: "Insumo" },
    { field: "nrofactura", label: "Nro Factura" },
  ],
  cuentasporpagar: [
    { field: "proveedor", label: "Proveedor" },
    { field: "nrofactura", label: "Nro Factura" },
  ],
  nomina: [
    { field: "personal", label: "Personal" },
    { field: "actividad", label: "Actividad" },
  ],
  prestamos: [
    { field: "personal", label: "Personal" },
    { field: "actividad", label: "Actividad" },
  ],
  ventas: [
    { field: "producto", label: "Producto" },
    { field: "cliente", label: "Cliente" },
    { field: "nrofactura", label: "Nro Factura" },
  ],
  cuentasporcobrar: [
    { field: "producto", label: "Producto" },
    { field: "cliente", label: "Cliente" },
    { field: "nrofactura", label: "Nro Factura" },
  ],
};

const TAB_BOOLEAN_FILTER_FIELDS: Record<string, { field: string; label: string }[]> = {
  facturas: [
    { field: "capital", label: "Capital" },
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  nomina: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  ventas: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  cuentasporpagar: [
    { field: "cancelada", label: "Cancelada" },
    { field: "utility", label: "Utilidad" },
  ],
  cuentasporcobrar: [
    { field: "cancelada", label: "Cancelada" },
    { field: "enviada", label: "Enviada" },
    { field: "utility", label: "Utilidad" },
    { field: "relacionado", label: "Relacionado" },
  ],
  prestamos: [
    { field: "utility", label: "Utilidad" },
    { field: "relacionado", label: "Relacionado" },
  ],
};

const adminTabs: TabConfig[] = [
  {
    id: "facturas",
    label: "Facturas",
    tipo: "facturas",
    color: "red",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "nrofactura", label: "Nro Factura", defaultWidth: 110 },
      { key: "fechafactura", label: "Fecha Factura", defaultWidth: 100, type: "date" },
      { key: "insumo", label: "Insumo", defaultWidth: 120 },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    tipo: "nomina",
    color: "orange",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
    subTabs: [
      { id: "nomina-total", label: "Total", color: "red", hasGrid: true },
      { id: "nomina-semanal-finca", label: "Pago Semanal Nómina", color: "orange", component: "nomina-semanal-finca" },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    tipo: "ventas",
    color: "yellow",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "nrofactura", label: "Nro Factura", defaultWidth: 110 },
      { key: "fechafactura", label: "Fecha Factura", defaultWidth: 100, type: "date" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "cuentasporcobrar",
    label: "Cuentas por Cobrar",
    tipo: "cuentasporcobrar",
    color: "green",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "restacancelar", label: "Resta x Cancelar", defaultWidth: 120, align: "right", type: "number" },
      { key: "nrofactura", label: "Nro Factura", defaultWidth: 110 },
      { key: "fechafactura", label: "Fecha Factura", defaultWidth: 100, type: "date" },
      { key: "cancelada", label: "Cancelada", defaultWidth: 80, type: "boolean" },
      { key: "enviada", label: "Enviada", defaultWidth: 80, type: "boolean" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    color: "cyan",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "restacancelar", label: "Resta x Cancelar", defaultWidth: 120, align: "right", type: "number" },
      { key: "nrofactura", label: "Nro Factura", defaultWidth: 110 },
      { key: "fechafactura", label: "Fecha Factura", defaultWidth: 100, type: "date" },
      { key: "cancelada", label: "Cancelada", defaultWidth: 80, type: "boolean" },
      { key: "enviada", label: "Enviada", defaultWidth: 80, type: "boolean" },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
    subTabs: [
      { id: "cxp-total", label: "Total", color: "cyan", hasGrid: true },
      { id: "cxp-pago-semanal", label: "Pago Semanal Proveedores", color: "blue", component: "pago-semanal-proveedores" },
    ],
  },
  {
    id: "prestamos",
    label: "Préstamos",
    tipo: "prestamos",
    color: "blue",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "nombre", label: "Nombre", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "saldo", label: "Saldo", defaultWidth: 100, align: "right", type: "number", editable: false },
      { key: "utility", label: "Utilidad", defaultWidth: 80, type: "boolean" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "parametros",
    label: "Parámetros",
    tipo: "parametros",
    color: "indigo",
    columns: [],
  },
];

interface DateRange {
  start: string;
  end: string;
}


interface AdminContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilterValues: Record<string, string>;
  onTextFilterChange: (field: string, value: string) => void;
  onEdit?: RowHandler;
  onCopy?: RowHandler;
  onAgregar?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
  newRecordDefaults?: Record<string, any>;
  onRecordSaved?: (record: Record<string, any>) => void;
  showRelacionar?: boolean;
  onRelacionarAdmin?: (adminId: string, monto?: number, montoDolares?: number, descripcion?: string) => void;
  pendingBancoId?: string | null;
  onCancelRelacionar?: () => void;
  onCloseWindow?: () => void;
}

function AdminContent({ 
  activeTab,
  onTabChange,
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilterValues,
  onTextFilterChange,
  onEdit,
  onCopy,
  onAgregar,
  hasMore,
  onLoadMore,
  onSaveNew,
  onRefresh,
  newRecordDefaults,
  onRecordSaved,
  showRelacionar = false,
  onRelacionarAdmin,
  pendingBancoId,
  onCancelRelacionar,
}: AdminContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [activeSubTab, setActiveSubTab] = useState<string>("");
  const [isEnviandoFacturas, setIsEnviandoFacturas] = useState(false);
  const [isEnviandoVentas, setIsEnviandoVentas] = useState(false);
  const currentTab = adminTabs.find(t => t.id === activeTab);
  const isSpecialSubTab = activeSubTab === "nomina-semanal-finca" || activeSubTab === "nomina-semanal-nucleo" || activeSubTab === "cxp-pago-semanal" || activeTab === "parametros";
  const { showPop } = useMyPop();
  
  const { tableData } = useTableData();

  useEffect(() => {
    if (pendingBancoId) {
      setSelectedRowId(null);
      setSelectedRowDate(undefined);
    }
  }, [pendingBancoId]);

  const handleConfirmRelacionar = useCallback(async () => {
    if (!pendingBancoId || !selectedRowId) return;
    try {
      const resAdmin = await fetch(`/api/administracion/${selectedRowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codrel: pendingBancoId, relacionado: true }),
      });
      if (!resAdmin.ok) {
        showPop({ title: "Error", message: "No se pudo actualizar el registro de administración" });
        return;
      }
      const resBancos = await fetch(`/api/bancos/${pendingBancoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codrel: selectedRowId, relacionado: true }),
      });
      if (!resBancos.ok) {
        showPop({ title: "Error", message: "No se pudo actualizar el registro de bancos" });
        return;
      }
      showPop({ title: "Relacionado", message: "Registros relacionados exitosamente" });
      onRefresh?.();
      window.dispatchEvent(new CustomEvent("refreshBancos"));
      onCancelRelacionar?.();
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  }, [pendingBancoId, selectedRowId, showPop, onRefresh, onCancelRelacionar]);

  const hasCancelados = useMemo(() => {
    if (activeTab !== "cuentasporpagar" || activeSubTab !== "cxp-total") return false;
    return tableData.some(r => 
      (r.cancelada === true || r.cancelada === "t" || r.cancelada === "true") &&
      !(r.enviada === true || r.enviada === "t" || r.enviada === "true") &&
      parseFloat(r.monto || 0) > 0
    );
  }, [activeTab, activeSubTab, tableData]);

  const hasCanceladosCxC = useMemo(() => {
    if (activeTab !== "cuentasporcobrar") return false;
    return tableData.some(r => 
      (r.cancelada === true || r.cancelada === "t" || r.cancelada === "true") &&
      !(r.enviada === true || r.enviada === "t" || r.enviada === "true")
    );
  }, [activeTab, tableData]);

  const handleEliminarCanceladosCxC = async () => {
    try {
      const response = await fetch("/api/administracion/eliminar-cancelados-cxc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidad: unidadFilter }),
      });
      if (!response.ok) throw new Error("Error al eliminar registros");
      const result = await response.json();
      showPop({ title: "Completado", message: `Se eliminaron ${result.eliminados} registro(s) cancelados de cuentas por cobrar.` });
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentasporpagar-pendientes"] });
    } catch (error) {
      showPop({ title: "Error", message: (error as Error).message });
    }
  };

  const handleEnviarAVentas = async () => {
    setIsEnviandoVentas(true);
    try {
      const response = await fetch("/api/administracion/enviar-a-ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidad: unidadFilter, username: getStoredUsername() }),
      });
      if (!response.ok) throw new Error("Error al enviar a ventas");
      const result = await response.json();
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentasporpagar-pendientes"] });
      showPop({
        title: "Registros creados en Ventas",
        message: `Se crearon ${result.ventas} registro(s) en ventas y se actualizaron ${result.bancosActualizados || 0} registro(s) de bancos. ¿Desea eliminar los registros cancelados de cuentas por cobrar?`,
        confirmText: "Sí, eliminar",
        onConfirm: handleEliminarCanceladosCxC,
      });
    } catch (error) {
      showPop({ title: "Error", message: (error as Error).message });
    } finally {
      setIsEnviandoVentas(false);
    }
  };

  const handleEliminarCanceladosCxP = async () => {
    try {
      const response = await fetch("/api/administracion/eliminar-cancelados-cxp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidad: unidadFilter }),
      });
      if (!response.ok) throw new Error("Error al eliminar registros");
      const result = await response.json();
      showPop({ title: "Completado", message: `Se eliminaron ${result.eliminados} registro(s) cancelados de cuentas por pagar.` });
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentasporpagar-pendientes"] });
    } catch (error) {
      showPop({ title: "Error", message: (error as Error).message });
    }
  };

  const handleEnviarAFacturas = async () => {
    setIsEnviandoFacturas(true);
    try {
      const response = await fetch("/api/administracion/enviar-a-facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unidad: unidadFilter, username: getStoredUsername() }),
      });
      if (!response.ok) throw new Error("Error al enviar a facturas");
      const result = await response.json();
      onRefresh?.();
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentasporpagar-pendientes"] });
      showPop({
        title: "Registros creados en Facturas",
        message: `Se crearon ${result.facturas} registro(s) en facturas y se actualizaron ${result.bancosActualizados || 0} registro(s) de bancos. ¿Desea eliminar los registros cancelados de cuentas por pagar?`,
        confirmText: "Sí, eliminar",
        onConfirm: handleEliminarCanceladosCxP,
      });
    } catch (error) {
      showPop({ title: "Error", message: (error as Error).message });
    } finally {
      setIsEnviandoFacturas(false);
    }
  };

  const { data: saldosData } = useQuery<{ saldos: Record<string, number> }>({
    queryKey: ["/api/administracion/saldos-prestamos", unidadFilter],
    queryFn: () => fetch(`/api/administracion/saldos-prestamos?unidad=${encodeURIComponent(unidadFilter)}`).then(r => r.json()),
    enabled: activeTab === "prestamos" && unidadFilter !== "all",
  });

  const prestamosDataTransform = useCallback((data: Record<string, any>[]) => {
    const saldos = saldosData?.saldos || {};
    return data.map(row => ({
      ...row,
      saldo: saldos[row.id] ?? 0,
    }));
  }, [saldosData]);

  const cxpDataTransform = useCallback((data: Record<string, any>[]) => {
    return data.map(row => {
      const monto = parseFloat(row.monto);
      if (!isNaN(monto) && monto < 0) {
        return { ...row, restacancelar: "no aplica" };
      }
      return row;
    });
  }, []);

  // Obtener el codrel del registro seleccionado
  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );
  const selectedCodrel = selectedRow?.codrel;
  const isRelacionado = selectedRow?.relacionado === true || selectedRow?.relacionado === "t";
  const isFacturasTab = activeTab === "facturas";

  const { data: bancosResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: [`/api/bancos?id=${selectedCodrel}`],
    enabled: !isFacturasTab && selectedCodrel != null && selectedCodrel !== "" && isRelacionado,
  });

  const { data: bancosFacturaResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: ["/api/bancos", { codrel: selectedRowId }],
    queryFn: () => fetch(`/api/bancos?codrel=${selectedRowId}`).then(r => r.json()),
    enabled: isFacturasTab && selectedRowId != null && selectedRowId !== "",
  });

  const bancosRelacionados = isFacturasTab
    ? (bancosFacturaResponse?.data || [])
    : (selectedCodrel && isRelacionado) ? (bancosResponse?.data || []) : [];

  const handleRomperRelacion = useCallback(async (row: Record<string, any>) => {
    const tipoRelacion = isFacturasTab ? "one-to-many" : "one-to-one";
    showPop({
      title: "Romper relación",
      message: "¿Romper la relación con este registro?",
      onConfirm: async () => {
        try {
          const resp = await fetch("/api/romper-relacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tabla: "bancos", id: row.id, tipo: tipoRelacion }),
          });
          if (!resp.ok) throw new Error();
          queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && (k.includes("/api/bancos") || k.includes("/api/administracion")); } });
          showPop({ title: "Listo", message: "Relación eliminada correctamente" });
        } catch {
          showPop({ title: "Error", message: "No se pudo romper la relación" });
        }
      },
    });
  }, [showPop, isFacturasTab]);

  const handleRelacionar = () => {
    if (selectedRowId && onRelacionarAdmin) {
      const selectedRow = tableData.find(row => row.id === selectedRowId);
      if (selectedRow) {
        onRelacionarAdmin(
          selectedRowId,
          selectedRow.monto,
          selectedRow.montodolares,
          selectedRow.descripcion
        );
      }
    }
  };

  const handleClearFilters = () => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach(f => onBooleanFilterChange(f.field, "all"));
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    fields.forEach(f => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const nrofacturaOptions = useMemo(() => {
    if (activeTab !== "cuentasporpagar" && activeTab !== "cuentasporcobrar" && activeTab !== "facturas" && activeTab !== "ventas") return undefined;
    const unique = new Set<string>();
    for (const row of tableData) {
      const val = row.nrofactura;
      if (val && typeof val === "string" && val.trim() !== "") {
        unique.add(val.trim());
      }
    }
    return Array.from(unique).sort();
  }, [tableData, activeTab]);

  const textFilters = useMemo<TextFilter[]>(() => {
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    return fields.map(({ field, label }) => ({
      field,
      label,
      value: textFilterValues[field] || "",
      ...(field === "nrofactura" && nrofacturaOptions ? { options: nrofacturaOptions } : {}),
    }));
  }, [activeTab, textFilterValues, nrofacturaOptions]);

  // Filtrado local solo para fecha cliente (click en celdas)
  // Los demás filtros (descripcion, textFilters, booleanFilters) ahora se envían al servidor
  const filterData = useCallback((row: Record<string, any>): boolean => {
    if (clientDateFilter.start || clientDateFilter.end) {
      const rowDate = row.fecha;
      if (!rowDate) return false;
      if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
      if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
    }
    return true;
  }, [clientDateFilter]);

  const filteredData = useMemo(() => tableData.filter(filterData), [tableData, filterData]);

  const selectedInCurrentData = useMemo(() => {
    return selectedRowId ? filteredData.some((r: any) => r.id === selectedRowId) : false;
  }, [selectedRowId, filteredData]);

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 p-3">
      {pendingBancoId && (
        <div className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-md border-2 border-yellow-500 bg-yellow-500/10">
          <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
            Relacionar: Seleccione un registro de administración (Banco ID: {pendingBancoId})
          </span>
          <MyButtonStyle
            color="green"
            onClick={handleConfirmRelacionar}
            disabled={!selectedRowId || !selectedInCurrentData}
            data-testid="button-confirmar-relacionar-admin"
          >
            Confirmar
          </MyButtonStyle>
          <MyButtonStyle
            color="gray"
            onClick={onCancelRelacionar}
            data-testid="button-cancelar-relacionar-admin"
          >
            Cancelar
          </MyButtonStyle>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          valueType="nombre"
          showLabel={true}
          testId="admin-filtro-unidad"
        />
        <MyFilter 
          onClearFilters={handleClearFilters} 
          onDateChange={onDateChange}
          dateFilter={dateFilter}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
          unidadFilter={unidadFilter}
          selectedRecordDate={selectedRowDate}
          clientDateFilter={clientDateFilter}
          sourceModule="administracion"
          activeTab={activeTab}
          onOpenReport={handleOpenReport}
        />
      </div>

      <div className="overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 border-indigo-500/20" style={{ flex: '85 1 0%', minHeight: 0 }}>
        <MyTab
          tabs={adminTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          icon={<Building2 className="h-4 w-4 text-indigo-800 dark:text-indigo-300" />}
          title=""
          tableName="administracion"
          filterFn={filterData}
          newRecordDefaults={newRecordDefaults}
          onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); onRecordSaved?.(record); }}
          disableCrud={unidadFilter === "all"}
          filtroDeUnidad={unidadFilter}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "administracion",
            activeTab,
            dateRange: dateFilter,
            unidad: unidadFilter,
            textFilters: textFilterValues,
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
          onSubTabChange={setActiveSubTab}
          dataTransform={activeTab === "prestamos" ? prestamosDataTransform : (activeTab === "cuentasporpagar" || activeTab === "cuentasporcobrar") ? cxpDataTransform : undefined}
          showRelacionar={showRelacionar}
          onRelacionar={handleRelacionar}
          relacionarTooltip="Relacionar con Bancos"
          endButtons={
            activeTab === "cuentasporpagar" && activeSubTab === "cxp-total" ? (
              <MyButtonStyle color="cyan" loading={isEnviandoFacturas} onClick={handleEnviarAFacturas} disabled={!hasCancelados} data-testid="btn-enviar-a-facturas">
                Enviar a Facturas
              </MyButtonStyle>
            ) : activeTab === "cuentasporcobrar" ? (
              <MyButtonStyle color="green" loading={isEnviandoVentas} onClick={handleEnviarAVentas} disabled={!hasCanceladosCxC} data-testid="btn-enviar-a-ventas">
                Enviar a Ventas
              </MyButtonStyle>
            ) : undefined
          }
        />
      </div>

      {!isSpecialSubTab && (
        <div className="mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20 overflow-hidden" style={{ flex: '12 1 0%', minHeight: 0 }}>
          <div className="text-xs font-medium text-muted-foreground mb-1">Registros de Bancos relacionados</div>
          {bancosRelacionados.length > 0 ? (
            <MyGrid
              tableId="admin-bancos-relacionados"
              tableName="bancos"
              columns={bancosRelacionadosColumns}
              data={bancosRelacionados}
              selectedRowId={null}
              onRowAction={handleRomperRelacion}
              readOnly={true}
              compactHeader={true}
              showUtilityColumn={false}
            />
          ) : (
            <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
              {selectedRowId ? "No hay registros relacionados" : "Seleccione un registro de administración"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AdministracionProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
  onOpenBancos?: (adminId: string, monto?: number, montoDolares?: number, descripcion?: string) => void;
}

const getBooleanFiltersForTab = (tabId: string): BooleanFilter[] => {
  const fields = TAB_BOOLEAN_FILTER_FIELDS[tabId] || [];
  return fields.map(({ field, label }) => ({ field, label, value: "all" as const }));
};

export default function Administracion({ onBack, onFocus, zIndex, minimizedIndex, isStandalone, onOpenBancos }: AdministracionProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const [activeTab, setActiveTab] = useState("facturas");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("administracion", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(getBooleanFiltersForTab("facturas"));
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [bancoMonto, setBancoMonto] = useState<number | undefined>(undefined);
  const [bancoMontoDolares, setBancoMontoDolares] = useState<number | undefined>(undefined);
  const [bancoDescripcionPropuesta, setBancoDescripcionPropuesta] = useState<string | undefined>(undefined);
  useEffect(() => {
    const handleSetBancoId = (event: CustomEvent<{ bancoId: string; monto?: number; montoDolares?: number; nombreBanco?: string; descripcion?: string }>) => {
      setBancoId(event.detail.bancoId);
      setBancoMonto(event.detail.monto);
      setBancoMontoDolares(event.detail.montoDolares);
      // Compose description: "NombreBanco - DescripcionMovimiento"
      const nombreBanco = event.detail.nombreBanco || "";
      const descripcion = event.detail.descripcion || "";
      if (nombreBanco || descripcion) {
        setBancoDescripcionPropuesta(nombreBanco && descripcion ? `${nombreBanco} - ${descripcion}` : nombreBanco || descripcion);
      } else {
        setBancoDescripcionPropuesta(undefined);
      }
    };

    window.addEventListener("setAdminBancoId", handleSetBancoId as EventListener);
    return () => {
      window.removeEventListener("setAdminBancoId", handleSetBancoId as EventListener);
    };
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setDescripcionFilter("");
    setTextFilterValues({});
    setBooleanFilters(getBooleanFiltersForTab(tabId));
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.comprobante || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/administracion/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
        queryClient.invalidateQueries({ queryKey: ["/api/administracion/saldos-prestamos"] });
        const delUnidad = (row.unidad || "").toString().toLowerCase().trim();
        queryClient.setQueriesData(
          { predicate: (q) => {
            if (typeof q.queryKey[0] !== "string" || !(q.queryKey[0] as string).startsWith("/api/administracion/cuentasporpagar-pendientes")) return false;
            const cu = (q.queryKey[1] || "all").toString().toLowerCase().trim();
            return cu === "all" || cu === delUnidad;
          }},
          (oldData: any) => Array.isArray(oldData) ? oldData.filter((r: any) => String(r.id) !== String(row.id)) : oldData
        );
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      } else {
        showPop({ title: "Error", message: "No se pudo eliminar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const dataWithTipo: Record<string, any> = { ...data, tipo: activeTab };
      if (bancoId) {
        if (bancoMonto !== undefined && !data.monto) {
          dataWithTipo.monto = bancoMonto;
        }
        if (bancoMontoDolares !== undefined && !data.montodolares) {
          dataWithTipo.montodolares = bancoMontoDolares;
        }
      }
      const response = await apiRequest("POST", "/api/administracion", dataWithTipo);
      return response.json();
    },
    onSuccess: (savedRecord: Record<string, any>) => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/saldos-prestamos"] });
      const isCxP = savedRecord?.tipo === "cuentasporpagar";
      const isPendiente = isCxP && (!savedRecord.cancelada || savedRecord.cancelada === false || savedRecord.cancelada === "f") && parseFloat(savedRecord.montodolares || 0) > 0;
      if (isPendiente) {
        const recUnidad = (savedRecord.unidad || "").toString().toLowerCase().trim();
        queryClient.setQueriesData(
          { predicate: (q) => {
            if (typeof q.queryKey[0] !== "string" || !(q.queryKey[0] as string).startsWith("/api/administracion/cuentasporpagar-pendientes")) return false;
            const cu = (q.queryKey[1] || "all").toString().toLowerCase().trim();
            return cu === "all" || cu === recUnidad;
          }},
          (oldData: any) => Array.isArray(oldData) ? [...oldData, savedRecord] : oldData
        );
      }
      toast({ title: "Guardado", description: "Registro creado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "No se pudo guardar el registro" });
    },
  });

  const handleSaveNew = useCallback((data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => {
    createMutation.mutate(data, {
      onSuccess: (savedRecord) => {
        if (onComplete) {
          onComplete(savedRecord);
        }
      }
    });
  }, [createMutation]);

  const handleCancelRelacionar = useCallback(() => {
    setBancoId(null);
    setBancoMonto(undefined);
    setBancoMontoDolares(undefined);
    setBancoDescripcionPropuesta(undefined);
  }, []);

  const handleRecordSaved = useCallback((_record: Record<string, any>) => {
  }, []);


  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters(prev => 
      prev.map(f => f.field === field ? { ...f, value } : f)
    );
  };

  const handleTextFilterChange = (field: string, value: string) => {
    setTextFilterValues(prev => ({ ...prev, [field]: value }));
  };

  const currentTabConfig = adminTabs.find(t => t.id === activeTab);
  const currentTipo = currentTabConfig?.tipo || "facturas";

  const queryParams: Record<string, string> = {
    tipo: currentTipo,
    unidad: unidadFilter,
  };
  
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }
  
  // Agregar filtro de descripción al servidor
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  
  // Agregar textFilters al servidor
  for (const [field, value] of Object.entries(textFilterValues)) {
    if (value && value.trim()) {
      queryParams[field] = value.trim();
    }
  }
  
  // Agregar booleanFilters al servidor
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="administracion"
      title="Administración"
      icon={<Building2 className="h-4 w-4 text-indigo-800 dark:text-indigo-300" />}
      tutorialId="administracion"
      initialPosition={{ x: 120, y: 80 }}
      initialSize={{ width: 1000, height: 650 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-indigo-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      onSaveNew={handleSaveNew}
      isStandalone={isStandalone}
      popoutUrl="/standalone/administracion"
    >
      <AdminContent 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unidadFilter={unidadFilter}
        onUnidadChange={setUnidadFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilterValues={textFilterValues}
        onTextFilterChange={handleTextFilterChange}
        newRecordDefaults={bancoId ? { monto: bancoMonto, montodolares: bancoMontoDolares, descripcion: bancoDescripcionPropuesta } : undefined}
        onRecordSaved={handleRecordSaved}
        showRelacionar={!!onOpenBancos}
        onRelacionarAdmin={(adminId, monto, montoDolares, descripcion) => {
          onOpenBancos?.(adminId, monto, montoDolares, descripcion);
        }}
        pendingBancoId={bancoId}
        onCancelRelacionar={handleCancelRelacionar}
      />
    </MyWindow>
  );
}
