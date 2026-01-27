import { useState, useMemo, useEffect } from "react";
import { Landmark } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeBanco, MyGrid, type BooleanFilter, type Column } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

type RowHandler = (row: Record<string, any>) => void;

const bancosColumns: Column[] = [
  { key: "id", label: "ID", defaultWidth: 70, editable: false },
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
  { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
  { key: "administracion_id", label: "Admin ID", defaultWidth: 80, editable: false },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "conciliado", label: "Conciliado", value: "all" },
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "relacionado", label: "Relacionado", value: "all" },
];

const adminRelacionadosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "tipo", label: "Tipo", defaultWidth: 80 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
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
  onOpenAdministracion: (bancoId: string, monto?: number, montoDolares?: number) => void;
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
  onOpenAdministracion,
}: BancosContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

  // Escuchar evento personalizado para refrescar bancos
  useEffect(() => {
    const handleRefreshBancos = () => {
      console.log("Evento refreshBancos recibido, ejecutando onRefresh()");
      onRefresh();
    };
    window.addEventListener("refreshBancos", handleRefreshBancos);
    return () => {
      window.removeEventListener("refreshBancos", handleRefreshBancos);
    };
  }, [onRefresh]);

  // Obtener el administracion_id del registro de banco seleccionado
  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );
  const selectedAdminId = selectedRow?.administracion_id;

  // Solo buscar registros relacionados cuando el banco seleccionado tiene relacionado=true
  const isRelacionado = selectedRow?.relacionado === true || selectedRow?.relacionado === "t";

  // Buscar registros de administración relacionados por banco_id
  const { data: adminPorBancoId = [] } = useQuery<Record<string, any>[]>({
    queryKey: [`/api/administracion?banco_id=${selectedRowId}`],
    enabled: !!selectedRowId && isRelacionado,
    staleTime: 0,
  });

  // Buscar el registro de administración por su ID (cuando banco tiene administracion_id)
  const { data: adminPorId = [] } = useQuery<Record<string, any>[]>({
    queryKey: [`/api/administracion?id=${selectedAdminId}`],
    enabled: !!selectedAdminId && isRelacionado,
    staleTime: 0,
  });

  // Combinar ambos resultados, eliminando duplicados
  const adminRelacionados = useMemo(() => {
    const combined = [...adminPorBancoId, ...adminPorId];
    const unique = combined.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );
    return unique;
  }, [adminPorBancoId, adminPorId]);

  const handleRelacionar = () => {
    if (selectedRowId) {
      const selectedRow = tableData.find(row => row.id === selectedRowId);
      onOpenAdministracion(selectedRowId, selectedRow?.monto, selectedRow?.monto_dolares);
    }
  };

  const handleClearFilters = () => {
    onBancoChange("all");
    onDateChange({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
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
          // Treat null/undefined as false
          return boolValue === false;
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
          dateFilter={dateFilter}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          selectedRecordDate={selectedRowDate}
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
          onRefresh={onRefresh}
          onRemove={onRemove}
          filtroDeBanco={bancoFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          showRelacionar={true}
          onRelacionar={handleRelacionar}
        />
      </div>

      <div className="h-32 mt-2 p-2 border rounded-md bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 border-indigo-500/20">
        <div className="text-xs font-medium text-muted-foreground mb-1">Registros de Administración relacionados</div>
        {adminRelacionados.length > 0 ? (
          <MyGrid
            tableId="bancos-admin-relacionados"
            tableName="administracion"
            columns={adminRelacionadosColumns}
            data={adminRelacionados}
            selectedRowId={null}
            readOnly={true}
            compactHeader={true}
          />
        ) : (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            {selectedRowId ? "No hay registros relacionados" : "Seleccione un registro de banco"}
          </div>
        )}
      </div>
    </div>
  );
}

interface BancosProps {
  minimizedIndex?: number;
  onBack: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  onOpenAdministracion?: (bancoId: string, monto?: number, montoDolares?: number) => void;
}

export default function Bancos({ onBack, onFocus, zIndex, minimizedIndex, onOpenAdministracion }: BancosProps) {
  const { toast } = useToast();
  const [bancoFilter, setBancoFilter] = usePersistedFilter("bancos", "banco", "all");
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

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/bancos/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
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
      minimizedIndex={minimizedIndex}
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
        onOpenAdministracion={onOpenAdministracion || (() => {})}
      />
    </MyWindow>
  );
}
