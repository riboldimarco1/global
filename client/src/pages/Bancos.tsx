import { useState, useMemo, useEffect } from "react";
import { Landmark, Coins } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeBanco, MyGrid, type BooleanFilter, type Column, type ReportFilters } from "@/components/My";
import { MyImportDialog } from "@/components/MyImportDialog";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { hasBancoAccess, getStoredUsername } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onOpenAdministracion: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string, operacion?: string, comprobante?: string) => void;
  monedaFilter: MonedaFilter;
  onMonedaChange: (value: MonedaFilter) => void;
  username: string;
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
}: BancosContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { toast } = useToast();

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

  // Obtener el codrel del registro de banco seleccionado
  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );
  // Solo buscar registros relacionados cuando el banco seleccionado tiene relacionado=true
  const isRelacionado = selectedRow?.relacionado === true || selectedRow?.relacionado === "t";

  // Buscar todos los registros de administración cuyo codrel = ID del banco seleccionado
  const { data: adminResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: [`/api/administracion?codrel=${selectedRowId}`],
    enabled: selectedRowId != null && selectedRowId !== "" && isRelacionado,
    staleTime: 0,
  });
  const adminRelacionados = (selectedRowId && isRelacionado) ? (adminResponse?.data || []) : [];

  const handleRelacionar = () => {
    if (selectedRowId) {
      const selectedRow = tableData.find(row => row.id === selectedRowId);
      onOpenAdministracion(selectedRowId, selectedRow?.monto, selectedRow?.montodolares, selectedRow?.banco, selectedRow?.descripcion, selectedRow?.operacion, selectedRow?.comprobante);
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

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-2 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg">
          <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <Select value={monedaFilter} onValueChange={(v) => onMonedaChange(v as MonedaFilter)}>
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
          onChange={onBancoChange}
          showLabel={true}
          testId="bancos-filtro-banco"
          monedaFilter={monedaFilter}
        />
        <MyFilter
          onClearFilters={handleClearFilters}
          onDateChange={onDateChange}
          dateFilter={dateFilter}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          selectedRecordDate={selectedRowDate}
          clientDateFilter={clientDateFilter}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
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
  onOpenAdministracion?: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string, operacion?: string, comprobante?: string) => void;
}

export default function Bancos({ onBack, onFocus, zIndex, minimizedIndex, onOpenAdministracion, isStandalone }: BancosProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const [bancoFilter, setBancoFilter] = usePersistedFilter("bancos", "banco", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [monedaFilter, setMonedaFilter] = useState<MonedaFilter>("todos");

  const { data: listaBancos = [] } = useQuery<string[]>({
    queryKey: ["/api/bancos/lista"],
    staleTime: 5 * 60 * 1000,
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
      icon={<Landmark className="h-4 w-4 text-cyan-500" />}
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
      />
    </MyWindow>
  );
}
