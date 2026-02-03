import { useState, useMemo } from "react";
import { Database } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";

type RowHandler = (row: Record<string, any>) => void;

const agrodataColumns: Column[] = [
  { key: "nombre", label: "Nombre", defaultWidth: 150 },
  { key: "equipo", label: "Equipo", defaultWidth: 120 },
  { key: "plan", label: "Plan", defaultWidth: 100 },
  { key: "ip", label: "IP", defaultWidth: 120, type: "ip" },
  { key: "mac", label: "MAC", defaultWidth: 140, type: "mac" },
  { key: "latencia", label: "Latencia", defaultWidth: 80 },
  { key: "estado", label: "Estado", defaultWidth: 90 },
  { key: "monto", label: "Monto", defaultWidth: 90, align: "right", type: "number" },
  { key: "montodolares", label: "Monto $", defaultWidth: 90, align: "right", type: "number" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface AgrodataContentProps {
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
}

function AgrodataContent({
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
}: AgrodataContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

  const handleClearFilters = () => {
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const filteredData = useMemo(() => {
    let result = tableData;

    textFilters.forEach((filter) => {
      if (filter.value) {
        result = result.filter((row) => {
          const val = row[filter.field];
          return val && String(val).toLowerCase().includes(filter.value.toLowerCase());
        });
      }
    });

    booleanFilters.forEach((filter) => {
      if (filter.value !== "all") {
        result = result.filter((row) => {
          if (filter.field === "estado") {
            const isActive = row[filter.field] === "activo";
            return filter.value === "true" ? isActive : !isActive;
          }
          const val = row[filter.field];
          return filter.value === "true" ? val === true : val === false;
        });
      }
    });

    if (descripcionFilter) {
      result = result.filter((row) =>
        row.descripcion && String(row.descripcion).toLowerCase().includes(descripcionFilter.toLowerCase())
      );
    }

    return result;
  }, [tableData, textFilters, booleanFilters, descripcionFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFilter
          onClearFilters={handleClearFilters}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-cyan-500/20">
        <MyGrid
          tableId="agrodata-equipos"
          tableName="agrodata"
          columns={agrodataColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "agrodata",
            activeTab: "equipos",
            dateRange: { start: "", end: "" },
            textFilters: Object.fromEntries(textFilters.filter(f => !!f.value).map(f => [f.field, f.value])),
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>
    </div>
  );
}

interface AgrodataProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Agrodata({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: AgrodataProps) {
  const { toast } = useToast();
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>([
    ...DEFAULT_BOOLEAN_FILTERS,
    { field: "estado", label: "Estado", value: "all" },
  ]);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro ${row.nombre || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/agrodata/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/agrodata"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["equipo", "plan"], {});

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "nombre", label: "Nombre", value: "", options: [] },
    { field: "equipo", label: "Equipo", value: "", options: [] },
    { field: "plan", label: "Plan", value: "", options: [] },
    { field: "ip", label: "IP", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "nombre", label: "Nombre", value: textFilters.find(f => f.field === "nombre")?.value || "", options: [] },
    { field: "equipo", label: "Equipo", value: textFilters.find(f => f.field === "equipo")?.value || "", options: parametrosOptions.equipo || [] },
    { field: "plan", label: "Plan", value: textFilters.find(f => f.field === "plan")?.value || "", options: parametrosOptions.plan || [] },
    { field: "ip", label: "IP", value: textFilters.find(f => f.field === "ip")?.value || "", options: [] },
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
      if (filter.field === "estado") {
        queryParams[filter.field] = filter.value === "true" ? "activo" : "suspendido";
      } else {
        queryParams[filter.field] = filter.value;
      }
    }
  }

  return (
    <MyWindow
      id="agrodata"
      title="Agrodata"
      icon={<Database className="h-4 w-4 text-cyan-600" />}
      initialPosition={{ x: 200, y: 140 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
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
      popoutUrl="/standalone/agrodata"
    >
      <AgrodataContent
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
