import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Warehouse, 
  Wheat, 
  ArrowLeftRight, 
  Truck,
  LogOut,
  Wrench,
  ChevronRight,
  Database,
  Upload,
  Trash2,
  AlertTriangle,
  Landmark,
  Type,
  Menu,
  Building2,
  FileText,
  X,
  Download,
  HardDrive,
  Bug,
  Minimize2,
  Save,
  FileUp,
  FileSpreadsheet,
  Book
} from "lucide-react";
import MyManual from "@/pages/MyManual";
import { exportBancosToExcel } from "@/lib/excelExport";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { hasMenuAccess, getStoredRole } from "@/lib/auth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import { BackgroundColorPicker, WindowColorPicker } from "./ColorSettings";
import { ServerStatus } from "./ServerStatus";
import MyWindow from "./MyWindow";
import { useStyleMode } from "@/contexts/StyleModeContext";
import { Sparkles, Minimize } from "lucide-react";
import { useGridSettings } from "@/contexts/GridSettingsContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, UserX } from "lucide-react";

export type ModuleKey = "parametros" | "administracion" | "bancos" | "cosecha" | "almacen" | "arrime" | "transferencias" | "cheques" | "reportes" | "agrodata" | "debug";

interface FloatingMenuProps {
  onSelectModule: (module: ModuleKey) => void;
  onLogout: () => void;
  currentModule: ModuleKey | null;
  onToolAction: (action: string) => void;
  onFocus?: () => void;
  zIndex?: number;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
  onMinimizeAll?: () => void;
  isStandalone?: boolean;
}

const modules: { key: ModuleKey; label: string; icon: JSX.Element; bgColor: string; bgColorAlegre: string; borderColor: string; shadow3d: string }[] = [
  { key: "parametros", label: "Parámetros", icon: <Settings className="h-5 w-5 text-white" />, bgColor: "bg-red-600", bgColorAlegre: "bg-gradient-to-b from-red-500 to-red-700", borderColor: "border-red-800", shadow3d: "shadow-[0_3px_0_0_rgb(127,29,29)]" },
  { key: "administracion", label: "Administración", icon: <Building2 className="h-5 w-5 text-white" />, bgColor: "bg-orange-600", bgColorAlegre: "bg-gradient-to-b from-orange-500 to-orange-700", borderColor: "border-orange-800", shadow3d: "shadow-[0_3px_0_0_rgb(124,45,18)]" },
  { key: "bancos", label: "Bancos", icon: <Landmark className="h-5 w-5 text-white" />, bgColor: "bg-yellow-600", bgColorAlegre: "bg-gradient-to-b from-yellow-500 to-yellow-700", borderColor: "border-yellow-800", shadow3d: "shadow-[0_3px_0_0_rgb(133,77,14)]" },
  { key: "cheques", label: "Cheques", icon: <FileText className="h-5 w-5 text-white" />, bgColor: "bg-green-600", bgColorAlegre: "bg-gradient-to-b from-green-500 to-green-700", borderColor: "border-green-800", shadow3d: "shadow-[0_3px_0_0_rgb(20,83,45)]" },
  { key: "cosecha", label: "Cosecha", icon: <Wheat className="h-5 w-5 text-white" />, bgColor: "bg-teal-600", bgColorAlegre: "bg-gradient-to-b from-teal-500 to-teal-700", borderColor: "border-teal-800", shadow3d: "shadow-[0_3px_0_0_rgb(19,78,74)]" },
  { key: "almacen", label: "Almacén", icon: <Warehouse className="h-5 w-5 text-white" />, bgColor: "bg-cyan-600", bgColorAlegre: "bg-gradient-to-b from-cyan-500 to-cyan-700", borderColor: "border-cyan-800", shadow3d: "shadow-[0_3px_0_0_rgb(22,78,99)]" },
  { key: "arrime", label: "Arrime", icon: <Truck className="h-5 w-5 text-white" />, bgColor: "bg-blue-600", bgColorAlegre: "bg-gradient-to-b from-blue-500 to-blue-700", borderColor: "border-blue-800", shadow3d: "shadow-[0_3px_0_0_rgb(30,58,138)]" },
  { key: "transferencias", label: "Transferencias", icon: <ArrowLeftRight className="h-5 w-5 text-white" />, bgColor: "bg-indigo-600", bgColorAlegre: "bg-gradient-to-b from-indigo-500 to-indigo-700", borderColor: "border-indigo-800", shadow3d: "shadow-[0_3px_0_0_rgb(49,46,129)]" },
  { key: "agrodata", label: "Agrodata", icon: <Database className="h-5 w-5 text-white" />, bgColor: "bg-violet-600", bgColorAlegre: "bg-gradient-to-b from-violet-500 to-violet-700", borderColor: "border-violet-800", shadow3d: "shadow-[0_3px_0_0_rgb(76,29,149)]" },
  { key: "debug", label: "MyDebug", icon: <Bug className="h-5 w-5 text-white" />, bgColor: "bg-purple-600", bgColorAlegre: "bg-gradient-to-b from-purple-500 to-purple-700", borderColor: "border-purple-800", shadow3d: "shadow-[0_3px_0_0_rgb(88,28,135)]" },
];

