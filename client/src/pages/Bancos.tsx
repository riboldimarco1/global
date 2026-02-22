import { useState, useMemo, useEffect, useCallback } from "react";
import { Landmark, Coins, Settings } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeBanco, MyGrid, type BooleanFilter, type Column, type ReportFilters } from "@/components/My";
import { MyImportDialog } from "@/components/MyImportDialog";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { hasBancoAccess, getStoredUsername } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import BancosParametros from "@/components/BancosParametros";

type MonedaFilter = "todos" | "bolivares" | "dolares" | "euros" | "caja";

type RowHandler = (row: Record<string, any>) => void;

const bancosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "operacion", label: "Operación", defaultWidth: 120 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 110, align: "right", type: "number" },
  { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
  { key: "saldo", label: "Saldo", defaultWidth: 110, align: "right", type: "number" },
  { key: "saldo_conciliado", label: "Saldo Conc.", defaultWidth: 110, align: "right", type: "number" },
  { key: "conciliado", label: "Conc", defaultWidth: 50, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "conciliado", label: "Conciliado", value: "all" },
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "relacionado", label: "Relacionado", value: "all" },
];

const adminRelacionadosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "tipo", label: "Tipo", defaultWidth: 80 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
];

interface BancosContentProps {
  bancoFilter: string;
  onBancoChange: (banco: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  onOpenAdministracion: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string) => void;
  monedaFilter: MonedaFilter;
  onMonedaChange: (value: MonedaFilter) => void;
  username: string;
  newRecordDefaults?: Record<string, any>;
  pendingAdminId: string | null;
  onCancelRelacionar: () => void;
}

