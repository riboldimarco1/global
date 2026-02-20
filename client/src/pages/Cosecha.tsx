import { useState, useMemo, useCallback } from "react";
import { Wheat, Settings } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import CosechaParametros from "@/components/CosechaParametros";

const cosechaColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "chofer", label: "Chofer", defaultWidth: 120 },
  { key: "placa", label: "Placa", defaultWidth: 80 },
  { key: "ciclo", label: "Ciclo", defaultWidth: 100 },
  { key: "destino", label: "Destino", defaultWidth: 100 },
  { key: "torbas", label: "Torbas", defaultWidth: 60, align: "right", type: "number" },
  { key: "tablon", label: "Tablón", defaultWidth: 70 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "cantnet", label: "Cant.Neta", defaultWidth: 80, align: "right", type: "number" },
  { key: "descporc", label: "Desc%", defaultWidth: 60, align: "right", type: "number" },
  { key: "cancelado", label: "Cancel", defaultWidth: 60, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "descripcion", label: "Descripción", defaultWidth: 180 },
  { key: "cultivo", label: "Cultivo", defaultWidth: 80 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "cancelado", label: "Cancelado", value: "all" },
];

const TEXT_FILTER_FIELDS = [
  { field: "cultivo", label: "Cultivo" },
  { field: "ciclo", label: "Ciclo" },
  { field: "chofer", label: "Chofer" },
  { field: "destino", label: "Destino" },
];

const PARAMETROS_FIELDS = ["cultivo", "ciclo", "chofer", "destino"] as const;

interface CosechaContentProps {
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
}

function CosechaContent({
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
}: CosechaContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

  const handleClearFilters = useCallback(() => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  }, [onDescripcionChange, booleanFilters, onBooleanFilterChange, textFilters, onTextFilterChange, dateFilter, onDateChange]);

  const handleRowClick = useCallback((row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  }, []);

  const handleOpenReport = useCallback((filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  }, []);

  const filteredData = useMemo(() => {
    if (!clientDateFilter.start && !clientDateFilter.end) return tableData;
    return tableData.filter((row) => {
      const rowDate = row.fecha;
      if (!rowDate) return false;
      if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
      if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
      return true;
    });
  }, [tableData, clientDateFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex-1 overflow-hidden p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="cosecha-movimientos"
          tableName="cosecha"
          columns={cosechaColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "cosecha",
            activeTab: "cosecha",
            dateRange: dateFilter,
            unidad: unidadFilter,
            textFilters: Object.fromEntries(textFilters.filter(f => !!f.value).map(f => [f.field, f.value])),
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>
    </div>
  );
}

interface CosechaProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

export default function Cosecha({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: CosechaProps) {
  const { toast } = useToast();
  const { isAlegre, rainbowEnabled } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const [mainTab, setMainTab] = useState<"total" | "parametros">("total");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("cosecha", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});

  const handleEdit = useCallback((row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  }, [toast]);

  const handleCopy = useCallback((row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  }, [toast]);

  const handleDelete = useCallback(async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/cosecha/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/cosecha"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  }, [toast]);

  const filterOptions = useMemo(() => ({ unidad: unidadFilter }), [unidadFilter]);
  const parametrosOptions = useMultipleParametrosOptions(PARAMETROS_FIELDS as unknown as string[], filterOptions);

  const textFilters = useMemo<TextFilter[]>(() => {
    return TEXT_FILTER_FIELDS.map(({ field, label }) => ({
      field,
      label,
      value: textFilterValues[field] || "",
      options: parametrosOptions[field] || [],
    }));
  }, [textFilterValues, parametrosOptions]);

  const handleBooleanFilterChange = useCallback((field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  }, []);

  const handleTextFilterChange = useCallback((field: string, value: string) => {
    setTextFilterValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      unidad: unidadFilter,
    };
    if (dateFilter.start) {
      params.fechaInicio = dateFilter.start;
    }
    if (dateFilter.end) {
      params.fechaFin = dateFilter.end;
    }
    if (descripcionFilter.trim()) {
      params.descripcion = descripcionFilter.trim();
    }
    for (const [field, value] of Object.entries(textFilterValues)) {
      if (value && value.trim()) {
        params[field] = value.trim();
      }
    }
    for (const filter of booleanFilters) {
      if (filter.value !== "all") {
        params[filter.field] = filter.value;
      }
    }
    return params;
  }, [unidadFilter, dateFilter.start, dateFilter.end, descripcionFilter, textFilterValues, booleanFilters]);

  return (
    <MyWindow
      id="cosecha"
      title="Cosecha"
      icon={<Wheat className="h-4 w-4 text-yellow-800 dark:text-yellow-200" />}
      tutorialId="cosecha"
      initialPosition={{ x: 200, y: 140 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-yellow-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/cosecha"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 flex-wrap px-3 pt-2 pb-1">
          <MyFiltroDeUnidad
            value={unidadFilter}
            onChange={setUnidadFilter}
            showLabel={true}
            tipo="unidad"
            valueType="nombre"
            testId="cosecha-filtro-unidad"
          />
          {mainTab !== "parametros" && (
            <MyFilter
              onClearFilters={() => {
                setBooleanFilters(DEFAULT_BOOLEAN_FILTERS);
                setTextFilterValues({});
                setDateFilter({ start: "", end: "" });
              }}
              onDateChange={setDateFilter}
              dateFilter={dateFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              textFilters={textFilters.filter(f => f.field !== "destino")}
              onTextFilterChange={handleTextFilterChange}
              unidadFilter={unidadFilter}
            />
          )}
        </div>

        <div className="flex items-center gap-1 px-3 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Wheat className="h-3.5 w-3.5" />, color: "red" as const },
            { id: "parametros" as const, label: "Parámetros", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
          ]).map((tab) => {
            const isActive = mainTab === tab.id;
            const effectiveColor = rainbowEnabled ? tab.color : ("slate" as const);
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
                data-testid={`tab-cosecha-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
          <p className="text-lg font-bold">Fase 3 - Filtros y tabs, sin grid</p>
        </div>
      </div>
    </MyWindow>
  );
}
