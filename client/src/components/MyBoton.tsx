import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet, X } from "lucide-react";

interface MyBotonProps {
  onAgregar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onCerrar?: () => void;
  showAgregar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showCerrar?: boolean;
}

export default function MyBoton({
  onAgregar,
  onCalcular,
  onExcel,
  onCerrar,
  showAgregar = true,
  showCalcular = true,
  showExcel = true,
  showCerrar = true,
}: MyBotonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-br from-slate-500/10 to-slate-600/20 border border-slate-500/30">
          {showAgregar && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-green-600"
              onClick={onAgregar}
              data-testid="button-agregar"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          )}
          {showCalcular && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-blue-600"
              onClick={onCalcular}
              data-testid="button-calcular"
            >
              <Calculator className="h-3.5 w-3.5" />
              Calcular
            </Button>
          )}
          {showExcel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-emerald-600"
              onClick={onExcel}
              data-testid="button-excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
          )}
          {showCerrar && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-red-600"
              onClick={onCerrar}
              data-testid="button-cerrar-ventana"
            >
              <X className="h-3.5 w-3.5" />
              Cerrar
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
        MyBoton
      </TooltipContent>
    </Tooltip>
  );
}
