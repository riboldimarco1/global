import { useState, useMemo, useCallback, useEffect } from "react";
import { Building2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyTab, MyGrid, type BooleanFilter, type TextFilter, type TabConfig, type Column } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const bancosRelacionadosColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "operacion", label: "Operación", defaultWidth: 100 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
];

type RowHandler = (row: Record<string, any>) => void;

const TAB_TEXT_FILTER_FIELDS: Record<string, { field: string; label: string }[]> = {
  facturas: [
    { field: "actividad", label: "Actividad" },
    { field: "proveedor", label: "Proveedor" },
    { field: "insumo", label: "Insumo" },
  ],
  cuentasporpagar: [
    { field: "actividad", label: "Actividad" },
    { field: "proveedor", label: "Proveedor" },
    { field: "insumo", label: "Insumo" },
  ],
  nomina: [
    { field: "personal", label: "Personal" },
    { field: "actividad", label: "Actividad" },
  ],
  prestamos: [
    { field: "personal", label: "Personal" },
    { field: "actividad", label: "Actividad" },
  ],
  ventas: [
    { field: "producto", label: "Producto" },
    { field: "cliente", label: "Cliente" },
  ],
  cuentasporcobrar: [
    { field: "producto", label: "Producto" },
    { field: "cliente", label: "Cliente" },
  ],
};

const TAB_BOOLEAN_FILTER_FIELDS: Record<string, { field: string; label: string }[]> = {
  facturas: [
    { field: "capital", label: "Capital" },
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  nomina: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  ventas: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
    { field: "relacionado", label: "Relacionado" },
  ],
  cuentasporpagar: [
    { field: "utility", label: "Utilidad" },
    { field: "relacionado", label: "Relacionado" },
  ],
  cuentasporcobrar: [
    { field: "utility", label: "Utilidad" },
    { field: "relacionado", label: "Relacionado" },
  ],
  prestamos: [
    { field: "utility", label: "Utilidad" },
    { field: "relacionado", label: "Relacionado" },
  ],
};

