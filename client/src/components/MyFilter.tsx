import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Calendar, Search, ArrowUp, ArrowDown } from "lucide-react";
import MyFiltroDeFecha from "./MyFiltroDeFecha";

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
}

function TextFilterSelect({ field, label, value, onChange, unidadFilter }: TextFilterSelectProps) {
  const tipo = FIELD_TO_TIPO_MAP[field] || field;
  
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: [`/api/parametros?tipo=${tipo}&habilitado=si`],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const options = parametros
    .filter(p => {
      if (unidadFilter && unidadFilter !== "all" && p.unidad && p.unidad !== unidadFilter) return false;
      return true;
    })
    .map(p => p.nombre)
    .sort();

  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? "" : val)}
      onOpenChange={(open) => open && refetch()}
    >
      <SelectTrigger 
        className={`h-8 w-[140px] text-xs gap-1 ${
          value 
            ? "bg-teal-500/20 border-teal-500/40 text-teal-700 dark:text-teal-300" 
            : ""
        }`}
        data-testid={`select-${field}-filter`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: Todos</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
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
  descripcion?: string;
  onDescripcionChange?: (value: string) => void;
  booleanFilters?: BooleanFilter[];
  onBooleanFilterChange?: (field: string, value: "all" | "true" | "false") => void;
  textFilters?: TextFilter[];
  onTextFilterChange?: (field: string, value: string) => void;
  unidadFilter?: string;
  className?: string;
  selectedRecordDate?: string;
}

const FILTER_WIDTH = "w-[140px]";

export default function MyFilter({
  children,
  onClearFilters,
  onDateChange,
  dateFilter,
  showDateFilter = true,
  descripcion = "",
  onDescripcionChange,
  booleanFilters = [],
  onBooleanFilterChange,
  textFilters = [],
  onTextFilterChange,
  unidadFilter,
  className = "",
  selectedRecordDate,
}: MyFilterProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [activeDateRange, setActiveDateRange] = useState<DateRange | null>(dateFilter || null);

  useEffect(() => {
    if (dateFilter) {
      setActiveDateRange(dateFilter);
    }
  }, [dateFilter]);

  const handleDateChange = (range: DateRange) => {
    setActiveDateRange(range);
    onDateChange?.(range);
  };

  const handleSetEndDate = () => {
    if (selectedRecordDate) {
      const currentStart = activeDateRange?.start || dateFilter?.start || "";
      const newRange = { start: currentStart, end: selectedRecordDate };
      setActiveDateRange(newRange);
      onDateChange?.(newRange);
    }
  };

  const handleSetStartDate = () => {
    if (selectedRecordDate) {
      const currentEnd = activeDateRange?.end || dateFilter?.end || "";
      const newRange = { start: selectedRecordDate, end: currentEnd };
      setActiveDateRange(newRange);
      onDateChange?.(newRange);
    }
  };

  const hasActiveDate = activeDateRange && (activeDateRange.start || activeDateRange.end);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-2 p-1.5 bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg shadow-sm ${className}`}
          data-testid="container-my-filter"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 shrink-0">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Filtros</span>
          </div>
          
          {showDateFilter && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="flex items-center gap-1">
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 ${FILTER_WIDTH} text-xs gap-1.5 border-rose-500/30 ${
                        hasActiveDate ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : ""
                      }`}
                      data-testid="button-fecha-filter"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Fecha
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 border-0 bg-transparent shadow-none" 
                    align="start"
                    sideOffset={5}
                  >
                    <MyFiltroDeFecha
                      onChange={handleDateChange}
                      onClose={() => setDatePopoverOpen(false)}
                      testId="popup-filtro-fecha"
                    />
                  </PopoverContent>
                </Popover>
                <div className="flex gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleSetStartDate}
                        disabled={!selectedRecordDate}
                        className="h-6 w-5 flex items-center justify-center rounded border border-rose-500/30 bg-background text-xs disabled:opacity-50 disabled:cursor-not-allowed hover-elevate"
                        data-testid="button-set-start-date"
                      >
                        <ArrowDown className="h-2.5 w-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Desde esta fecha
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleSetEndDate}
                        disabled={!selectedRecordDate}
                        className="h-6 w-5 flex items-center justify-center rounded border border-rose-500/30 bg-background text-xs disabled:opacity-50 disabled:cursor-not-allowed hover-elevate"
                        data-testid="button-set-end-date"
                      >
                        <ArrowUp className="h-2.5 w-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Hasta esta fecha
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          )}

          {onDescripcionChange && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="relative w-[140px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={descripcion}
                  onChange={(e) => onDescripcionChange(e.target.value)}
                  className="h-8 pl-7 text-xs"
                  data-testid="input-descripcion-filter"
                />
              </div>
            </>
          )}

          {booleanFilters.length > 0 && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="flex items-center gap-2 flex-wrap">
                {booleanFilters.map((filter) => (
                  <Select
                    key={filter.field}
                    value={filter.value}
                    onValueChange={(val) => onBooleanFilterChange?.(filter.field, val as "all" | "true" | "false")}
                  >
                    <SelectTrigger 
                      className={`h-8 ${FILTER_WIDTH} text-xs gap-1 ${
                        filter.value !== "all" 
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300" 
                          : ""
                      }`}
                      data-testid={`select-${filter.field}-filter`}
                    >
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{filter.label}: Todos</SelectItem>
                      <SelectItem value="true">{filter.label}: Sí</SelectItem>
                      <SelectItem value="false">{filter.label}: No</SelectItem>
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </>
          )}

          {textFilters.length > 0 && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="flex items-center gap-2 flex-wrap">
                {textFilters.map((filter) => (
                  <TextFilterSelect
                    key={filter.field}
                    field={filter.field}
                    label={filter.label}
                    value={filter.value}
                    onChange={(val) => onTextFilterChange?.(filter.field, val)}
                    unidadFilter={unidadFilter}
                  />
                ))}
              </div>
            </>
          )}

          {children && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {children}
              </div>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs gap-1 shrink-0 border-blue-500/30 hover:bg-blue-500/10"
            data-testid="button-clear-filters"
          >
            <X className="h-3 w-3" />
            Quitar filtros
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
        MyFilter
      </TooltipContent>
    </Tooltip>
  );
}
