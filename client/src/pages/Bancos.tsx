import { useState, useMemo, useEffect } from "react";
import { Landmark } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import MyFilter, { type BooleanFilter } from "@/components/MyFilter";
import MyFiltroDeBanco from "@/components/MyFiltroDeBanco";
import MyGrid, { type Column } from "@/components/MyGrid";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useQuery } from "@tanstack/react-query";

type RowHandler = (row: Record<string, any>) => void;

const bancosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "operador", label: "Operador", defaultWidth: 80 },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "operacion", label: "Operación", defaultWidth: 120 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 110, align: "right", type: "number" },
  { key: "monto_dolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
  { key: "saldo", label: "Saldo", defaultWidth: 110, align: "right", type: "number" },
  { key: "saldo_conciliado", label: "Saldo Conc.", defaultWidth: 110, align: "right", type: "number" },
  { key: "conciliado", label: "Conc", defaultWidth: 50, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "conciliado", label: "Conciliado", value: "all" },
  { field: "utility", label: "Utilidad", value: "all" },
];

interface BancosContentProps {
  bancoFilter: string;
  onBancoChange: (banco: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
}

function BancosContent({
  bancoFilter,
  onBancoChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
}: BancosContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { tableData, hasMore, onLoadMore, onRefresh, onEdit, onCopy, onDelete } = useTableData();

  const handleClearFilters = () => {
    onBancoChange("all");
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

    return result;
  }, [tableData, descripcionFilter, booleanFilters]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeBanco
          value={bancoFilter}
          onChange={onBancoChange}
          showLabel={true}
          testId="bancos-filtro-banco"
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
          tableId="bancos-movimientos"
          tableName="bancos"
          columns={bancosColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
          onRefresh={onRefresh}
          filtroDeBanco={bancoFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
}

interface BancosProps {
  onBack: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function Bancos({ onBack, onFocus, zIndex }: BancosProps) {
  const { toast } = useToast();
  const [bancoFilter, setBancoFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const { data: listaBancos = [] } = useQuery<string[]>({
    queryKey: ["/api/bancos/lista"],
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (listaBancos.length > 0 && bancoFilter === "") {
      setBancoFilter(listaBancos[0]);
    }
  }, [listaBancos, bancoFilter]);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Eliminar registro?",
      description: `#${row.numero || row.id}`,
      action: (
        <button className="bg-red-600 text-white px-3 py-1 rounded text-xs" onClick={() => toast({ title: "Eliminado" })}>
          Confirmar
        </button>
      ),
    });
  };

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  if (bancoFilter && bancoFilter !== "all") {
    queryParams.banco = bancoFilter;
  }
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }

  return (
    <MyWindow
      id="bancos"
      title="Bancos"
      icon={<Landmark className="h-4 w-4 text-cyan-500" />}
      initialPosition={{ x: 150, y: 100 }}
      initialSize={{ width: 1000, height: 600 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-cyan-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
    >
      <BancosContent
        bancoFilter={bancoFilter}
        onBancoChange={setBancoFilter}
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
