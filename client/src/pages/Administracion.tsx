import { useState, useMemo, useCallback, useEffect } from "react";
import { Building2, BarChart3, ChevronDown, ChevronRight, X, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyTab, MyGrid, type BooleanFilter, type TextFilter, type TabConfig, type Column, type ReportFilters } from "@/components/My";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTableData } from "@/contexts/TableDataContext";

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
    color: "red",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
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
    color: "orange",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
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
    color: "yellow",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
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
    color: "green",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    color: "cyan",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "relacionado", label: "Rel", defaultWidth: 50, type: "boolean", editable: false },
      { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
    ],
  },
  {
    id: "prestamos",
    label: "Préstamos",
    tipo: "prestamos",
    color: "blue",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodolares", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
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

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e", "#a855f7", "#6366f1"];

function AdminGraficas({ unidadFilter, dateFilter }: { unidadFilter: string; dateFilter: DateRange }) {
  const queryParams = new URLSearchParams();
  if (unidadFilter && unidadFilter !== "all") queryParams.set("unidad", unidadFilter);
  if (dateFilter.start) queryParams.set("fechaInicio", dateFilter.start);
  if (dateFilter.end) queryParams.set("fechaFin", dateFilter.end);
  
  const { data, isLoading } = useQuery<{
    lineData: { mes: string; facturas: number; nomina: number; ventas: number; resultado: number }[];
    insumoData: { name: string; value: number }[];
    actividadData: { name: string; value: number }[];
  }>({
    queryKey: ["/api/administracion/graficas", unidadFilter, dateFilter.start, dateFilter.end],
    queryFn: async () => {
      const res = await fetch(`/api/administracion/graficas?${queryParams.toString()}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando gráficas...
      </div>
    );
  }

  const rawLineData = data?.lineData || [];
  const insumoData = data?.insumoData || [];
  const actividadData = data?.actividadData || [];

  const MAX_POINTS = 10;
  const lineData = useMemo(() => {
    if (rawLineData.length <= MAX_POINTS) return rawLineData;
    const groupSize = Math.ceil(rawLineData.length / MAX_POINTS);
    const consolidated: typeof rawLineData = [];
    for (let i = 0; i < rawLineData.length; i += groupSize) {
      const chunk = rawLineData.slice(i, i + groupSize);
      const label = chunk.length === 1 ? chunk[0].mes : `${chunk[0].mes}-${chunk[chunk.length - 1].mes}`;
      const facturas = chunk.reduce((s, c) => s + c.facturas, 0);
      const nomina = chunk.reduce((s, c) => s + c.nomina, 0);
      const ventas = chunk.reduce((s, c) => s + c.ventas, 0);
      consolidated.push({
        mes: label,
        facturas: Math.round(facturas * 100) / 100,
        nomina: Math.round(nomina * 100) / 100,
        ventas: Math.round(ventas * 100) / 100,
        resultado: Math.round((ventas - facturas - nomina) * 100) / 100,
      });
    }
    return consolidated;
  }, [rawLineData]);

  const [openCharts, setOpenCharts] = useState<Record<string, boolean>>({ linea: true, insumo: true, actividad: true });
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({ linea: true, insumo: true, actividad: true });

  const toggleExpand = (key: string) => setExpandedCharts(prev => ({ ...prev, [key]: !prev[key] }));
  const closeChart = (key: string) => setOpenCharts(prev => ({ ...prev, [key]: false }));

  const ChartPanel = ({ id, title, gradient, borderColor, children }: { id: string; title: string; gradient: string; borderColor: string; children: React.ReactNode }) => {
    if (!openCharts[id]) return null;
    return (
      <div className={`border rounded-md ${gradient} ${borderColor}`}>
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none"
          onClick={() => toggleExpand(id)}
          data-testid={`button-toggle-chart-${id}`}
        >
          <div className="flex items-center gap-1.5">
            {expandedCharts[id] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <MyButtonStyle
            color="red"
            onClick={(e) => { e.stopPropagation(); closeChart(id); }}
            data-testid={`button-close-chart-${id}`}
          >
            <X className="h-3 w-3" />
          </MyButtonStyle>
        </div>
        {expandedCharts[id] && <div className="px-3 pb-3">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto p-2">
      <ChartPanel id="linea" title="Facturas, Nómina, Ventas y Resultado por Mes ($)" gradient="bg-gradient-to-br from-blue-500/5 to-indigo-500/10" borderColor="border-blue-500/20">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="facturas" stroke="#ef4444" name="Facturas" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="nomina" stroke="#f97316" name="Nómina" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ventas" stroke="#22c55e" name="Ventas" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resultado" stroke="#3b82f6" name="Resultado" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartPanel>

      <ChartPanel id="insumo" title="Distribución por Insumo ($)" gradient="bg-gradient-to-br from-purple-500/5 to-violet-500/10" borderColor="border-purple-500/20">
        <div className="h-56">
          {insumoData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={insumoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={10}>
                  {insumoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin datos de insumos</div>
          )}
        </div>
      </ChartPanel>

      <ChartPanel id="actividad" title="Distribución por Actividad ($)" gradient="bg-gradient-to-br from-teal-500/5 to-cyan-500/10" borderColor="border-teal-500/20">
        <div className="h-56">
          {actividadData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={actividadData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={10}>
                  {actividadData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Sin datos de actividades</div>
          )}
        </div>
      </ChartPanel>
    </div>
  );
}

interface AdminContentProps {
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
  onGraficas?: () => void;
}

function AdminContent({ 
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
  onGraficas,
}: AdminContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const currentTab = adminTabs.find(t => t.id === activeTab);
  
  // Obtener datos del contexto
  const { tableData } = useTableData();

  // Obtener el codrel del registro seleccionado
  const selectedRow = useMemo(() => 
    tableData.find(row => row.id === selectedRowId), 
    [tableData, selectedRowId]
  );
  const selectedCodrel = selectedRow?.codrel;
  const isRelacionado = selectedRow?.relacionado === true || selectedRow?.relacionado === "t";

  // Buscar el banco cuyo ID coincide con el codrel del registro de administración
  const { data: bancosResponse } = useQuery<{ data: Record<string, any>[] }>({
    queryKey: [`/api/bancos?id=${selectedCodrel}`],
    enabled: selectedCodrel != null && selectedCodrel !== "" && isRelacionado,
    staleTime: 0,
  });
  const bancosRelacionados = (selectedCodrel && isRelacionado) ? (bancosResponse?.data || []) : [];

  const handleClearFilters = () => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach(f => onBooleanFilterChange(f.field, "all"));
    const fields = TAB_TEXT_FILTER_FIELDS[activeTab] || [];
    fields.forEach(f => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
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

  // Filtrado local solo para fecha cliente (click en celdas)
  // Los demás filtros (descripcion, textFilters, booleanFilters) ahora se envían al servidor
  const filterData = useCallback((row: Record<string, any>): boolean => {
    if (clientDateFilter.start || clientDateFilter.end) {
      const rowDate = row.fecha;
      if (!rowDate) return false;
      if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
      if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
    }
    return true;
  }, [clientDateFilter]);

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
          clientDateFilter={clientDateFilter}
          sourceModule="administracion"
          activeTab={activeTab}
          onOpenReport={handleOpenReport}
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
          disableCrud={unidadFilter === "all"}
          filtroDeUnidad={unidadFilter}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "administracion",
            activeTab,
            dateRange: dateFilter,
            unidad: unidadFilter,
            textFilters: textFilterValues,
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
          onGraficas={onGraficas}
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
  const { showPop } = useMyPop();
  const [activeTab, setActiveTab] = useState("facturas");
  const [showGraficas, setShowGraficas] = useState(false);
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("administracion", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(getBooleanFiltersForTab("facturas"));
  const [textFilterValues, setTextFilterValues] = useState<Record<string, string>>({});
  const [bancoId, setBancoId] = useState<string | null>(null);
  const [bancoMonto, setBancoMonto] = useState<number | undefined>(undefined);
  const [bancoMontoDolares, setBancoMontoDolares] = useState<number | undefined>(undefined);
  const [bancoDescripcionPropuesta, setBancoDescripcionPropuesta] = useState<string | undefined>(undefined);
  const [bancoOperacion, setBancoOperacion] = useState<string | undefined>(undefined);
  const [bancoComprobante, setBancoComprobante] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleSetBancoId = (event: CustomEvent<{ bancoId: string; monto?: number; montoDolares?: number; nombreBanco?: string; descripcion?: string; operacion?: string; comprobante?: string }>) => {
      setBancoId(event.detail.bancoId);
      setBancoMonto(event.detail.monto);
      setBancoMontoDolares(event.detail.montoDolares);
      setBancoOperacion(event.detail.operacion);
      setBancoComprobante(event.detail.comprobante);
      // Compose description: "NombreBanco - DescripcionMovimiento"
      const nombreBanco = event.detail.nombreBanco || "";
      const descripcion = event.detail.descripcion || "";
      if (nombreBanco || descripcion) {
        setBancoDescripcionPropuesta(nombreBanco && descripcion ? `${nombreBanco} - ${descripcion}` : nombreBanco || descripcion);
      } else {
        setBancoDescripcionPropuesta(undefined);
      }
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
        showPop({ title: "Error", message: "No se pudo eliminar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const dataWithTipo: Record<string, any> = { ...data, tipo: activeTab };
      if (bancoId) {
        dataWithTipo.codrel = bancoId;
        // Pre-fill monto and montodolares from banco if not already set
        if (bancoMonto !== undefined && !data.monto) {
          dataWithTipo.monto = bancoMonto;
        }
        if (bancoMontoDolares !== undefined && !data.montodolares) {
          dataWithTipo.montodolares = bancoMontoDolares;
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

  // Limpiar bancoId después de guardar un registro que tenga codrel
  const handleRecordSaved = useCallback((record: Record<string, any>) => {
    if (record.codrel) {
      console.log("[Administracion] Registro guardado con codrel, limpiando estado");
      setBancoId(null);
      setBancoMonto(undefined);
      setBancoMontoDolares(undefined);
      setBancoDescripcionPropuesta(undefined);
      setBancoOperacion(undefined);
      setBancoComprobante(undefined);
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
  
  // Agregar filtro de descripción al servidor
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  
  // Agregar textFilters al servidor
  for (const [field, value] of Object.entries(textFilterValues)) {
    if (value && value.trim()) {
      queryParams[field] = value.trim();
    }
  }
  
  // Agregar booleanFilters al servidor
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <>
      <MyWindow
        id="administracion"
        title="Administración"
        icon={<Building2 className="h-4 w-4 text-indigo-500" />}
        tutorialId="administracion"
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
          newRecordDefaults={bancoId ? { monto: bancoMonto, montodolares: bancoMontoDolares, codrel: bancoId, descripcion: bancoDescripcionPropuesta, operacion: bancoOperacion, comprobante: bancoComprobante, _disabledFields: ["operacion", "comprobante"] } : undefined}
          onRecordSaved={handleRecordSaved}
          onGraficas={() => setShowGraficas(prev => !prev)}
        />
      </MyWindow>

      {showGraficas && (
        <MyWindow
          id="admin-graficas"
          title="Gráficas - Administración"
          icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
          initialPosition={{ x: 200, y: 120 }}
          initialSize={{ width: 800, height: 550 }}
          minSize={{ width: 500, height: 350 }}
          maxSize={{ width: 1200, height: 800 }}
          onClose={() => setShowGraficas(false)}
          onFocus={onFocus}
          zIndex={(zIndex || 10) + 1}
          borderColor="border-emerald-500/40"
          canClose={true}
          canMinimize={true}
        >
          <div className="p-3 overflow-y-auto h-full">
            <AdminGraficas unidadFilter={unidadFilter} dateFilter={dateFilter} />
          </div>
        </MyWindow>
      )}
    </>
  );
}
