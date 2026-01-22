import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, Calendar } from "lucide-react";
import MyFiltroDeFecha from "./MyFiltroDeFecha";

interface DateRange {
  start: string;
  end: string;
}

interface MyFilterProps {
  children?: React.ReactNode;
  onClearFilters: () => void;
  onDateChange?: (range: DateRange) => void;
  showDateFilter?: boolean;
  className?: string;
}

export default function MyFilter({
  children,
  onClearFilters,
  onDateChange,
  showDateFilter = true,
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
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
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
