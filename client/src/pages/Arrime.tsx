import { useState, useMemo } from "react";
import { Truck, Upload } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { type ReportFilters } from "@/components/MyFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const arrimeColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "feriado", label: "Fe", defaultWidth: 40, type: "boolean" },
  { key: "ruta", label: "Ruta", defaultWidth: 100 },
  { key: "flete", label: "Flete", defaultWidth: 70, align: "right", type: "number" },
  { key: "fletechofer", label: "Flete chofer", defaultWidth: 90, align: "right", type: "number" },
  { key: "remesa", label: "Remesa", defaultWidth: 80, align: "right", type: "number" },
  { key: "ticket", label: "Ticket", defaultWidth: 80, align: "right", type: "number" },
  { key: "placa", label: "Placa", defaultWidth: 80 },
  { key: "chofer", label: "Chofer", defaultWidth: 120 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 120 },
  { key: "cantidad", label: "Peso", defaultWidth: 70, align: "right", type: "number" },
  { key: "monto", label: "Monto", defaultWidth: 80, align: "right", type: "number" },
  { key: "montochofer", label: "Monto chofer", defaultWidth: 95, align: "right", type: "number" },
  { key: "cancelado", label: "Ca", defaultWidth: 40, type: "boolean" },
  { key: "pagochofer", label: "Pa", defaultWidth: 40, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 40, type: "boolean" },
  { key: "grado", label: "Grado", defaultWidth: 60, align: "right", type: "number" },
  { key: "brix", label: "Brix", defaultWidth: 55, align: "right", type: "number" },
  { key: "pol", label: "Pol", defaultWidth: 55, align: "right", type: "number" },
  { key: "torta", label: "Torta", defaultWidth: 55, align: "right", type: "number" },
  { key: "tablon", label: "Tablon", defaultWidth: 70 },
  { key: "finca", label: "Finca", defaultWidth: 120 },
  { key: "nucleo", label: "Nucleo", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 180 },
  { key: "azucar", label: "Azucar", defaultWidth: 65, align: "right", type: "number" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "cancelado", label: "Cancelado", value: "all" },
  { field: "feriado", label: "Feriado", value: "all" },
  { field: "pagochofer", label: "Pago Chofer", value: "all" },
];

interface ArrimeContentProps {
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  onOpenReport?: (filters: ReportFilters) => void;
}

function ArrimeContent({
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  onOpenReport,
}: ArrimeContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { showPop } = useMyPop();

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
          selectedRecordDate={selectedRowDate}
          clientDateFilter={clientDateFilter}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border-blue-500/20">
        <MyGrid
          tableId="arrime-movimientos"
          tableName="arrime"
          columns={arrimeColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          middleButtons={
            <Tooltip>
              <TooltipTrigger asChild>
                <MyButtonStyle
                  color="cyan"
                  className="text-xs gap-1"
                  onClick={() => {
                    showPop({ title: "Cargar Arrime", message: "Antes escoja un central" });
                  }}
                  data-testid="button-cargar-arrime"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Cargar Arrime
                </MyButtonStyle>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
                Cargar datos de arrime
              </TooltipContent>
            </Tooltip>
          }
          onReportes={() => onOpenReport?.({
            sourceModule: "arrime",
            dateRange: dateFilter,
            textFilters: Object.fromEntries(textFilters.filter(f => f.value).map(f => [f.field, f.value])),
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>
    </div>
  );
}

interface ArrimeProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

export default function Arrime({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: ArrimeProps) {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.ticket || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/arrime/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["proveedor", "placa", "nucleo", "tablon", "central", "chofer", "ruta", "finca"], {});

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "proveedor", label: "Proveedor", value: "", options: [] },
    { field: "placa", label: "Placa", value: "", options: [] },
    { field: "nucleo", label: "Nucleo", value: "", options: [] },
    { field: "tablon", label: "Tablon", value: "", options: [] },
    { field: "central", label: "Central", value: "", options: [] },
    { field: "chofer", label: "Chofer", value: "", options: [] },
    { field: "ruta", label: "Ruta", value: "", options: [] },
    { field: "finca", label: "Finca", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "proveedor", label: "Proveedor", value: textFilters.find(f => f.field === "proveedor")?.value || "", options: parametrosOptions.proveedor || [] },
    { field: "placa", label: "Placa", value: textFilters.find(f => f.field === "placa")?.value || "", options: parametrosOptions.placa || [] },
    { field: "nucleo", label: "Nucleo", value: textFilters.find(f => f.field === "nucleo")?.value || "", options: parametrosOptions.nucleo || [] },
    { field: "tablon", label: "Tablon", value: textFilters.find(f => f.field === "tablon")?.value || "", options: parametrosOptions.tablon || [] },
    { field: "central", label: "Central", value: textFilters.find(f => f.field === "central")?.value || "", options: parametrosOptions.central || [] },
    { field: "chofer", label: "Chofer", value: textFilters.find(f => f.field === "chofer")?.value || "", options: parametrosOptions.chofer || [] },
    { field: "ruta", label: "Ruta", value: textFilters.find(f => f.field === "ruta")?.value || "", options: parametrosOptions.ruta || [] },
    { field: "finca", label: "Finca", value: textFilters.find(f => f.field === "finca")?.value || "", options: parametrosOptions.finca || [] },
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
      id="arrime"
      title="Arrime"
      icon={<Truck className="h-4 w-4 text-blue-600" />}
      tutorialId="arrime"
      initialPosition={{ x: 220, y: 120 }}
      initialSize={{ width: 1200, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-blue-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/arrime"
    >
      <ArrimeContent
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFiltersWithOptions}
        onTextFilterChange={handleTextFilterChange}
        onOpenReport={handleOpenReport}
      />
    </MyWindow>
  );
}
