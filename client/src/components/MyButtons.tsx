import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SpriteIcon from "./SpriteIcon";

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
  showAgregar?: boolean;
  showEditar?: boolean;
  showCopiar?: boolean;
  showBorrar?: boolean;
  showRelacionar?: boolean;
  showCalcular?: boolean;
  showExcel?: boolean;
  showGraficas?: boolean;
  showBorrarFiltrados?: boolean;
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
  showAgregar = true,
  showEditar = true,
  showCopiar = true,
  showBorrar = true,
  showRelacionar = false,
  showCalcular = true,
  showExcel = true,
  showGraficas = true,
  showBorrarFiltrados = true,
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
              <SpriteIcon name="agregar" size={18} />
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
              <SpriteIcon name="editar" size={18} />
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
              <SpriteIcon name="copiar" size={18} />
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
              <SpriteIcon name="borrar" size={18} />
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
              <SpriteIcon name="calcular" size={18} />
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
              <SpriteIcon name="excel" size={18} />
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
              <SpriteIcon name="graficos" size={18} />
              Graficas
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
            Ver Graficas
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
              <SpriteIcon name="borrar" size={18} />
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
