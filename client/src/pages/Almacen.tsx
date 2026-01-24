import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import MyFilter, { type BooleanFilter, type TextFilter } from "@/components/MyFilter";
import MyFiltroDeUnidad from "@/components/MyFiltroDeUnidad";
import MyGrid, { type Column } from "@/components/MyGrid";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";

type RowHandler = (row: Record<string, any>) => void;

const almacenColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Compro", defaultWidth: 70, type: "numericText" },
  { key: "insumo", label: "Insumo", defaultWidth: 150 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "operacion", label: "Operación", defaultWidth: 90 },
  { key: "monto", label: "Costo", defaultWidth: 80, align: "right", type: "number" },
  { key: "precio", label: "Precio", defaultWidth: 80, align: "right", type: "number" },
  { key: "saldo", label: "Existencia", defaultWidth: 90, align: "right", type: "number" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "descripcion", label: "Descripcion", defaultWidth: 200 },
  { key: "categoria", label: "Categoria", defaultWidth: 100 },
  { key: "unidad", label: "Unidad", defaultWidth: 100 },
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
  const { tableData, hasMore, onLoadMore, onRefresh, onEdit, onCopy, onDelete } = useTableData();

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

    return result;
  }, [tableData, descripcionFilter, booleanFilters, textFilters]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="almacen"
          testId="almacen-filtro-unidad"
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
          tableId="almacen-movimientos"
          tableName="almacen"
          columns={almacenColumns}
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

interface AlmacenProps {
  onBack: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function Almacen({ onBack, onFocus, zIndex }: AlmacenProps) {
  const { toast } = useToast();
  const [unidadFilter, setUnidadFilter] = useState("all");
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

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Eliminar registro?",
      description: `#${row.comprobante || row.id}`,
      action: (
        <button className="bg-red-600 text-white px-3 py-1 rounded text-xs" onClick={() => toast({ title: "Eliminado" })}>
          Confirmar
        </button>
      ),
    });
  };

  const { data: insumos = [] } = useQuery<string[]>({ queryKey: ["/api/almacen/insumos"] });
  const { data: operaciones = [] } = useQuery<string[]>({ queryKey: ["/api/almacen/operaciones"] });
  const { data: categorias = [] } = useQuery<string[]>({ queryKey: ["/api/almacen/categorias"] });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "insumo", label: "Insumo", value: "", options: [] },
    { field: "operacion", label: "Operación", value: "", options: [] },
    { field: "categoria", label: "Categoría", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "insumo", label: "Insumo", value: textFilters.find(f => f.field === "insumo")?.value || "", options: insumos },
    { field: "operacion", label: "Operación", value: textFilters.find(f => f.field === "operacion")?.value || "", options: operaciones },
    { field: "categoria", label: "Categoría", value: textFilters.find(f => f.field === "categoria")?.value || "", options: categorias },
  ], [insumos, operaciones, categorias, textFilters]);

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
      id="almacen"
      title="Almacén"
      icon={<Package className="h-4 w-4 text-amber-600" />}
      initialPosition={{ x: 180, y: 120 }}
      initialSize={{ width: 1000, height: 600 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-amber-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
    >
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
    </MyWindow>
  );
}
