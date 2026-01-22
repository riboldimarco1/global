import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, X } from "lucide-react";

interface MyFilterProps {
  children: React.ReactNode;
  onClearFilters: () => void;
  className?: string;
}

export default function MyFilter({
  children,
  onClearFilters,
  className = "",
}: MyFilterProps) {
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
          <div className="h-6 w-px bg-blue-500/30" />
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {children}
          </div>
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
