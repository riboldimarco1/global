import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet, Trash2, Edit2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MyBotonProps {
  onAgregar?: () => void;
  onEditar?: () => void;
  onCopiar?: () => void;
  onBorrar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onBorrarFiltrados?: () => void;
  showAgregar?: boolean;
  showEditar?: boolean;
  showCopiar?: boolean;
  showBorrar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showBorrarFiltrados?: boolean;
  selectedRow?: Record<string, any> | null;
}

export default function MyBoton({
  onAgregar,
  onEditar,
  onCopiar,
  onBorrar,
  onCalcular,
  onExcel,
  onBorrarFiltrados,
  showAgregar = true,
  showEditar = true,
  showCopiar = true,
  showBorrar = true,
  showCalcular = true,
  showExcel = true,
  showBorrarFiltrados = true,
  selectedRow = null,
}: MyBotonProps) {
  const { toast } = useToast();
  const hasSelection = !!selectedRow && !!selectedRow.id;
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
              Editar
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
              Copiar
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
                toast({
                  title: "¿Está seguro?",
                  description: `¿Desea eliminar el registro #${selectedRow?.id}?`,
                  action: (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onBorrar?.()}
                      data-testid="confirm-delete-toolbar"
                    >
                      Confirmar
                    </Button>
                  ),
                });
              }}
              disabled={!hasSelection}
              data-testid="button-borrar"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            {hasSelection ? "Borrar registro seleccionado" : "Seleccione un registro"}
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
  );
}
