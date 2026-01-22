import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Calendar, Search } from "lucide-react";
import MyFiltroDeFecha from "./MyFiltroDeFecha";

interface DateRange {
  start: string;
  end: string;
}

export interface BooleanFilter {
  field: string;
  label: string;
  value: "all" | "true" | "false";
}

interface MyFilterProps {
  children?: React.ReactNode;
  onClearFilters: () => void;
  onDateChange?: (range: DateRange) => void;
  showDateFilter?: boolean;
  descripcion?: string;
  onDescripcionChange?: (value: string) => void;
  booleanFilters?: BooleanFilter[];
  onBooleanFilterChange?: (field: string, value: "all" | "true" | "false") => void;
  className?: string;
}

export default function MyFilter({
  children,
  onClearFilters,
  onDateChange,
  showDateFilter = true,
  descripcion = "",
  onDescripcionChange,
  booleanFilters = [],
  onBooleanFilterChange,
  className = "",
}: MyFilterProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [activeDateRange, setActiveDateRange] = useState<DateRange | null>(null);

  const handleDateChange = (range: DateRange) => {
    setActiveDateRange(range);
    onDateChange?.(range);
  };

  const hasActiveDate = activeDateRange && (activeDateRange.start || activeDateRange.end);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg shadow-sm ${className}`}
          data-testid="container-my-filter"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 shrink-0">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Filtros</span>
          </div>
          
          {showDateFilter && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-xs gap-1.5 border-rose-500/30 hover:bg-rose-500/10 ${
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
            </>
          )}

          {onDescripcionChange && (
            <>
              <div className="h-6 w-px bg-blue-500/30" />
              <div className="relative flex-1 min-w-[150px] max-w-[250px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar descripción..."
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
                      className={`h-8 w-auto min-w-[90px] text-xs gap-1 ${
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
