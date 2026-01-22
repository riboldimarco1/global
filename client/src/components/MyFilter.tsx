import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";

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
        <div className={`flex items-center gap-3 p-2 bg-muted/30 border-b ${className}`}>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {children}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-xs gap-1 shrink-0"
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