const adminTabs: TabConfig[] = [
  {
    id: "facturas",
    label: "Facturas",
    tipo: "facturas",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "insumo", label: "Insumo", defaultWidth: 120 },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
      { key: "comprobante", label: "Comprobante", defaultWidth: 100, type: "numericText" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    tipo: "nomina",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    tipo: "ventas",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "cuentasporcobrar",
    label: "Cuentas por Cobrar",
    tipo: "cuentasporcobrar",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "prestamos",
    label: "Préstamos",
    tipo: "prestamos",
    columns: [
      { key: "id", label: "ID", defaultWidth: 80, type: "text", editable: false },
      { key: "banco_id", label: "Banco ID", defaultWidth: 80, type: "text", editable: false },
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "utility", label: "Utilidad", defaultWidth: 80, type: "boolean" },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
];

interface DateRange {
  start: string;
  end: string;
}

interface AdminContentProps {
  tableData?: Record<string, any>[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilterValues: Record<string, string>;
  onTextFilterChange: (field: string, value: string) => void;
  onEdit?: RowHandler;
  onCopy?: RowHandler;
  onAgregar?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
  newRecordDefaults?: Record<string, any>;
  onRecordSaved?: (record: Record<string, any>) => void;
}

function AdminContent({ 
  tableData = [], 
  activeTab,
  onTabChange,
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilterValues,
  onTextFilterChange,
  onEdit,
  onCopy,
  onAgregar,
  hasMore,
  onLoadMore,
  onSaveNew,
  onRefresh,
  newRecordDefaults,
  onRecordSaved,
}: AdminContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const currentTab = adminTabs.find(t => t.id === activeTab);

  // Buscar bancos que tienen administracion_id igual al registro seleccionado
  const { data: bancosRelacionadosData } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: [`/api/bancos?administracion_id=${selectedRowId}`],
    enabled: !!selectedRowId,
    staleTime: 0,
  });

  const bancosRelacionados = bancosRelacionadosData?.data || [];

  const handleClearFilters = () => {
    onUnidadChange("all");
    onDateChange({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach(f => onBooleanFilterChange(f.field, "all"));
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    fields.forEach(f => onTextFilterChange(f.field, ""));
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const textFilters = useMemo<TextFilter[]>(() => {
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    return fields.map(({ field, label }) => ({
      field,
      label,
      value: textFilterValues[field] || "",
    }));
  }, [activeTab, textFilterValues]);

  const filterData = useCallback((row: Record<string, any>): boolean => {
    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      if (!row.descripcion?.toLowerCase().includes(search)) return false;
    }
    
    for (const filter of booleanFilters) {
      if (filter.value !== "all") {
        const boolValue = filter.value === "true";
        const val = row[filter.field];
        // Treat null/undefined as false
        const actualValue = val === true || val === "t";
        if (actualValue !== boolValue) return false;
      }
    }

    for (const [field, value] of Object.entries(textFilterValues)) {
      if (value && row[field] !== value) return false;
    }
    
    return true;
  }, [descripcionFilter, booleanFilters, textFilterValues]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          valueType="nombre"
          showLabel={true}
          testId="admin-filtro-unidad"
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
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-indigo-500/5 to-indigo-600/10 border-indigo-500/20">
        <MyTab
          tabs={adminTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          icon={<Building2 className="h-4 w-4 text-indigo-500" />}
          title="Tipo"
          tableName="administracion"
          filterFn={filterData}
          newRecordDefaults={newRecordDefaults}
          onRecordSaved={onRecordSaved}
        />
      </div>

      <div className="h-32 mt-2 p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <div className="text-xs font-medium text-muted-foreground mb-1">Registros de Bancos relacionados</div>
        {bancosRelacionados.length > 0 ? (
          <MyGrid
            tableId="admin-bancos-relacionados"
            tableName="bancos"
            columns={bancosRelacionadosColumns}
            data={bancosRelacionados}
            selectedRowId={null}
            readOnly={true}
            compactHeader={true}
            showUtilityColumn={false}
          />
        ) : (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            {selectedRowId ? "No hay registros relacionados" : "Seleccione un registro de administración"}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdministracionProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

const getBooleanFiltersForTab = (tabId: string): BooleanFilter[] => {
  const fields = TAB_BOOLEAN_FILTER_FIELDS[tabId] || [];
  return fields.map(({ field, label }) => ({ field, label, value: "all" as const }));
};

export default function Administracion({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: AdministracionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("facturas");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("administracion", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(getBooleanFiltersForTab("facturas"));
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [bancoMonto, setBancoMonto] = useState<number | undefined>(undefined);
  const [bancoMontoDolares, setBancoMontoDolares] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handleSetBancoId = (event: CustomEvent<{ bancoId: string; monto?: number; montoDolares?: number }>) => {
      setBancoId(event.detail.bancoId);
      setBancoMonto(event.detail.monto);
      setBancoMontoDolares(event.detail.montoDolares);
    };

    window.addEventListener("setAdminBancoId", handleSetBancoId as EventListener);
    return () => {
      window.removeEventListener("setAdminBancoId", handleSetBancoId as EventListener);
    };
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setBooleanFilters(getBooleanFiltersForTab(tabId));
  };

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
      const response = await fetch(`/api/administracion/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const dataWithTipo: Record<string, any> = { ...data, tipo: activeTab };
      if (bancoId) {
        dataWithTipo.banco_id = bancoId;
        // Pre-fill monto and montodol from banco if not already set
        if (bancoMonto !== undefined && !data.monto) {
          dataWithTipo.monto = bancoMonto;
        }
        if (bancoMontoDolares !== undefined && !data.montodol) {
          dataWithTipo.montodol = bancoMontoDolares;
        }
      }
      const response = await apiRequest("POST", "/api/administracion", dataWithTipo);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
      toast({ title: "Guardado", description: "Registro creado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "No se pudo guardar el registro" });
    },
  });

  const handleSaveNew = useCallback((data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => {
    createMutation.mutate(data, {
      onSuccess: (savedRecord) => {
        if (onComplete) {
          onComplete(savedRecord);
        }
      }
    });
  }, [createMutation]);

  // Limpiar bancoId después de guardar un registro que tenga banco_id
  const handleRecordSaved = useCallback((record: Record<string, any>) => {
    if (record.banco_id) {
      console.log("[Administracion] Registro guardado con banco_id, limpiando estado");
      setBancoId(null);
      setBancoMonto(undefined);
      setBancoMontoDolares(undefined);
    }
  }, []);

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters(prev => 
      prev.map(f => f.field === field ? { ...f, value } : f)
    );
  };

  const handleTextFilterChange = (field: string, value: string) => {
    setTextFilterValues(prev => ({ ...prev, [field]: value }));
  };

  const currentTabConfig = adminTabs.find(t => t.id === activeTab);
  const currentTipo = currentTabConfig?.tipo || "facturas";

  const queryParams: Record<string, string> = {
    tipo: currentTipo,
    unidad: unidadFilter,
  };
  
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }

  return (
    <MyWindow
      id="administracion"
      title="Administración"
      icon={<Building2 className="h-4 w-4 text-indigo-500" />}
      initialPosition={{ x: 120, y: 80 }}
      initialSize={{ width: 1000, height: 650 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-indigo-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      onSaveNew={handleSaveNew}
      isStandalone={isStandalone}
      popoutUrl="/standalone/administracion"
    >
      <AdminContent 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unidadFilter={unidadFilter}
        onUnidadChange={setUnidadFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilterValues={textFilterValues}
        onTextFilterChange={handleTextFilterChange}
        newRecordDefaults={bancoId ? { monto: bancoMonto, montodol: bancoMontoDolares, banco_id: bancoId } : undefined}
        onRecordSaved={handleRecordSaved}
      />
    </MyWindow>
  );
}
