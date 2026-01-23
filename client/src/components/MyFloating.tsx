import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { Column } from "./MyGrid";

interface CalculationResult {
  field: string;
  label: string;
  sum: number;
}

interface MyFloatingProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  totalRecords: number;
  calculations: CalculationResult[];
}

export default function MyFloating({
  isOpen,
  onClose,
  title = "Resultados del Cálculo",
  totalRecords,
  calculations,
}: MyFloatingProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
      onClick={onClose}
      data-testid="floating-overlay"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="bg-background border-2 border-cyan-500/50 rounded-lg shadow-2xl min-w-[300px] max-w-[500px]"
            onClick={(e) => e.stopPropagation()}
            data-testid="floating-window"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border-b border-cyan-500/30 rounded-t-lg">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="floating-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">Total de registros:</span>
                <span className="text-sm font-bold text-cyan-600">{totalRecords.toLocaleString("es-VE")}</span>
              </div>
              {calculations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Sumas de campos numéricos:</span>
                  {calculations.map((calc) => (
                    <div 
                      key={calc.field}
                      className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md"
                    >
                      <span className="text-sm">{calc.label}:</span>
                      <span className="text-sm font-semibold text-teal-600">
                        {calc.sum.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {calculations.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No hay campos numéricos para sumar
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
          MyFloating
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function calculateNumericSums(
  data: Record<string, any>[],
  columns: Column[]
): CalculationResult[] {
  const numericColumns = columns.filter(col => col.type === "number" && col.key !== "id");
  
  return numericColumns.map(col => {
    const sum = data.reduce((acc, row) => {
      const value = Number(row[col.key]);
      return acc + (isNaN(value) ? 0 : value);
    }, 0);
    
    return {
      field: col.key,
      label: col.label,
      sum,
    };
  });
}
