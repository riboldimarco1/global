import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search, Check } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { MyDateMatrixPicker } from "./MyDateMatrixPicker";
import { useTableData } from "@/contexts/TableDataContext";

export interface ReportFilters {
  sourceModule: string;
  activeTab?: string;
  dateRange: { start: string; end: string };
  unidad?: string;
  banco?: string;
  textFilters: Record<string, string>;
  descripcion?: string;
  booleanFilters?: Record<string, string>;
}

const FIELD_TO_TIPO_MAP: Record<string, string> = {
  actividad: "actividades",
  proveedor: "proveedores",
  insumo: "insumos",
  personal: "personal",
  producto: "productos",
  cliente: "clientes",
  chofer: "chofer",
  destino: "destino",
  operacion: "formadepago",
  categoria: "categorias",
  cultivo: "cultivo",
  ciclo: "ciclo",
  banco: "bancos",
  equipo: "equiposred",
  plan: "planes",
};

interface Parametro {
  id: number;
  tipo: string;
  nombre: string;
  habilitado: string | boolean;
  unidad?: string;
}

interface TextFilterSelectProps {
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unidadFilter?: string;
  externalOptions?: string[];
}

function TextFilterSelect({ field, label, value, onChange, unidadFilter, externalOptions }: TextFilterSelectProps) {
  const hasExternal = Array.isArray(externalOptions);
  const tipo = FIELD_TO_TIPO_MAP[field] || field;
  
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: [`/api/parametros?tipo=${tipo}&habilitado=si`],
    enabled: !hasExternal,
  });

  const parametroOptions = parametros
    .filter(p => {
      if (!p.nombre) return false;
      if (unidadFilter && unidadFilter !== "all") {
        if (!p.unidad || p.unidad === "" || p.unidad !== unidadFilter) return false;
      }
      return true;
    })
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

  const sortedExternalOptions = hasExternal
    ? externalOptions.filter((v): v is string => v != null && typeof v === "string" && v !== "").sort((a, b) => a.localeCompare(b))
    : [];

  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? "" : val)}
      onOpenChange={(open) => open && !hasExternal && refetch()}
    >
      <SelectTrigger 
        className={`h-7 w-[120px] text-xs gap-1 ${
          value 
            ? "bg-teal-500/20 border-teal-500/40 text-teal-800 dark:text-teal-300 font-bold" 
            : ""
        }`}
        data-testid={`select-${field}-filter`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: Todos</SelectItem>
        {hasExternal
          ? sortedExternalOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))
          : parametroOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.nombre}>{opt.nombre}</SelectItem>
            ))
        }
      </SelectContent>
    </Select>
  );
}

interface DateRange {
  start: string;
  end: string;
}

export interface BooleanFilter {
  field: string;
  label: string;
  value: "all" | "true" | "false";
}

export interface TextFilter {
  field: string;
  label: string;
  value: string;
  options?: string[];
}

interface MyFilterProps {
  children?: React.ReactNode;
  onClearFilters: () => void;
  onDateChange?: (range: DateRange) => void;
  dateFilter?: DateRange;
  showDateFilter?: boolean;
  showDescripcionFilter?: boolean;
  descripcion?: string;
  onDescripcionChange?: (value: string) => void;
  booleanFilters?: BooleanFilter[];
  onBooleanFilterChange?: (field: string, value: "all" | "true" | "false") => void;
  textFilters?: TextFilter[];
  onTextFilterChange?: (field: string, value: string) => void;
  unidadFilter?: string;
  className?: string;
  selectedRecordDate?: string;
  clientDateFilter?: DateRange;
  sourceModule?: string;
  activeTab?: string;
  bancoFilter?: string;
  onOpenReport?: (filters: ReportFilters) => void;
}

const FILTER_WIDTH = "w-[140px]";