function BancosContent({
  bancoFilter,
  onBancoChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  onOpenAdministracion,
  monedaFilter,
  onMonedaChange,
  username,
  newRecordDefaults,
  pendingAdminId,
  onCancelRelacionar,
}: BancosContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { toast } = useToast();
  const { showPop } = useMyPop();

  // Deshabilitar CRUD cuando no hay un banco específico seleccionado
  const disableCrud = !bancoFilter || bancoFilter === "all";
  
  // Deshabilitar "Borrar todos" cuando filtro de banco es "todos"
  const disableBorrarFiltrados = !bancoFilter || bancoFilter === "all";

  // Escuchar evento personalizado para refrescar bancos
  useEffect(() => {
    const handleRefreshBancos = () => {
      console.log("Evento refreshBancos recibido, ejecutando onRefresh()");
      onRefresh();
    };
    window.addEventListener("refreshBancos", handleRefreshBancos);
    return () => {
      window.removeEventListener("refreshBancos", handleRefreshBancos);
    };
  }, [onRefresh]);

  useEffect(() => {
    if (pendingAdminId) {
      setSelectedRowId(null);
      setSelectedRowDate(undefined);
    }
  }, [pendingAdminId]);

  const handleConfirmRelacionar = useCallback(async () => {
    if (!pendingAdminId || !selectedRowId) return;
    try {
      const resBancos = await fetch(`/api/bancos/${selectedRowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codrel: pendingAdminId, relacionado: true }),
      });
      if (!resBancos.ok) {
        showPop({ title: "Error", message: "No se pudo actualizar el registro de bancos" });
        return;
      }
      const resAdmin = await fetch(`/api/administracion/${pendingAdminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codrel: selectedRowId, relacionado: true }),
      });
      if (!resAdmin.ok) {
        showPop({ title: "Error", message: "No se pudo actualizar el registro de administración" });
        return;
      }
      showPop({ title: "Relacionado", message: "Registros relacionados exitosamente" });
      onRefresh();
      window.dispatchEvent(new CustomEvent("refreshAdministracion"));
      onCancelRelacionar();
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  }, [pendingAdminId, selectedRowId, showPop, onRefresh, onCancelRelacionar]);

  // Obtener el codrel del registro de banco seleccionado
  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );
  const isRelacionado = selectedRow?.relacionado === true || selectedRow?.relacionado === "t";
  const selectedCodrel = selectedRow?.codrel;

  const { data: adminResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: [`/api/administracion?id=${selectedCodrel}`],
    enabled: isRelacionado && selectedCodrel != null && selectedCodrel !== "",
  });
  const adminRelacionados = (isRelacionado && selectedCodrel) ? (adminResponse?.data || []) : [];

  const handleRomperRelacion = useCallback(async (row: Record<string, any>) => {
    showPop({
      title: "Romper relación",
      message: "¿Romper la relación con este registro?",
      onConfirm: async () => {
        try {
          const resp = await fetch("/api/romper-relacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tabla: "administracion", id: row.id, tipo: "one-to-one" }),
          });
          if (!resp.ok) throw new Error();
          queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && (k.includes("/api/bancos") || k.includes("/api/administracion")); } });
          showPop({ title: "Listo", message: "Relación eliminada correctamente" });
        } catch {
          showPop({ title: "Error", message: "No se pudo romper la relación" });
        }
      },
    });
  }, [showPop]);

  const handleRelacionar = () => {
    if (selectedRowId) {
      const selectedRow = tableData.find(row => row.id === selectedRowId);
      onOpenAdministracion(selectedRowId, selectedRow?.monto, selectedRow?.montodolares, selectedRow?.banco, selectedRow?.descripcion);
    }
  };

  const handleClearFilters = () => {
    // Resetear filtro cliente de fechas
    setClientDateFilter({ start: "", end: "" });
    // Resetear otros filtros locales
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    // Solo resetear filtros de servidor si estaban activos (esto recargará datos)
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleImportComplete = (result: { imported: number; duplicates: number }) => {
    toast({
      title: "Importación completada",
      description: `${result.imported} registros importados, ${result.duplicates} duplicados omitidos`,
    });
    onRefresh();
    setImportDialogOpen(false);
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  // Filtrado local solo para permisos de banco y fecha cliente (click en celdas)
  // Los demás filtros (descripcion, booleanFilters) ahora se envían al servidor
  const filteredData = useMemo(() => {
    let result = tableData;

    // Filter by user permissions for banco access
    result = result.filter((row) => hasBancoAccess(row.banco));

    // Filtrado cliente por fechas (click en celdas)
    if (clientDateFilter.start || clientDateFilter.end) {
      result = result.filter((row) => {
        const rowDate = row.fecha;
        if (!rowDate) return false;
        if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
        if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
        return true;
      });
    }

    return result;
  }, [tableData, clientDateFilter]);

  const selectedInCurrentData = useMemo(() => {
    return selectedRowId ? filteredData.some((r: any) => r.id === selectedRowId) : false;
  }, [selectedRowId, filteredData]);

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 p-3">
      {pendingAdminId && (
        <div className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-md border-2 border-yellow-500 bg-yellow-500/10">
          <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
            Relacionar: Seleccione un registro de bancos (Admin ID: {pendingAdminId})
          </span>
          <MyButtonStyle
            color="green"
            onClick={handleConfirmRelacionar}
            disabled={!selectedRowId || !selectedInCurrentData}
            data-testid="button-confirmar-relacionar-bancos"
          >
            Confirmar
          </MyButtonStyle>
          <MyButtonStyle
            color="gray"
            onClick={onCancelRelacionar}
            data-testid="button-cancelar-relacionar-bancos"
          >
            Cancelar
          </MyButtonStyle>
        </div>
      )}
      <div className="flex-1 overflow-hidden p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="bancos-movimientos"
          tableName="bancos"
          columns={bancosColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          filtroDeBanco={bancoFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          showRelacionar={true}
          onRelacionar={handleRelacionar}
          showImportar={!disableCrud}
          onImportar={() => setImportDialogOpen(true)}
          newRecordDefaults={newRecordDefaults}
          onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}
          disableCrud={disableCrud}
          disableBorrarFiltrados={disableBorrarFiltrados}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "bancos",
            activeTab: "movimientos",
            dateRange: dateFilter,
            banco: bancoFilter,
            textFilters: {},
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>

      <div className="h-48 mt-2 p-2 border rounded-md bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 border-indigo-500/20">
        <div className="text-xs font-medium text-muted-foreground mb-1">Registros de Administración relacionados</div>
        {adminRelacionados.length > 0 ? (
          <MyGrid
            tableId="bancos-admin-relacionados"
            tableName="administracion"
            columns={adminRelacionadosColumns}
            data={adminRelacionados}
            selectedRowId={null}
            onRowAction={handleRomperRelacion}
            readOnly={true}
            compactHeader={true}
            showUtilityColumn={false}
          />
        ) : (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            {selectedRowId ? "No hay registros relacionados" : "Seleccione un registro de banco"}
          </div>
        )}
      </div>

      <MyImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        defaultBanco={bancoFilter !== "all" ? bancoFilter : undefined}
        username={username}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

interface BancosProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
  onOpenAdministracion?: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string) => void;
}

export default function Bancos({ onBack, onFocus, zIndex, minimizedIndex, onOpenAdministracion, isStandalone }: BancosProps) {
  const { toast } = useToast();
  const { isAlegre } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const { showPop } = useMyPop();
  const [mainTab, setMainTab] = useState<"total" | "parametros">("total");
  const [bancoFilter, setBancoFilter] = usePersistedFilter("bancos", "banco", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [monedaFilter, setMonedaFilter] = useState<MonedaFilter>("bolivares");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminMonto, setAdminMonto] = useState<number | undefined>(undefined);
  const [adminMontoDolares, setAdminMontoDolares] = useState<number | undefined>(undefined);
  const [adminDescripcion, setAdminDescripcion] = useState<string | undefined>(undefined);
  useEffect(() => {
    const handleSetAdminId = (event: CustomEvent<{ adminId: string; monto?: number; montoDolares?: number; descripcion?: string }>) => {
      setAdminId(event.detail.adminId);
      setAdminMonto(event.detail.monto);
      setAdminMontoDolares(event.detail.montoDolares);
      setAdminDescripcion(event.detail.descripcion);
    };
    window.addEventListener("setBancosAdminId", handleSetAdminId as EventListener);
    return () => {
      window.removeEventListener("setBancosAdminId", handleSetAdminId as EventListener);
    };
  }, []);

  const handleCancelRelacionar = useCallback(() => {
    setAdminId(null);
    setAdminMonto(undefined);
    setAdminMontoDolares(undefined);
    setAdminDescripcion(undefined);
  }, []);

  const { data: listaBancos = [] } = useQuery<string[]>({
    queryKey: ["/api/bancos/lista"],
  });

  useEffect(() => {
    if (listaBancos.length > 0 && bancoFilter === "") {
      setBancoFilter(listaBancos[0]);
    }
  }, [listaBancos, bancoFilter]);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/bancos/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      } else {
        showPop({ title: "Error", message: "No se pudo eliminar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  if (bancoFilter && bancoFilter !== "all") {
    queryParams.banco = bancoFilter;
  }
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
  
  // Agregar booleanFilters al servidor
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="bancos"
      title="Bancos"
      icon={<Landmark className="h-4 w-4 text-cyan-800 dark:text-cyan-300" />}
      tutorialId="bancos"
      initialPosition={{ x: 150, y: 100 }}
      initialSize={{ width: 1000, height: 600 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-cyan-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/bancos"
    >
      <div className="flex flex-col h-full min-h-0 flex-1">
        {mainTab !== "parametros" && (
          <div className="flex items-center gap-2 flex-wrap px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 p-2 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg">
              <Coins className="h-4 w-4 text-amber-800 dark:text-amber-300" />
              <Select value={monedaFilter} onValueChange={(v) => setMonedaFilter(v as MonedaFilter)}>
                <SelectTrigger className="h-8 w-[120px] text-xs" data-testid="bancos-filtro-moneda">
                  <SelectValue placeholder="Moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="bolivares">Bolívares</SelectItem>
                  <SelectItem value="dolares">Dólares</SelectItem>
                  <SelectItem value="euros">Euros</SelectItem>
                  <SelectItem value="caja">Caja Chica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <MyFiltroDeBanco
              value={bancoFilter}
              onChange={setBancoFilter}
              showLabel={true}
              testId="bancos-filtro-banco"
              monedaFilter={monedaFilter}
              allowAll={true}
            />
            <MyFilter
              onClearFilters={() => {
                setDescripcionFilter("");
                setBooleanFilters(DEFAULT_BOOLEAN_FILTERS);
                setDateFilter({ start: "", end: "" });
              }}
              onDateChange={setDateFilter}
              dateFilter={dateFilter}
              descripcion={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
            />
          </div>
        )}

        <div className="flex items-center gap-1 px-3 pt-1 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Landmark className="h-3.5 w-3.5" />, color: "red" as const },
            { id: "parametros" as const, label: "Parámetros", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
          ]).map((tab) => {
            const isActive = mainTab === tab.id;
            const effectiveColor = tab.color;
            const cls = tabColorClasses[effectiveColor];
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all animate-flash cursor-pointer select-none ${
                  isActive
                    ? `${cls.activeBg} ${cls.border} ${cls.text} ring-2 ring-white scale-105 ${cls.shadow}`
                    : `${cls.bg} ${cls.border} ${cls.text}`
                }`}
                data-testid={`tab-bancos-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mainTab === "total" ? (
            <BancosContent
              bancoFilter={bancoFilter}
              onBancoChange={setBancoFilter}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              descripcionFilter={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              onOpenAdministracion={onOpenAdministracion || (() => {})}
              monedaFilter={monedaFilter}
              onMonedaChange={setMonedaFilter}
              username={getStoredUsername()}
              newRecordDefaults={adminId ? { monto: adminMonto, montodolares: adminMontoDolares, descripcion: adminDescripcion } : undefined}
              pendingAdminId={adminId}
              onCancelRelacionar={handleCancelRelacionar}
            />
          ) : (
            <BancosParametros />
          )}
        </div>
      </div>
    </MyWindow>
  );
}
