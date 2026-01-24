import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, FileSpreadsheet, Trash2 } from "lucide-react";

interface MyBotonProps {
  onAgregar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onPrueba?: () => void;
  onDeleteAll?: () => void;
  showAgregar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showDeleteAll?: boolean;
}

export default function MyBoton({
  onAgregar,
  onCalcular,
  onExcel,
  onPrueba,
  onDeleteAll,
  showAgregar = false,
  showCalcular = true,
  showExcel = true,
  showDeleteAll = true,
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
              Agregar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-green-600 text-white text-xs">
            Agregar nuevo registro
          </TooltipContent>
        </Tooltip>
      )}
      {showDeleteAll && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAll?.();
              }}
              data-testid="button-borrar-todos"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar Todos
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            Borrar todos los registros filtrados
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
    </div>
  );
}
