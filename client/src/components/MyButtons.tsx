import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet, Trash2, Edit2, Copy, Link2, BarChart2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MyButtonsProps {
  onAgregar?: () => void;
  onEditar?: () => void;
  onCopiar?: () => void;
  onBorrar?: () => void;
  onRelacionar?: () => void;
  onCalcular?: () => void;
  onExcel?: () => void;
  onGraficas?: () => void;
  onBorrarFiltrados?: () => void;
  onReportes?: () => void;
  showAgregar?: boolean;
  showEditar?: boolean;
  showCopiar?: boolean;
  showBorrar?: boolean;
  showRelacionar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showGraficas?: boolean;
  showBorrarFiltrados?: boolean;
  showReportes?: boolean;
  selectedRow?: Record<string, any> | null;
  disableCrud?: boolean;  // Deshabilita Agregar, Editar, Copiar, Borrar
}

export default function MyButtons({
  onAgregar,
  onEditar,
  onCopiar,
  onBorrar,
  onRelacionar,
  onCalcular,
  onExcel,
  onGraficas,
  onBorrarFiltrados,
  onReportes,
  showAgregar = true,
  showEditar = true,
  showCopiar = true,
  showBorrar = true,
  showRelacionar = false,
  showCalcular = true,
  showExcel = true,
  showGraficas = true,
  showBorrarFiltrados = true,
  showReportes = false,
  selectedRow = null,
  disableCrud = false,
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
              className={`text-xs gap-1 ${disableCrud ? "text-muted-foreground/40" : "text-green-600"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (disableCrud) return;
                onAgregar?.();
              }}
              disabled={disableCrud}
              data-testid="button-agregar"
            >
              <Plus className="h-3.5 w-3.5" />
              Agr
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-green-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : "Agregar nuevo registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showEditar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection && !disableCrud ? "text-blue-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection || disableCrud) return;
                onEditar?.();
              }}
              disabled={!hasSelection || disableCrud}
              data-testid="button-editar"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edi
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Editar registro seleccionado" : "Seleccione un registro")}
          </TooltipContent>
        </Tooltip>
      )}
      {showCopiar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection && !disableCrud ? "text-cyan-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection || disableCrud) return;
                onCopiar?.();
              }}
              disabled={!hasSelection || disableCrud}
              data-testid="button-copiar"
            >
              <Copy className="h-3.5 w-3.5" />
              Cop
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Copiar registro seleccionado" : "Seleccione un registro")}
          </TooltipContent>
        </Tooltip>
      )}
      {showBorrar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1 ${hasSelection && !disableCrud ? "text-red-600" : "text-muted-foreground/40"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection || disableCrud) return;
                onBorrar?.();
              }}
              disabled={!hasSelection || disableCrud}
              data-testid="button-borrar"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bor
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Borrar registro seleccionado" : "Seleccione un registro")}
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
      {showGraficas && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-indigo-600"
              onClick={(e) => {
                e.stopPropagation();
                onGraficas?.();
              }}
              data-testid="button-graficas"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Graficas
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
            Ver Graficas
          </TooltipContent>
        </Tooltip>
      )}
      {showReportes && onReportes && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-orange-600"
              onClick={(e) => {
                e.stopPropagation();
                onReportes();
              }}
              data-testid="button-reportes"
            >
              <FileText className="h-3.5 w-3.5" />
              Reportes
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-orange-600 text-white text-xs">
            Generar reportes PDF
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
              Borrar todos
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
