import { useState, useMemo, useEffect, useCallback } from "react";
import { Landmark, Coins, Settings, DollarSign, Loader2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeBanco, MyGrid, type BooleanFilter, type Column, type ReportFilters, filterBancosByMoneda } from "@/components/My";
import { MyImportDialog } from "@/components/MyImportDialog";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasBancoAccess, getStoredUsername, hasAnyTabAccess } from "@/lib/auth";
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
  { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
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
  onOpenAdministracion: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string, fecha?: string, batchRecords?: Record<string, any>[]) => void;
  monedaFilter: MonedaFilter;
  onMonedaChange: (value: MonedaFilter) => void;
  username: string;
  newRecordDefaults?: Record<string, any>;
  onCloseWindow?: () => void;
  clientDateFilter: DateRange;
  onClientDateFilterChange: (range: DateRange) => void;
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
  onCloseWindow,
  clientDateFilter,
  onClientDateFilterChange: setClientDateFilter,
}: BancosContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showSaldos, setShowSaldos] = useState(false);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { toast } = useToast();
  const { showPop } = useMyPop();

  const handleRefresh = useCallback((newRecord?: Record<string, any>) => {
    onRefresh(newRecord);
    queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/bancos/related-admin"); } });
  }, [onRefresh]);

  // Deshabilitar CRUD cuando no hay un banco específico seleccionado
  const disableCrud = !bancoFilter || bancoFilter === "all";
  
  // Deshabilitar "Borrar todos" cuando filtro de banco es "todos"
  const disableBorrarFiltrados = !bancoFilter || bancoFilter === "all";

  // Escuchar evento personalizado para refrescar bancos
  useEffect(() => {
    const handleRefreshBancos = () => {
      console.log("Evento refreshBancos recibido, ejecutando handleRefresh()");
      handleRefresh();
    };
    window.addEventListener("refreshBancos", handleRefreshBancos);
    return () => {
      window.removeEventListener("refreshBancos", handleRefreshBancos);
    };
  }, [handleRefresh]);


  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );

  const { data: adminResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: ["/api/bancos/related-admin", selectedRowId],
    queryFn: () => fetch(`/api/bancos/related-admin/${encodeURIComponent(selectedRowId!)}`).then(r => r.json()),
    enabled: selectedRowId != null && selectedRowId !== "",
  });
  const adminRelacionados = selectedRowId ? (adminResponse?.data || []) : [];

  const handleRomperRelacion = useCallback(async (row: Record<string, any>) => {
    if (!selectedRowId) return;
    showPop({
      title: "Romper relación",
      message: "¿Romper la relación con este registro?",
      onConfirm: async () => {
        try {
          const resp = await fetch("/api/romper-relacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceTable: "bancos", sourceId: selectedRowId, targetTable: "administracion", targetId: row.id }),
          });
          if (!resp.ok) throw new Error();
          const result = await resp.json();
          queryClient.setQueriesData({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/bancos"); } }, (old: any) => {
            if (!old?.data) return old;
            return { ...old, data: old.data.map((r: any) => r.id === selectedRowId ? { ...r, codrel: result.source.codrel, relacionado: result.source.relacionado } : r) };
          });
          queryClient.setQueriesData({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/administracion"); } }, (old: any) => {
            if (!old?.data) return old;
            return { ...old, data: old.data.map((r: any) => r.id === row.id ? { ...r, codrel: result.target.codrel, relacionado: result.target.relacionado } : r) };
          });
          queryClient.invalidateQueries({ queryKey: ["/api/bancos/related-admin", selectedRowId] });
        } catch {
          showPop({ title: "Error", message: "No se pudo romper la relación" });
        }
      },
    });
  }, [showPop, selectedRowId]);

  const handleRelacionar = (e?: React.MouseEvent) => {
    if (selectedRowId) {
      const selectedRow = tableData.find(row => row.id === selectedRowId);
      if (e?.ctrlKey) {
        onOpenAdministracion(selectedRowId, selectedRow?.monto, selectedRow?.montodolares, selectedRow?.banco, selectedRow?.descripcion, selectedRow?.fecha, tableData);
      } else {
        onOpenAdministracion(selectedRowId, selectedRow?.monto, selectedRow?.montodolares, selectedRow?.banco, selectedRow?.descripcion, selectedRow?.fecha);
      }
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
    handleRefresh();
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
      <div className="overflow-hidden p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20" style={{ flex: '80 1 0%', minHeight: 0 }}>
        <MyGrid
          tableId="bancos-movimientos"
          tableName="bancos"
          columns={bancosColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={handleRefresh}
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

          endButtons={
            <MyButtonStyle
              color="cyan"
              onClick={() => setShowSaldos(true)}
              data-testid="button-saldos-bancos"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Saldos
            </MyButtonStyle>
          }
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

      <div className="mt-2 p-2 border rounded-md bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 border-indigo-500/20 overflow-hidden" style={{ flex: '20 1 0%', minHeight: 0 }}>
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

      <SaldosBancosDialog open={showSaldos} onOpenChange={setShowSaldos} monedaFilter={monedaFilter} />
    </div>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SaldosBancosDialog({ open, onOpenChange, monedaFilter }: { open: boolean; onOpenChange: (v: boolean) => void; monedaFilter: string }) {
  const { data, isLoading } = useQuery<{ saldos: { banco: string; saldo: number; saldo_conciliado: number; fecha: string }[]; tasa: number | null }>({
    queryKey: ["/api/bancos/saldos", monedaFilter],
    queryFn: () => fetch(`/api/bancos/saldos?moneda=${encodeURIComponent(monedaFilter)}`).then(r => r.json()),
    enabled: open,
  });

  const saldos = data?.saldos || [];
  const tasa = data?.tasa || 0;

  const totales = useMemo(() => {
    let saldoBs = 0, saldoConcBs = 0;
    for (const s of saldos) {
      saldoBs += s.saldo;
      saldoConcBs += s.saldo_conciliado;
    }
    return {
      saldoBs,
      saldoConcBs,
      saldoUsd: tasa ? saldoBs / tasa : 0,
      saldoConcUsd: tasa ? saldoConcBs / tasa : 0,
    };
  }, [saldos, tasa]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-saldos-bancos">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4" />
            Saldos por Banco {tasa ? `(Tasa: ${formatNum(tasa)})` : ""}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-xs border-collapse" data-testid="table-saldos-bancos">
            <thead>
              <tr className="border-b-2 border-muted-foreground/30">
                <th className="text-left py-1.5 px-2 font-bold">Banco</th>
                <th className="text-right py-1.5 px-2 font-bold">Saldo Bs</th>
                <th className="text-right py-1.5 px-2 font-bold">Saldo $</th>
                <th className="text-right py-1.5 px-2 font-bold">Saldo Conc. Bs</th>
                <th className="text-right py-1.5 px-2 font-bold">Saldo Conc. $</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.banco} className="border-b border-muted/40 hover:bg-muted/30" data-testid={`row-saldo-${s.banco}`}>
                  <td className="py-1.5 px-2 font-medium capitalize">{s.banco}</td>
                  <td className="py-1.5 px-2 text-right">{formatNum(s.saldo)}</td>
                  <td className="py-1.5 px-2 text-right">{tasa ? formatNum(s.saldo / tasa) : "—"}</td>
                  <td className="py-1.5 px-2 text-right">{formatNum(s.saldo_conciliado)}</td>
                  <td className="py-1.5 px-2 text-right">{tasa ? formatNum(s.saldo_conciliado / tasa) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-muted-foreground/30 font-bold">
                <td className="py-1.5 px-2">TOTAL</td>
                <td className="py-1.5 px-2 text-right">{formatNum(totales.saldoBs)}</td>
                <td className="py-1.5 px-2 text-right">{tasa ? formatNum(totales.saldoUsd) : "—"}</td>
                <td className="py-1.5 px-2 text-right">{formatNum(totales.saldoConcBs)}</td>
                <td className="py-1.5 px-2 text-right">{tasa ? formatNum(totales.saldoConcUsd) : "—"}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface BancosProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
  onOpenAdministracion?: (bancoId: string, monto?: number, montoDolares?: number, nombreBanco?: string, descripcion?: string, fecha?: string, batchRecords?: Record<string, any>[]) => void;
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
  const [comprobanteFilter, setComprobanteFilter] = useState("");
  const [operacionFilter, setOperacionFilter] = useState("");
  const [operadorFilter, setOperadorFilter] = useState("");
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [monedaFilter, setMonedaFilter] = useState<MonedaFilter>("bolivares");

  const { data: listaBancos = [] } = useQuery<string[]>({
    queryKey: ["/api/bancos/lista"],
  });

  useEffect(() => {
    if (listaBancos.length > 0 && bancoFilter === "") {
      setBancoFilter(listaBancos[0]);
    }
  }, [listaBancos, bancoFilter]);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.id}` });
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
        queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/bancos/related-admin"); } });
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
  } else if (bancoFilter === "all" && monedaFilter !== "todos") {
    const bancosMoneda = filterBancosByMoneda(
      listaBancos.map(n => ({ id: n, nombre: n, tipo: "bancos" })),
      monedaFilter
    ).map(b => b.nombre);
    if (bancosMoneda.length > 0) {
      queryParams.bancos = bancosMoneda.join(",");
    } else {
      queryParams.bancos = "__none__";
    }
  }
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }
  
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  if (comprobanteFilter.trim()) {
    queryParams.comprobante = comprobanteFilter.trim();
  }
  if (operacionFilter.trim()) {
    queryParams.operacion = operacionFilter.trim();
  }
  if (operadorFilter.trim()) {
    queryParams.operador = operadorFilter.trim();
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
                setComprobanteFilter("");
                setOperacionFilter("");
                setOperadorFilter("");
                setBooleanFilters(DEFAULT_BOOLEAN_FILTERS);
                setDateFilter({ start: "", end: "" });
                setClientDateFilter({ start: "", end: "" });
              }}
              clientDateFilter={clientDateFilter}
              onDateChange={setDateFilter}
              dateFilter={dateFilter}
              descripcion={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              showComprobanteFilter={true}
              comprobanteFilter={comprobanteFilter}
              onComprobanteChange={setComprobanteFilter}
              textFilters={[
                { field: "operacion", label: "Operación", value: operacionFilter },
                { field: "operador", label: "Operador", value: operadorFilter, options: ["suma", "resta"] },
              ]}
              onTextFilterChange={(field, value) => {
                if (field === "operacion") setOperacionFilter(value);
                if (field === "operador") setOperadorFilter(value);
              }}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
            />
          </div>
        )}

        <div className="flex items-center gap-1 px-3 pt-1 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Landmark className="h-3.5 w-3.5" />, color: "red" as const },
            { id: "parametros" as const, label: "Parámetros", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
          ]).filter(tab => tab.id !== "parametros" || hasAnyTabAccess(["bancos", "dolar", "formadepago"])).map((tab) => {
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
              onCloseWindow={onBack}
              clientDateFilter={clientDateFilter}
              onClientDateFilterChange={setClientDateFilter}
            />
          ) : (
            <BancosParametros />
          )}
        </div>
      </div>
    </MyWindow>
  );
}
