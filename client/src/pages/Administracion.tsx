import { useState, useMemo, useCallback } from "react";
import { Building2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyTab, type BooleanFilter, type TextFilter, type TabConfig } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  ],
  nomina: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
  ],
  ventas: [
    { field: "utility", label: "Utilidad" },
    { field: "anticipo", label: "Anticipo" },
  ],
  cuentasporpagar: [
    { field: "utility", label: "Utilidad" },
  ],
  cuentasporcobrar: [
    { field: "utility", label: "Utilidad" },
  ],
  prestamos: [
    { field: "utility", label: "Utilidad" },
  ],
};

const adminTabs: TabConfig[] = [
  {
    id: "facturas",
    label: "Facturas",
    tipo: "facturas",
    columns: [
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
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    tipo: "nomina",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    tipo: "ventas",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "anticipo", label: "Anticipo", defaultWidth: 80, type: "boolean" },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
    ],
  },
  {
    id: "cuentasporcobrar",
    label: "Cuentas por Cobrar",
    tipo: "cuentasporcobrar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
    ],
  },
  {
    id: "prestamos",
    label: "Préstamos",
    tipo: "prestamos",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "utility", label: "Utilidad", defaultWidth: 80, type: "boolean" },
      { key: "operacion", label: "Operación", defaultWidth: 100 },
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
  onDelete?: RowHandler;
  onAgregar?: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
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
  onDelete,
  onAgregar,
  hasMore,
  onLoadMore,
  onSaveNew,
  onRefresh,
}: AdminContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const currentTab = adminTabs.find(t => t.id === activeTab);

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
  };

  const { data: parametros = [] } = useQuery<{ id: number; tipo: string; nombre: string; abilitado: string | boolean; unidad?: string }[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const FIELD_TO_TIPO_MAP: Record<string, string> = {
    actividad: "actividades",
    proveedor: "proveedores",
    insumo: "insumos",
    personal: "personal",
    producto: "productos",
    cliente: "clientes",
  };

  const getParametrosOptions = useCallback((field: string): string[] => {
    const tipo = FIELD_TO_TIPO_MAP[field] || field;
    return parametros
      .filter((p) => {
        if (p.tipo !== tipo) return false;
        if (!(p.abilitado === true || p.abilitado === "t")) return false;
        if (unidadFilter && unidadFilter !== "all" && p.unidad && p.unidad !== unidadFilter) return false;
        return true;
      })
      .map((p) => p.nombre);
  }, [parametros, unidadFilter]);

  const textFilters = useMemo<TextFilter[]>(() => {
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    return fields.map(({ field, label }) => {
      return {
        field,
        label,
        value: textFilterValues[field] || "",
        options: getParametrosOptions(field),
      };
    });
  }, [activeTab, textFilterValues, getParametrosOptions]);

  const filterData = useCallback((row: Record<string, any>): boolean => {
    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      if (!row.descripcion?.toLowerCase().includes(search)) return false;
    }
    
    for (const filter of booleanFilters) {
      if (filter.value !== "all") {
        const boolValue = filter.value === "true";
        const val = row[filter.field];
        if (typeof val === "boolean" && val !== boolValue) return false;
        if (typeof val === "string" && (val === "t") !== boolValue) return false;
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

      <div className="flex-1 overflow-hidden mt-2">
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
        />
      </div>
    </div>
  );
}

interface AdministracionProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

const getBooleanFiltersForTab = (tabId: string): BooleanFilter[] => {
  const fields = TAB_BOOLEAN_FILTER_FIELDS[tabId] || [];
  return fields.map(({ field, label }) => ({ field, label, value: "all" as const }));
};

export default function Administracion({ onBack, onFocus, zIndex }: AdministracionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("facturas");
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("administracion", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(getBooleanFiltersForTab("facturas"));
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});

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

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const dataWithTipo = { ...data, tipo: activeTab };
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
      borderColor="border-indigo-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      onSaveNew={handleSaveNew}
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
      />
    </MyWindow>
  );
}
