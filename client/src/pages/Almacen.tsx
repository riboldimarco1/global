import { useState, useMemo } from "react";
import { Package } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import MyFilter, { type BooleanFilter } from "@/components/MyFilter";
import MyFiltroDeUnidad from "@/components/MyFiltroDeUnidad";
import MyGrid, { type Column } from "@/components/MyGrid";

const almacenColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comp.", defaultWidth: 70 },
  { key: "insumo", label: "Insumo", defaultWidth: 120 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "operacion", label: "Operación", defaultWidth: 80 },
  { key: "costo", label: "Costo", defaultWidth: 80, align: "right", type: "number" },
  { key: "precio", label: "Precio", defaultWidth: 80, align: "right", type: "number" },
  { key: "existencia", label: "Existencia", defaultWidth: 90, align: "right", type: "number" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "categoria", label: "Categoría", defaultWidth: 100 },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface AlmacenContentProps {
  tableData?: Record<string, any>[];
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
}

function AlmacenContent({
  tableData = [],
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
}: AlmacenContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleClearFilters = () => {
    onUnidadChange("all");
    onDateChange({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
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
        row.insumo?.toLowerCase().includes(search) ||
        row.categoria?.toLowerCase().includes(search)
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

    return result;
  }, [tableData, descripcionFilter, booleanFilters]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="almacen"
          testId="almacen-filtro-unidad"
        />
        <MyFilter
          onClearFilters={handleClearFilters}
          onDateChange={onDateChange}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="almacen-movimientos"
          columns={almacenColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
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
  const [unidadFilter, setUnidadFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  if (unidadFilter !== "all") {
    queryParams.unidadId = unidadFilter;
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
      />
    </MyWindow>
  );
}
