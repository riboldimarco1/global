import { useState, useMemo, useEffect, useCallback } from "react";
import { Package, Settings, Loader2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import AlmacenParametros from "@/components/AlmacenParametros";
import { hasAnyTabAccess } from "@/lib/auth";

const relatedAgronomiaColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "nombre", label: "Operación", defaultWidth: 160 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

type RowHandler = (row: Record<string, any>) => void;

const almacenColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprobante", defaultWidth: 90, type: "numericText" },
  { key: "suministro", label: "Suministro", defaultWidth: 150 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "movimiento", label: "Movimiento", defaultWidth: 90 },
  { key: "saldo", label: "Existencia", defaultWidth: 90, align: "right", type: "number" },
  { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "descripcion", label: "Descripcion", defaultWidth: 200 },
  { key: "categoria", label: "Categoria", defaultWidth: 100 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface AlmacenContentProps {
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  clientDateFilter: DateRange;
  onClientDateFilterChange: (range: DateRange) => void;
  onCloseWindow?: () => void;
}

function AlmacenContent({
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  clientDateFilter,
  onClientDateFilterChange: setClientDateFilter,
  onCloseWindow,
}: AlmacenContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [pendingAgronomiaId, setPendingAgronomiaId] = useState<string | null>(() => {
    const stored = localStorage.getItem("pending_agronomia_relacionar");
    if (stored) {
      localStorage.removeItem("pending_agronomia_relacionar");
      return stored;
    }
    return null;
  });
  const [pendingAgronomiaFecha, setPendingAgronomiaFecha] = useState<string | undefined>(() => {
    const stored = localStorage.getItem("pending_agronomia_fecha");
    if (stored) {
      localStorage.removeItem("pending_agronomia_fecha");
      return stored;
    }
    return undefined;
  });
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { showPop } = useMyPop();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.agronomiaId) {
        setPendingAgronomiaId(detail.agronomiaId);
        setPendingAgronomiaFecha(detail.fecha || undefined);
      }
    };
    window.addEventListener("setAlmacenAgronomiaId", handler);
    return () => window.removeEventListener("setAlmacenAgronomiaId", handler);
  }, []);

  const handleRelacionarAfterSave = useCallback(async (savedRecord: Record<string, any>) => {
    if (!pendingAgronomiaId) return;
    try {
      const res = await fetch("/api/agronomia/relacionar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agronomiaId: pendingAgronomiaId, almacenId: savedRecord.id }),
      });
      if (res.ok) {
        queryClient.removeQueries({ predicate: (query) => {
          const key = query.queryKey as string[];
          return key[0] === "/api/almacen/related-agronomia" || key[0] === "/api/agronomia/related-almacen";
        }});
        setPendingAgronomiaId(null);
        setPendingAgronomiaFecha(undefined);
      } else {
        showPop({ title: "Error", message: "No se pudo relacionar los registros" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión al relacionar" });
    }
  }, [pendingAgronomiaId, showPop]);

  const handleRefresh = useCallback((newRecord?: Record<string, any>) => {
    onRefresh(newRecord);
    queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/almacen/related-agronomia"); } });
  }, [onRefresh]);

  const handleClearFilters = () => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const handleRomperRelacionAlmacen = useCallback(async (row: Record<string, any>) => {
    if (!selectedRowId) return;
    showPop({
      title: "Romper relación",
      message: "¿Romper la relación con este registro?",
      onConfirm: async () => {
        try {
          const resp = await fetch("/api/romper-relacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceTable: "almacen", sourceId: selectedRowId, targetTable: "agronomia", targetId: row.id }),
          });
          if (!resp.ok) throw new Error();
          queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && (k.includes("/api/almacen") || k.includes("/api/agronomia")); } });
          showPop({ title: "Listo", message: "Relación eliminada correctamente" });
        } catch {
          showPop({ title: "Error", message: "No se pudo romper la relación" });
        }
      },
    });
  }, [showPop, selectedRowId]);

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const { data: relatedAgronomia = [], isLoading: isLoadingRelated } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/almacen/related-agronomia", selectedRowId],
    queryFn: async () => {
      if (!selectedRowId) return [];
      const res = await fetch(`/api/almacen/related-agronomia/${encodeURIComponent(selectedRowId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRowId,
  });

  const filteredData = useMemo(() => {
    let result = tableData;

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
    <div className="flex flex-col h-full min-h-0 flex-1 p-3">
      {pendingAgronomiaId && (
        <div className="flex items-center gap-2 mt-1 px-2 py-1.5 rounded-md border-2 border-yellow-500 bg-yellow-500/10">
          <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
            Relacionar: Cree o edite un registro de almacén para relacionar con Agronomía ID: {pendingAgronomiaId}
          </span>
          <MyButtonStyle
            color="gray"
            onClick={() => { setPendingAgronomiaId(null); setPendingAgronomiaFecha(undefined); }}
            data-testid="button-cancelar-relacionar"
          >
            Cancelar
          </MyButtonStyle>
        </div>
      )}

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <div className="flex flex-col h-full gap-1">
          <div style={{ flex: "80 1 0%" }} className="min-h-0">
            <MyGrid
              tableId="almacen-movimientos"
              tableName="almacen"
              columns={almacenColumns}
              data={filteredData}
              onRowClick={handleRowClick}
              selectedRowId={selectedRowId}
              onEdit={onEdit}
              onCopy={onCopy}
              onRefresh={handleRefresh}
              onRemove={onRemove}
              onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); handleRelacionarAfterSave(record); }}
              newRecordDefaults={pendingAgronomiaId ? { fecha: pendingAgronomiaFecha, codrel: pendingAgronomiaId, relacionado: true } : undefined}
              filtroDeUnidad={unidadFilter}
              hasMore={hasMore}
              onLoadMore={onLoadMore}

              showReportes={true}
              onReportes={() => handleOpenReport({
                sourceModule: "almacen",
                activeTab: "entradas",
                dateRange: dateFilter,
                unidad: unidadFilter,
                textFilters: Object.fromEntries(textFilters.filter(f => !!f.value).map(f => [f.field, f.value])),
                descripcion: descripcionFilter,
                booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
              })}
            />
          </div>

          <div style={{ flex: "20 1 0%" }} className="min-h-0 border-t pt-1">
            <div className="text-xs font-bold text-green-800 dark:text-green-300 mb-1 px-1">
              Agronomía relacionados {selectedRowId ? `(ID: ${selectedRowId})` : ""}
            </div>
            {!selectedRowId ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Seleccione un registro para ver agronomía relacionada
              </div>
            ) : isLoadingRelated ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : relatedAgronomia.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Sin registros de agronomía relacionados
              </div>
            ) : (
              <MyGrid
                tableId="almacen-related-agronomia"
                tableName="agronomia"
                columns={relatedAgronomiaColumns}
                data={relatedAgronomia}
                selectedRowId={null}
                onRowAction={handleRomperRelacionAlmacen}
                readOnly={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AlmacenProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Almacen({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: AlmacenProps) {
  const { toast } = useToast();
  const { isAlegre } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const [mainTab, setMainTab] = useState<"total" | "parametros">("total");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("almacen", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

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
      const response = await fetch(`/api/almacen/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/almacen"] });
        queryClient.invalidateQueries({ predicate: (q) => { const k = q.queryKey[0]; return typeof k === "string" && k.startsWith("/api/almacen/related-agronomia"); } });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["categoria"], { unidad: unidadFilter });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "categoria", label: "Categoría", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "categoria", label: "Categoría", value: textFilters.find(f => f.field === "categoria")?.value || "", options: parametrosOptions.categoria || [] },
  ], [parametrosOptions, textFilters]);

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const handleTextFilterChange = (field: string, value: string) => {
    setTextFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  if (unidadFilter !== "all") {
    queryParams.unidad = unidadFilter;
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
  
  // Agregar textFilters al servidor
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
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
      id="almacen"
      title="Almacén"
      icon={<Package className="h-4 w-4 text-amber-800 dark:text-amber-300" />}
      tutorialId="almacen"
      initialPosition={{ x: 180, y: 120 }}
      initialSize={{ width: 1000, height: 600 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-amber-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/almacen"
    >
      <div className="flex flex-col h-full min-h-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap px-3 pt-2 pb-1">
          <MyFiltroDeUnidad
            value={unidadFilter}
            onChange={setUnidadFilter}
            showLabel={true}
            tipo="unidad"
            valueType="nombre"
            testId="almacen-filtro-unidad"
          />
          {mainTab !== "parametros" && (
            <MyFilter
              onClearFilters={() => {
                setDescripcionFilter("");
                setBooleanFilters(DEFAULT_BOOLEAN_FILTERS);
                setTextFilters([{ field: "categoria", label: "Categoría", value: "", options: [] }]);
                setDateFilter({ start: "", end: "" });
                setClientDateFilter({ start: "", end: "" });
              }}
              clientDateFilter={clientDateFilter}
              onDateChange={setDateFilter}
              dateFilter={dateFilter}
              descripcion={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              textFilters={textFiltersWithOptions}
              onTextFilterChange={handleTextFilterChange}
              unidadFilter={unidadFilter}
            />
          )}
        </div>

        <div className="flex items-center gap-1 px-3 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Package className="h-3.5 w-3.5" />, color: "red" as const },
            { id: "parametros" as const, label: "Parámetros", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
          ]).filter(tab => tab.id !== "parametros" || hasAnyTabAccess(["categorias", "fincas-almacen", "suministros"])).map((tab) => {
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
                data-testid={`tab-almacen-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mainTab === "total" ? (
            <AlmacenContent
              unidadFilter={unidadFilter}
              onUnidadChange={setUnidadFilter}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              descripcionFilter={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              textFilters={textFiltersWithOptions}
              onTextFilterChange={handleTextFilterChange}
              clientDateFilter={clientDateFilter}
              onClientDateFilterChange={setClientDateFilter}
              onCloseWindow={onBack}
            />
          ) : (
            <AlmacenParametros unidadFilter={unidadFilter} />
          )}
        </div>
      </div>
    </MyWindow>
  );
}
