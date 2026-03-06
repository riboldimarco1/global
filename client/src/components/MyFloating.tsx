import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, GripHorizontal } from "lucide-react";
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
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setPosition({
        x: Math.max(50, (window.innerWidth - rect.width) / 2),
        y: Math.max(50, (window.innerHeight - rect.height) / 3),
      });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          ref={windowRef}
          className="fixed z-[9999] bg-background border-2 border-cyan-500/50 rounded-lg shadow-2xl min-w-[300px] max-w-[500px]"
          style={{ 
            left: position.x, 
            top: position.y,
            cursor: isDragging ? "grabbing" : "default",
          }}
          data-testid="floating-window"
        >
          <div 
            className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border-b border-cyan-500/30 rounded-t-lg cursor-grab"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
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
              <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300">{totalRecords.toLocaleString("es-VE")}</span>
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
                    <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
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