function StyleModeToggle() {
  const { isAlegre, toggleStyleMode } = useStyleMode();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleStyleMode}
          data-testid="button-toggle-style-mode"
        >
          {isAlegre ? (
            <span className="p-1 rounded-md border-2 bg-gradient-to-b from-fuchsia-500 to-fuchsia-700 border-fuchsia-800 flex items-center justify-center shadow-[0_3px_0_0_rgb(112,26,117)]">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
          ) : (
            <span className="p-1 rounded-md border-2 bg-slate-500 border-slate-600 flex items-center justify-center shadow-sm">
              <Minimize className="h-4 w-4 text-white" />
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent className={isAlegre ? "bg-fuchsia-600 text-white" : "bg-slate-500 text-white"}>
        {isAlegre ? "Cambiar a estilo minimizado" : "Cambiar a estilo alegre"}
      </TooltipContent>
    </Tooltip>
  );
}

function PropietarioColumnToggle() {
  const { settings, togglePropietarioColumn } = useGridSettings();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={togglePropietarioColumn}
          data-testid="button-toggle-propietario-column"
        >
          {settings.showPropietarioColumn ? (
            <span className="p-1 rounded-md border-2 bg-violet-600 border-violet-700 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </span>
          ) : (
            <span className="p-1 rounded-md border-2 bg-gray-500 border-gray-600 flex items-center justify-center">
              <UserX className="h-4 w-4 text-white" />
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent className={settings.showPropietarioColumn ? "bg-violet-600 text-white" : "bg-gray-500 text-white"}>
        {settings.showPropietarioColumn ? "Ocultar columna Propietario" : "Mostrar columna Propietario"}
      </TooltipContent>
    </Tooltip>
  );
}

export default function FloatingMenu({ 
  onSelectModule, 
  onLogout, 
  currentModule, 
  onToolAction, 
  onFocus, 
  zIndex = 110,
  fontSize = 12,
  onFontSizeChange,
  onMinimizeAll,
  isStandalone = false
}: FloatingMenuProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const isAdmin = getStoredRole() === "admin";

  const handleToolAction = (action: string) => {
    onToolAction(action);
  };

  const handleExportBancos = async () => {
    const bancoFilter = localStorage.getItem("filtro_bancos_banco") || "";
    if (!bancoFilter || bancoFilter === "all") {
      showPop({ 
        title: "Sin banco seleccionado", 
        message: "Primero seleccione un banco en el módulo Bancos"
      });
      return;
    }
    
    toast({ title: "Exportando...", description: `Generando Excel del banco ${bancoFilter}` });
    
    const success = await exportBancosToExcel(bancoFilter);
    if (success) {
      toast({ title: "Exportación completada", description: `Archivo Excel generado para ${bancoFilter}` });
    } else {
      showPop({ 
        title: "Error", 
        message: "No se pudo generar el archivo Excel o no hay datos"
      });
    }
  };

  const { isAlegre } = useStyleMode();

  // Filter modules based on user permissions
  const visibleModules = useMemo(() => {
    return modules.filter(m => {
      // Debug module is always visible for admins
      if (m.key === "debug") return true;
      return hasMenuAccess(m.key);
    });
  }, []);

  return (
    <>
    <MyWindow
      id="menu-principal"
      title="Menú"
      icon={<Menu className="h-4 w-4" />}
      initialPosition={{ x: 16, y: 16 }}
      initialSize={{ width: 200, height: 400 }}
      minSize={{ width: 160, height: 200 }}
      maxSize={{ width: 300, height: 600 }}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-primary/40"
      canMinimize={false}
      isStandalone={isStandalone}
      popoutUrl={isStandalone ? undefined : "/standalone/menu"}
    >
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between gap-1 pb-2 border-b mb-2">
          <div className="flex items-center gap-0.5">
            <ServerStatus />
            <ThemeToggle />
            <StyleModeToggle />
            <BackgroundColorPicker />
            <WindowColorPicker />
            <PropietarioColumnToggle />
          </div>
          {onFontSizeChange && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                    data-testid="button-font-decrease"
                  >
                    <span className="p-1 rounded-md border-2 bg-orange-600 border-orange-700 flex items-center justify-center relative">
                      <Type className="h-3 w-3 text-white" />
                      <span className="text-[7px] text-white font-bold absolute -bottom-0.5 -right-0.5">-</span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-orange-600 text-white text-xs">
                  Reducir tamaño de texto
                </TooltipContent>
              </Tooltip>
              <span className="font-mono text-xs min-w-[28px] text-center">{fontSize}px</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onFontSizeChange(Math.min(18, fontSize + 1))}
                    data-testid="button-font-increase"
                  >
                    <span className="p-1 rounded-md border-2 bg-orange-600 border-orange-700 flex items-center justify-center relative">
                      <Type className="h-3.5 w-3.5 text-white" />
                      <span className="text-[7px] text-white font-bold absolute -bottom-0.5 -right-0.5">+</span>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-orange-600 text-white text-xs">
                  Aumentar tamaño de texto
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {visibleModules.map((m) => (
          <Tooltip key={m.key}>
            <TooltipTrigger asChild>
              <Button
                variant={currentModule === m.key ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start h-8 text-xs gap-2"
                onClick={() => {
                  onSelectModule(m.key);
                }}
                data-testid={`button-module-${m.key}`}
              >
                <span className={`p-1 rounded-md border-2 ${isAlegre ? m.bgColorAlegre : m.bgColor} ${m.borderColor} flex items-center justify-center ${isAlegre ? m.shadow3d : "shadow-sm"}`}>
                  {m.icon}
                </span>
                {m.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className={`${m.bgColor} text-white text-xs`}>
              Abrir módulo {m.label}
            </TooltipContent>
          </Tooltip>
        ))}

        {onMinimizeAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs gap-2"
                onClick={onMinimizeAll}
                data-testid="button-minimize-all-windows"
              >
                <span className="p-1 rounded-md border-2 bg-yellow-600 border-yellow-700 flex items-center justify-center">
                  <Minimize2 className="h-4 w-4 text-white" />
                </span>
                Minimizar ventanas
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-yellow-600 text-white text-xs">
              Minimizar todas las ventanas abiertas
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-xs gap-2"
              onClick={handleExportBancos}
              data-testid="button-export-bancos-excel"
            >
              <span className="p-1 rounded-md border-2 bg-emerald-600 border-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-white" />
              </span>
              Exportar Bancos Excel
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-emerald-600 text-white text-xs">
            Exportar movimientos bancarios a Excel
          </TooltipContent>
        </Tooltip>

        <Collapsible
          open={backupOpen}
          onOpenChange={setBackupOpen}
          className="w-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 text-xs gap-2 px-2"
              data-testid="button-backup-menu"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md border-2 bg-blue-600 border-blue-700 flex items-center justify-center">
                  <Database className="h-4 w-4 text-white" />
                </span>
                Respaldo
              </div>
              <ChevronRight className={`h-3 w-3 transition-transform ${backupOpen ? 'rotate-90' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("backup_salvar")}
              data-testid="button-backup-save"
            >
              <Save className="h-3 w-3" />
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("backup_cargar")}
              data-testid="button-backup-load"
            >
              <Upload className="h-3 w-3" />
              Cargar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("backup_eliminar")}
              data-testid="button-backup-delete"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {isAdmin && (
          <Collapsible
            open={toolsOpen}
            onOpenChange={setToolsOpen}
            className="w-full"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-xs gap-2 px-2"
                data-testid="button-tools-menu"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md border-2 bg-slate-600 border-slate-700 flex items-center justify-center">
                    <Wrench className="h-4 w-4 text-white" />
                  </span>
                  Herramientas
                </div>
                <ChevronRight className={`h-3 w-3 transition-transform ${toolsOpen ? 'rotate-90' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2"
                onClick={() => handleToolAction("exportar_datos")}
                data-testid="button-tool-export"
              >
                <Download className="h-3 w-3" />
                Exportar datos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2"
                onClick={() => handleToolAction("importar_datos")}
                data-testid="button-tool-import"
              >
                <Upload className="h-3 w-3" />
                Importar datos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2 text-destructive hover:text-destructive"
                onClick={() => handleToolAction("eliminar_datos")}
                data-testid="button-tool-wipe-data"
              >
                <AlertTriangle className="h-3 w-3" />
                Eliminar datos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2"
                onClick={() => handleToolAction("borrar_cache")}
                data-testid="button-tool-clear-cache"
              >
                <HardDrive className="h-3 w-3" />
                Borrar caché local
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2"
                onClick={() => handleToolAction("definir_default")}
                data-testid="button-tool-define-default"
              >
                <Save className="h-3 w-3" />
                Definir default
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-6 text-[10px] gap-2"
                onClick={() => handleToolAction("cargar_dbf_global")}
                data-testid="button-tool-load-dbf"
              >
                <FileUp className="h-3 w-3" />
                Cargar DBF de Global
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="border-t pt-1 mt-2 space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs gap-2"
                onClick={() => setManualOpen(true)}
                data-testid="button-open-manual"
              >
                <span className="p-1 rounded-md border-2 bg-sky-600 border-sky-700 flex items-center justify-center">
                  <Book className="h-4 w-4 text-white" />
                </span>
                Manual
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-sky-600 text-white text-xs">
              Ver manual de usuario
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 text-xs gap-2"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <span className="p-1 rounded-md border-2 bg-red-600 border-red-700 flex items-center justify-center">
                  <LogOut className="h-4 w-4 text-white" />
                </span>
                Salir
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-red-600 text-white text-xs">
              Cerrar sesión
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </MyWindow>
    {manualOpen && (
      <MyManual
        onClose={() => setManualOpen(false)}
        onFocus={() => {}}
        zIndex={zIndex + 10}
      />
    )}
    </>
  );
}
