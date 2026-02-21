import { useState, useMemo } from "react";
import { Leaf, Settings, Loader2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useTableData } from "@/contexts/TableDataContext";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";

const agronomiaColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "opagro", label: "Operación", defaultWidth: 160 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const relatedAlmacenColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprobante", defaultWidth: 90, type: "numericText" },
  { key: "suministro", label: "Suministro", defaultWidth: 150 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "movimiento", label: "Movimiento", defaultWidth: 90 },
  { key: "saldo", label: "Existencia", defaultWidth: 90, align: "right", type: "number" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
];

const opAgroColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface AgronomiaContentProps {
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
  onOpenAlmacen?: (agronomiaId: string) => void;
}

function AgronomiaContent({
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
  onOpenAlmacen,
}: AgronomiaContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [selectedCodrel, setSelectedCodrel] = useState<string | null>(null);
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
    setSelectedCodrel(row.codrel || null);
  };

  const handleRelacionar = () => {
    if (selectedRowId && onOpenAlmacen) {
      onOpenAlmacen(selectedRowId);
    }
  };

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

  const { data: relatedAlmacen = [], isLoading: isLoadingRelated } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/agronomia/related-almacen", selectedRowId],
    queryFn: async () => {
      if (!selectedRowId) return [];
      const res = await fetch(`/api/agronomia/related-almacen/${encodeURIComponent(selectedRowId)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedRowId,
  });

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex-1 overflow-hidden p-2 border rounded-md bg-gradient-to-br from-yellow-500/5 to-lime-500/10 border-yellow-500/20">
        <div className="flex flex-col h-full gap-1">
          <div style={{ flex: "4 1 0%" }} className="min-h-0">
            <MyGrid
              tableId="agronomia-total"
              tableName="agronomia"
              columns={agronomiaColumns}
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
              showRelacionar={true}
              onRelacionar={handleRelacionar}
            />
          </div>

          <div style={{ flex: "1 1 0%" }} className="min-h-0 border-t pt-1">
            <div className="text-xs font-bold text-yellow-800 dark:text-yellow-200 mb-1 px-1">
              Almacén relacionados {selectedRowId ? `(ID: ${selectedRowId})` : ""}
            </div>
            {!selectedRowId ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Seleccione un registro para ver almacén relacionado
              </div>
            ) : isLoadingRelated ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : relatedAlmacen.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                Sin registros de almacén relacionados
              </div>
            ) : (
              <MyGrid
                tableId="agronomia-related-almacen"
                tableName="almacen"
                columns={relatedAlmacenColumns}
                data={relatedAlmacen}
                selectedRowId={null}
                onRowClick={() => {}}
                readOnly={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpAgroParametros({ unidadFilter }: { unidadFilter: string }) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const tipo = "opagro";

  const newRecordDefaults = useMemo(() => ({
    tipo,
    ...(unidadFilter && unidadFilter !== "all" ? { unidad: unidadFilter } : {}),
  }), [tipo, unidadFilter]);

  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => {
      if (row.tipo !== tipo) return false;
      if (unidadFilter && unidadFilter !== "all" && row.unidad && row.unidad !== unidadFilter) return false;
      return true;
    });
  }, [allParametros, tipo, unidadFilter]);

  const handleSaveNew = async (data: Record<string, any>, onComplete?: (saved: Record<string, any>) => void) => {
    const username = getStoredUsername() || "sistema";
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const record: Record<string, any> = { ...data };
    record.tipo = tipo;
    if (unidadFilter && unidadFilter !== "all") {
      record.unidad = unidadFilter;
    }
    record.habilitado = record.habilitado !== undefined ? record.habilitado : true;
    record.propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    record._username = username;

    Object.keys(record).forEach(k => {
      if (typeof record[k] === "string") record[k] = record[k].toLowerCase();
    });

    try {
      const res = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const saved = await res.json();
        queryClient.setQueriesData(
          { queryKey: ["/api/parametros"] },
          (oldData: any) => Array.isArray(oldData) ? [...oldData, saved] : oldData
        );
        if (onComplete) onComplete(saved);
      } else {
        showPop({ title: "Error", message: "No se pudo guardar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
  };

  const handleBooleanChange = async (row: Record<string, any>, field: string, value: boolean) => {
    try {
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        queryClient.setQueriesData(
          { queryKey: ["/api/parametros"] },
          (oldData: any) => Array.isArray(oldData) ? oldData.map((r: any) => String(r.id) === String(row.id) ? { ...r, [field]: value } : r) : oldData
        );
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-3 h-full">
      <MyGrid
        key="agronomia-param-opagro"
        tableId="agronomia-param-opagro"
        tableName="parametros"
        columns={opAgroColumns}
        data={filteredData}
        selectedRowId={selectedRowId}
        onRowClick={(row: Record<string, any>) => setSelectedRowId(row.id)}
        onSaveNew={handleSaveNew}
        onRefresh={handleRefresh}
        onBooleanChange={handleBooleanChange}
        currentTabName={tipo}
        filtroDeUnidad={unidadFilter}
        newRecordDefaults={newRecordDefaults}
        onRecordSaved={(record: Record<string, any>) => setSelectedRowId(record.id)}
      />
    </div>
  );
}

interface AgronomiaProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
  onOpenAlmacen?: (agronomiaId: string) => void;
}

export default function Agronomia({ onBack, onFocus, zIndex, minimizedIndex, isStandalone, onOpenAlmacen }: AgronomiaProps) {
  const { isAlegre, rainbowEnabled } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const [mainTab, setMainTab] = useState<"total" | "operaciones">("total");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("agronomia", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [textFilters, setTextFilters] = useState<TextFilter[]>([]);

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
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
    }
  }
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="agronomia"
      title="Agronomía"
      icon={<Leaf className="h-4 w-4 text-yellow-800 dark:text-yellow-300" />}
      tutorialId="agronomia"
      initialPosition={{ x: 160, y: 100 }}
      initialSize={{ width: 1000, height: 600 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-yellow-500/40"
      autoLoadTable={mainTab === "total"}
      queryParams={queryParams}
      isStandalone={isStandalone}
      popoutUrl="/standalone/agronomia"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 flex-wrap px-3 pt-2 pb-1">
          <MyFiltroDeUnidad
            value={unidadFilter}
            onChange={setUnidadFilter}
            showLabel={true}
            tipo="unidad"
            valueType="nombre"
            testId="agronomia-filtro-unidad"
          />
          {mainTab !== "operaciones" && (
            <MyFilter
              onClearFilters={() => {
                setDescripcionFilter("");
                setBooleanFilters(DEFAULT_BOOLEAN_FILTERS);
                setTextFilters([]);
                setDateFilter({ start: "", end: "" });
              }}
              onDateChange={setDateFilter}
              dateFilter={dateFilter}
              descripcion={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              textFilters={textFilters}
              onTextFilterChange={handleTextFilterChange}
              unidadFilter={unidadFilter}
            />
          )}
        </div>

        <div className="flex items-center gap-1 px-3 pb-1">
          {([
            { id: "total" as const, label: "Total", icon: <Leaf className="h-3.5 w-3.5" />, color: "red" as const },
            { id: "operaciones" as const, label: "Operaciones Agronómicas", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
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
                data-testid={`tab-agronomia-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mainTab === "total" ? (
            <AgronomiaContent
              unidadFilter={unidadFilter}
              onUnidadChange={setUnidadFilter}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              descripcionFilter={descripcionFilter}
              onDescripcionChange={setDescripcionFilter}
              booleanFilters={booleanFilters}
              onBooleanFilterChange={handleBooleanFilterChange}
              textFilters={textFilters}
              onTextFilterChange={handleTextFilterChange}
              onOpenAlmacen={onOpenAlmacen}
            />
          ) : (
            <OpAgroParametros unidadFilter={unidadFilter} />
          )}
        </div>
      </div>
    </MyWindow>
  );
}