export default function MyFilter({
  children,
  onClearFilters,
  onDateChange,
  dateFilter,
  showDateFilter = true,
  showDescripcionFilter = true,
  descripcion = "",
  onDescripcionChange,
  booleanFilters = [],
  onBooleanFilterChange,
  textFilters = [],
  onTextFilterChange,
  unidadFilter,
  className = "",
  selectedRecordDate,
  clientDateFilter,
  sourceModule,
  activeTab,
  bancoFilter,
  onOpenReport,
}: MyFilterProps) {
  const { cellFilters, clearCellFilters } = useTableData();
  const [activeDateRange, setActiveDateRange] = useState<DateRange | null>(dateFilter || null);

  useEffect(() => {
    if (dateFilter) {
      setActiveDateRange(dateFilter);
    }
  }, [dateFilter]);

  const hasActiveFilters = useMemo(() => {
    const hasServerDateFilter = showDateFilter && !!(dateFilter?.start || dateFilter?.end);
    const hasClientDateFilter = showDateFilter && !!(clientDateFilter?.start || clientDateFilter?.end);
    const hasDescripcionFilter = showDescripcionFilter && !!descripcion;
    const hasBooleanFilter = booleanFilters.some(f => f.value !== "all");
    const hasTextFilter = textFilters.some(f => !!f.value);
    return hasServerDateFilter || hasClientDateFilter || hasDescripcionFilter || hasBooleanFilter || hasTextFilter;
  }, [dateFilter, clientDateFilter, descripcion, booleanFilters, textFilters, showDateFilter, showDescripcionFilter]);

  const handleDateChange = (range: DateRange) => {
    setActiveDateRange(range);
  };
  
  const handleApplyDateFilter = () => {
    if (activeDateRange) {
      onDateChange?.(activeDateRange);
    }
  };

  const hasActiveDate = activeDateRange && (activeDateRange.start || activeDateRange.end);

  const handleOpenReport = () => {
    if (!onOpenReport || !sourceModule) return;
    const textFiltersMap: Record<string, string> = {};
    for (const tf of textFilters) {
      if (tf.value) {
        textFiltersMap[tf.field] = tf.value;
      }
    }
    const booleanFiltersMap: Record<string, string> = {};
    for (const bf of booleanFilters) {
      if (bf.value !== "all") {
        booleanFiltersMap[bf.field] = bf.value;
      }
    }
    onOpenReport({
      sourceModule,
      activeTab,
      dateRange: dateFilter || { start: "", end: "" },
      unidad: unidadFilter,
      banco: bancoFilter,
      textFilters: textFiltersMap,
      descripcion: descripcion || undefined,
      booleanFilters: Object.keys(booleanFiltersMap).length > 0 ? booleanFiltersMap : undefined,
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-1.5 p-1.5 flex-wrap bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg shadow-sm ${className}`}
          data-testid="container-my-filter"
        >
          <div className="flex items-center gap-1 text-blue-800 dark:text-blue-300 font-bold shrink-0">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Filtros</span>
          </div>
          
          {showDateFilter && (
            <div className="flex items-center gap-0.5">
              <MyDateMatrixPicker
                value={activeDateRange || { start: "", end: "" }}
                onChange={handleDateChange}
                className={hasActiveDate ? "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30" : "border-rose-500/30"}
              />
              <MyButtonStyle
                color={hasActiveDate ? "green" : "gray"}
                onClick={handleApplyDateFilter}
                disabled={!hasActiveDate}
                size="sm"
                className="text-xs font-semibold"
                data-testid="button-apply-date-filter"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Aplicar
              </MyButtonStyle>
            </div>
          )}

          {showDescripcionFilter && onDescripcionChange && (
            <div className="relative w-[100px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={descripcion}
                onChange={(e) => onDescripcionChange(e.target.value)}
                className="h-7 pl-6 text-xs"
                data-testid="input-descripcion-filter"
              />
            </div>
          )}

          {booleanFilters.map((filter) => (
            <div key={filter.field} className="flex items-center gap-0.5" data-testid={`toggle-${filter.field}-filter`}>
              <span className="text-[10px] text-muted-foreground mr-0.5">{filter.label}:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onBooleanFilterChange?.(filter.field, filter.value === "true" ? "all" : "true")}
                className={`h-7 px-1.5 text-[10px] ${
                  filter.value === "true"
                    ? "!bg-green-600 !border-green-700 !text-white hover:!bg-green-700"
                    : ""
                }`}
                data-testid={`button-${filter.field}-si`}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onBooleanFilterChange?.(filter.field, filter.value === "false" ? "all" : "false")}
                className={`h-7 px-1.5 text-[10px] ${
                  filter.value === "false"
                    ? "!bg-red-600 !border-red-700 !text-white hover:!bg-red-700"
                    : ""
                }`}
                data-testid={`button-${filter.field}-no`}
              >
                No
              </Button>
            </div>
          ))}

          {textFilters.map((filter) => (
            <TextFilterSelect
              key={filter.field}
              field={filter.field}
              label={filter.label}
              value={filter.value}
              onChange={(val) => onTextFilterChange?.(filter.field, val)}
              unidadFilter={unidadFilter}
              externalOptions={filter.options}
            />
          ))}

          {children}

          {cellFilters.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300"
                  onClick={clearCellFilters}
                  data-testid="button-clear-cell-filters"
                >
                  <X className="h-3 w-3" />
                  Celdas ({cellFilters.length})
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Filtros de celda activos:</span>
                  {cellFilters.map((f, i) => (
                    <span key={i}>{f.column}: {f.value}</span>
                  ))}
                  <span className="text-muted-foreground mt-1">Click para eliminar</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="text-xs gap-1 shrink-0 border-blue-500/30"
              data-testid="button-clear-filters"
            >
              <X className="h-3 w-3" />
              Quitar filtros
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
        MyFilter
      </TooltipContent>
    </Tooltip>
  );
}
