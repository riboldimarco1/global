import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calculator, FileSpreadsheet, Trash2, Edit2, Copy, Link2, BarChart2, FileText, Wifi, Globe, Play, Activity, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MyButtonStyle } from "@/components/MyButtonStyle";

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
  onPing?: () => void;
  onOpenInBrowser?: () => void;
  onPingOne?: () => void;
  onNetworkStatus?: () => void;
  onImportar?: () => void;
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
  showPing?: boolean;
  showOpenInBrowser?: boolean;
  showPingOne?: boolean;
  showNetworkStatus?: boolean;
  showImportar?: boolean;
  selectedRow?: Record<string, any> | null;
  disableCrud?: boolean;
  disableBorrarFiltrados?: boolean;
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
  onPing,
  onOpenInBrowser,
  onPingOne,
  onNetworkStatus,
  onImportar,
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
  showPing = false,
  showOpenInBrowser = false,
  showPingOne = false,
  showNetworkStatus = false,
  showImportar = false,
  selectedRow = null,
  disableCrud = false,
  disableBorrarFiltrados = false,
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
            <MyButtonStyle
              color="green"
              className="text-xs gap-1"
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
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-green-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : "Agregar nuevo registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showEditar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="blue"
              className="text-xs gap-1"
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
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Editar registro seleccionado" : "Seleccione un registro")}
          </TooltipContent>
        </Tooltip>
      )}
      {showCopiar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="cyan"
              className="text-xs gap-1"
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
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Copiar registro seleccionado" : "Seleccione un registro")}
          </TooltipContent>
        </Tooltip>
      )}
      {showBorrar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="red"
              className="text-xs gap-1"
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
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            {disableCrud ? "Seleccione un filtro específico" : (hasSelection ? "Borrar registro seleccionado" : "Seleccione un registro")}
          </TooltipContent>
        </Tooltip>
      )}
      {showRelacionar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="orange"
              className="text-xs gap-1"
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
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-orange-600 text-white text-xs">
            {hasSelection ? "Relacionar con Administración" : "Seleccione un registro"}
          </TooltipContent>
        </Tooltip>
      )}
      {showCalcular && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="blue"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onCalcular?.();
              }}
              data-testid="button-calcular"
            >
              <Calculator className="h-3.5 w-3.5" />
              Cal
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            Calcular totales
          </TooltipContent>
        </Tooltip>
      )}
      {showExcel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="emerald"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onExcel?.();
              }}
              data-testid="button-excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exc
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-emerald-600 text-white text-xs">
            Exportar a Excel
          </TooltipContent>
        </Tooltip>
      )}
      {showImportar && onImportar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="cyan"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onImportar();
              }}
              data-testid="button-importar"
            >
              <Upload className="h-3.5 w-3.5" />
              Imp
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
            Importar archivo bancario
          </TooltipContent>
        </Tooltip>
      )}
      {showGraficas && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="indigo"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onGraficas?.();
              }}
              data-testid="button-graficas"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Graficas
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
            Ver Graficas
          </TooltipContent>
        </Tooltip>
      )}
      {showReportes && onReportes && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="orange"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onReportes();
              }}
              data-testid="button-reportes"
            >
              <FileText className="h-3.5 w-3.5" />
              Reportes
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-orange-600 text-white text-xs">
            Generar reportes PDF
          </TooltipContent>
        </Tooltip>
      )}
      {showBorrarFiltrados && onBorrarFiltrados && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="red"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                if (disableBorrarFiltrados) return;
                onBorrarFiltrados();
              }}
              disabled={disableBorrarFiltrados}
              data-testid="button-borrar-filtrados"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar todos
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white text-xs">
            {disableBorrarFiltrados ? "Seleccione un filtro específico (no 'todos')" : "Eliminar todos los registros visibles en la tabla"}
          </TooltipContent>
        </Tooltip>
      )}
      {showPing && onPing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="teal"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onPing();
              }}
              data-testid="button-ping"
            >
              <Wifi className="h-3.5 w-3.5" />
              Ping
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-teal-600 text-white text-xs">
            Hacer ping a las IP de la tabla
          </TooltipContent>
        </Tooltip>
      )}
      {showOpenInBrowser && onOpenInBrowser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="blue"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onOpenInBrowser();
              }}
              disabled={!hasSelection}
              data-testid="button-open-in-browser"
            >
              <Globe className="h-3.5 w-3.5" />
              Chrome
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-blue-600 text-white text-xs">
            Abrir IP en Chrome
          </TooltipContent>
        </Tooltip>
      )}
      {showPingOne && onPingOne && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="yellow"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSelection) return;
                onPingOne();
              }}
              disabled={!hasSelection}
              data-testid="button-ping-one"
            >
              <Play className="h-3.5 w-3.5" />
              Ping1
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-yellow-600 text-white text-xs">
            Hacer ping solo a este registro
          </TooltipContent>
        </Tooltip>
      )}
      {showNetworkStatus && onNetworkStatus && (
        <Tooltip>
          <TooltipTrigger asChild>
            <MyButtonStyle
              color="purple"
              className="text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onNetworkStatus();
              }}
              data-testid="button-network-status"
            >
              <Activity className="h-3.5 w-3.5" />
              Gráfica
            </MyButtonStyle>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-purple-600 text-white text-xs">
            Ver estado de la red
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
