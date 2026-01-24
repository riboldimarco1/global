import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet } from "lucide-react";

interface MyBotonProps {
  onAgregar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onExcel1?: () => void;
  showAgregar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showExcel1?: boolean;
}

export default function MyBoton({
  onAgregar,
  onCalcular,
  onExcel,
  onExcel1,
  showAgregar = true,
  showCalcular = true,
  showExcel = true,
  showExcel1 = true,
}: MyBotonProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-br from-slate-500/10 to-slate-600/20 border border-slate-500/30">
      {showAgregar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                onAgregar?.();
              }}
              data-testid="button-agregar"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-green-600 text-white text-xs">
            Agregar nuevo registro
          </TooltipContent>
        </Tooltip>
      )}
      {showCalcular && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onCalcular?.();
              }}
              data-testid="button-calcular"
            >
              <Calculator className="h-3.5 w-3.5" />
              Calcular
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            Calcular totales
          </TooltipContent>
        </Tooltip>
      )}
      {showExcel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-emerald-600"
              onClick={(e) => {
                e.stopPropagation();
                onExcel?.();
              }}
              data-testid="button-excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-emerald-600 text-white text-xs">
            Exportar a Excel
          </TooltipContent>
        </Tooltip>
      )}
      {showExcel1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-emerald-600"
              onClick={(e) => {
                e.stopPropagation();
                onExcel1?.();
              }}
              data-testid="button-excel1"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel1
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-emerald-600 text-white text-xs">
            Exportar a Excel
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
