import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet, Trash2, Edit2, Copy, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MyButtonsProps {
  onAgregar?: () => void;
  onEditar?: () => void;
  onCopiar?: () => void;
  onBorrar?: () => void;
  onRelacionar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onBorrarFiltrados?: () => void;
  showAgregar?: boolean;
  showEditar?: boolean;
  showCopiar?: boolean;
  showBorrar?: boolean;
  showRelacionar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showBorrarFiltrados?: boolean;
  selectedRow?: Record<string, any> | null;
}

export default function MyButtons({
  onAgregar,
  onEditar,
  onCopiar,
  onBorrar,
  onRelacionar,
  onCalcular,
  onExcel,
  onBorrarFiltrados,
  showAgregar = true,
  showEditar = true,
  showCopiar = true,
  showBorrar = true,
  showRelacionar = false,
  showCalcular = true,
  showExcel = true,
  showBorrarFiltrados = true,
  selectedRow = null,
}: MyButtonsProps) {
  const { toast } = useToast();
  const hasSelection = !!selectedRow && !!selectedRow.id;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
              Agr
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-green-600 text-white text-xs">
            Agregar nuevo registro
          </TooltipContent>
        </Tooltip>
      )}
      {showEditar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection ? "text-blue-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onEditar?.();
              }}
              disabled={!hasSelection}
              data-testid="button-editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edi
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            {hasSelection ? "Editar registro seleccionado" : "Seleccione un registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showCopiar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection ? "text-cyan-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onCopiar?.();
              }}
              disabled={!hasSelection}
              data-testid="button-copiar"
            >
              <Copy className="h-3.5 w-3.5" />
              Cop
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
            {hasSelection ? "Copiar registro seleccionado" : "Seleccione un registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showBorrar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection ? "text-red-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onBorrar?.();
              }}
              disabled={!hasSelection}
              data-testid="button-borrar"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bor
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            {hasSelection ? "Borrar registro seleccionado" : "Seleccione un registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showRelacionar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection ? "text-orange-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onRelacionar?.();
              }}
              disabled={!hasSelection}
              data-testid="button-relacionar"
            >
              <Link2 className="h-3.5 w-3.5" />
              Rel
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-orange-600 text-white text-xs">
            {hasSelection ? "Relacionar con Administración" : "Seleccione un registro"}
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
              Cal
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
              Exc
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-emerald-600 text-white text-xs">
            Exportar a Excel
          </TooltipContent>
        </Tooltip>
      )}
      {showBorrarFiltrados && onBorrarFiltrados && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onBorrarFiltrados();
              }}
              data-testid="button-borrar-filtrados"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar los registros filtrados
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            Eliminar todos los registros visibles en la tabla
          </TooltipContent>
        </Tooltip>
      )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-slate-600 text-white text-xs">
        MyButtons
      </TooltipContent>
    </Tooltip>
  );
}
