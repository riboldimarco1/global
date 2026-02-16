import { useState, useMemo } from "react";
import { Package, Settings } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import AlmacenParametros from "@/components/AlmacenParametros";

type RowHandler = (row: Record<string, any>) => void;

const almacenColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprobante", defaultWidth: 90, type: "numericText" },
  { key: "suministro", label: "Suministro", defaultWidth: 150 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "movimiento", label: "Movimiento", defaultWidth: 90 },
  { key: "saldo", label: "Existencia", defaultWidth: 90, align: "right", type: "number" },
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
}: AlmacenContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

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

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  // Filtrado local solo para fecha cliente (click en celdas)
  // Los demás filtros (descripcion, textFilters, booleanFilters) ahora se envían al servidor
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
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="almacen-filtro-unidad"
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
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="almacen-movimientos"
          tableName="almacen"
          columns={almacenColumns}
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
  const { isAlegre, rainbowEnabled } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const [mainTab, setMainTab] = useState<"total" | "parametros">("total");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("almacen", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
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
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1 px-3 pt-2 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Package className="h-3.5 w-3.5" />, color: "red" as const },
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
            />
          ) : (
            <AlmacenParametros />
          )}
        </div>
      </div>
    </MyWindow>
  );
}
