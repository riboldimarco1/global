import { useState, useMemo } from "react";
import { FileText } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";

const chequesColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "beneficiario", label: "Beneficiario", defaultWidth: 150, type: "text" },
  { key: "monto", label: "Monto", defaultWidth: 90, align: "right", type: "number" },
  { key: "deuda", label: "Deuda", defaultWidth: 80, align: "right", type: "number" },
  { key: "resta", label: "Resta", defaultWidth: 80, align: "right", type: "number" },
  { key: "descuento", label: "Descuento", defaultWidth: 80, align: "right", type: "number" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "personal", label: "Personal", defaultWidth: 100, type: "text" },
  { key: "proveedor", label: "Proveedor", defaultWidth: 100, type: "text" },
  { key: "actividad", label: "Actividad", defaultWidth: 120 },
  { key: "transferido", label: "Transf", defaultWidth: 55, type: "boolean" },
  { key: "imprimido", label: "Impr", defaultWidth: 50, type: "boolean" },
  { key: "contabilizado", label: "Cont", defaultWidth: 50, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 45, type: "boolean" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "transferido", label: "Transferido", value: "all" },
  { field: "imprimido", label: "Imprimido", value: "all" },
  { field: "contabilizado", label: "Contabilizado", value: "all" },
];

interface ChequesContentProps {
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

function ChequesContent({
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
}: ChequesContentProps) {
  const { tableData, hasMore, onLoadMore, onRefresh, onEdit, onCopy, onDelete } = useTableData();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleClearFilters = () => {
    onUnidadChange("all");
    onDateChange({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  const filteredData = useMemo(() => {
    let result = tableData;

    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      result = result.filter((row) =>
        row.descripcion?.toLowerCase().includes(search) ||
        row.beneficiario?.toLowerCase().includes(search)
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

    return result;
  }, [tableData, descripcionFilter, booleanFilters, textFilters]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="cheques-filtro-unidad"
          autoSelectFirst
        />
        <MyFilter
          onClearFilters={handleClearFilters}
          onDateChange={onDateChange}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="cheques-movimientos"
          tableName="cheques"
          columns={chequesColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
          onRefresh={onRefresh}
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
}

interface ChequesProps {
  onBack: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function Cheques({ onBack, onFocus, zIndex }: ChequesProps) {
  const { toast } = useToast();
  const [unidadFilter, setUnidadFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    const text = JSON.stringify(row, null, 2);
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Eliminar registro?",
      description: `#${row.numero || row.id}`,
      action: (
        <button
          className="bg-red-600 text-white px-3 py-1 rounded text-xs"
          onClick={() => toast({ title: "Eliminado", description: "Registro eliminado" })}
        >
          Confirmar
        </button>
      ),
    });
  };

  const parametrosOptions = useMultipleParametrosOptions(["banco", "actividad"], { unidad: unidadFilter });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "banco", label: "Banco", value: "", options: [] },
    { field: "actividad", label: "Actividad", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "banco", label: "Banco", value: textFilters.find(f => f.field === "banco")?.value || "", options: parametrosOptions.banco || [] },
    { field: "actividad", label: "Actividad", value: textFilters.find(f => f.field === "actividad")?.value || "", options: parametrosOptions.actividad || [] },
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
      id="cheques"
      title="Cheques"
      icon={<FileText className="h-4 w-4 text-green-600" />}
      initialPosition={{ x: 220, y: 160 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-green-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
    >
      <ChequesContent
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
