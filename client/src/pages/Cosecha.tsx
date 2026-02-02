import { useState, useMemo } from "react";
import { Wheat } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";

type RowHandler = (row: Record<string, any>) => void;

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

  const filteredData = useMemo(() => {
    let result = tableData;

    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      result = result.filter((row) =>
        row.descripcion?.toLowerCase().includes(search)
      );
    }

    booleanFilters.forEach((filter) => {
      if (filter.value !== "all") {
        const boolValue = filter.value === "true";
        result = result.filter((row) => {
          const val = row[filter.field];
          if (typeof val === "boolean") return val === boolValue;
          if (typeof val === "string") return (val === "t") === boolValue;
          return true;
        });
      }
    });

    textFilters.forEach((filter) => {
      if (filter.value) {
        result = result.filter((row) => row[filter.field] === filter.value);
      }
    });

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
  }, [tableData, descripcionFilter, booleanFilters, textFilters, clientDateFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="cosecha-filtro-unidad"
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
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
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
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("cosecha", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

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
  };

  const parametrosOptions = useMultipleParametrosOptions(["cultivo", "ciclo", "chofer", "destino"], { unidad: unidadFilter });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "cultivo", label: "Cultivo", value: "", options: [] },
    { field: "ciclo", label: "Ciclo", value: "", options: [] },
    { field: "chofer", label: "Chofer", value: "", options: [] },
    { field: "destino", label: "Destino", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "cultivo", label: "Cultivo", value: textFilters.find(f => f.field === "cultivo")?.value || "", options: parametrosOptions.cultivo || [] },
    { field: "ciclo", label: "Ciclo", value: textFilters.find(f => f.field === "ciclo")?.value || "", options: parametrosOptions.ciclo || [] },
    { field: "chofer", label: "Chofer", value: textFilters.find(f => f.field === "chofer")?.value || "", options: parametrosOptions.chofer || [] },
    { field: "destino", label: "Destino", value: textFilters.find(f => f.field === "destino")?.value || "", options: parametrosOptions.destino || [] },
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

  return (
    <MyWindow
      id="cosecha"
      title="Cosecha"
      icon={<Wheat className="h-4 w-4 text-yellow-600" />}
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
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/cosecha"
    >
      <CosechaContent
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
    </MyWindow>
  );
}
