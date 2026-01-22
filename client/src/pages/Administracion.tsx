import { useState, useMemo } from "react";
import { Building2 } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import MyFilter, { type BooleanFilter, type TextFilter } from "@/components/MyFilter";
import MyFiltroDeUnidad from "@/components/MyFiltroDeUnidad";
import MyTab, { type TabConfig } from "@/components/MyTab";

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
      { key: "proveedor", label: "Proveedor", defaultWidth: 150 },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "comprobant", label: "Comprobante", defaultWidth: 100, type: "number" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    tipo: "nomina",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    tipo: "ventas",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150 },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "cuentasporcobrar",
    label: "Cuentas por Cobrar",
    tipo: "cuentasporcobrar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
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
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "utility", label: "Utilidad", defaultWidth: 80, type: "boolean" },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
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
  onTextFilterChange
}: AdminContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

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

  const textFilters = useMemo<TextFilter[]>(() => {
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    return fields.map(({ field, label }) => {
      const values = tableData
        .map(row => row[field])
        .filter((v): v is string => typeof v === "string" && v.trim() !== "");
      const uniqueValues = Array.from(new Set(values)).sort();
      return {
        field,
        label,
        value: textFilterValues[field] || "",
        options: uniqueValues,
      };
    });
  }, [activeTab, tableData, textFilterValues]);

  const filteredData = useMemo(() => {
    let result = tableData;
    
    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      result = result.filter(row => 
        row.descripcion?.toLowerCase().includes(search)
      );
    }
    
    booleanFilters.forEach(filter => {
      if (filter.value !== "all") {
        const boolValue = filter.value === "true";
        result = result.filter(row => {
          const val = row[filter.field];
          if (typeof val === "boolean") return val === boolValue;
          if (typeof val === "string") return (val === "t") === boolValue;
          return true;
        });
      }
    });

    Object.entries(textFilterValues).forEach(([field, value]) => {
      if (value) {
        result = result.filter(row => row[field] === value);
      }
    });
    
    return result;
  }, [tableData, descripcionFilter, booleanFilters, textFilterValues]);

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
          data={filteredData}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          icon={<Building2 className="h-4 w-4 text-indigo-500" />}
          title="Tipo"
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

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "evidenciado", label: "Evidenciado", value: "all" },
  { field: "capital", label: "Capital", value: "all" },
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "anticipo", label: "Anticipo", value: "all" },
  { field: "relacionado", label: "Relacionado", value: "all" },
];

export default function Administracion({ onBack, onFocus, zIndex }: AdministracionProps) {
  const [activeTab, setActiveTab] = useState("facturas");
  const [unidadFilter, setUnidadFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});

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
    >
      <AdminContent 
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
