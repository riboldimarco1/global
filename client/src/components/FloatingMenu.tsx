import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  LogOut,
  ChevronRight,
  Database,
  Upload,
  Trash2,
  AlertTriangle,
  Type,
  Menu,
  Download,
  HardDrive,
  Save,
  FileUp,
  Settings,
  Warehouse
} from "lucide-react";
import SpriteIcon from "./SpriteIcon";
import { exportBancosToExcel } from "@/lib/excelExport";
import { useToast } from "@/hooks/use-toast";
import { hasMenuAccess } from "@/lib/auth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import { BackgroundColorPicker, WindowColorPicker } from "./ColorSettings";
import { ServerStatus } from "./ServerStatus";
import MyWindow from "./MyWindow";
import { useGridSettings } from "@/contexts/GridSettingsContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, UserX } from "lucide-react";

export type ModuleKey = "parametros" | "administracion" | "bancos" | "cosecha" | "almacen" | "arrime" | "transferencias" | "cheques" | "reportes" | "debug";

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

const modules: { key: ModuleKey; label: string; icon: JSX.Element; color: string }[] = [
  { key: "parametros", label: "Parámetros", icon: <Settings className="h-5 w-5" />, color: "text-purple-500" },
  { key: "administracion", label: "Administración", icon: <SpriteIcon name="administracion" size={20} />, color: "" },
  { key: "bancos", label: "Bancos", icon: <SpriteIcon name="bancos" size={20} />, color: "" },
  { key: "cheques", label: "Cheques", icon: <SpriteIcon name="cheques" size={20} />, color: "" },
  { key: "cosecha", label: "Cosecha", icon: <SpriteIcon name="cosecha" size={20} />, color: "" },
  { key: "almacen", label: "Almacén", icon: <Warehouse className="h-5 w-5" />, color: "text-purple-500" },
  { key: "arrime", label: "Arrime", icon: <SpriteIcon name="arrime" size={20} />, color: "" },
  { key: "transferencias", label: "Transferencias", icon: <SpriteIcon name="transferencia" size={20} />, color: "" },
  { key: "reportes", label: "Reportes", icon: <SpriteIcon name="reportes" size={20} />, color: "" },
  { key: "debug", label: "MyDebug", icon: <SpriteIcon name="diagnostico" size={20} />, color: "" },
];

function PropietarioColumnToggle() {
  const { settings, togglePropietarioColumn } = useGridSettings();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={togglePropietarioColumn}
          data-testid="button-toggle-propietario-column"
        >
          {settings.showPropietarioColumn ? (
            <User className="h-4 w-4" />
          ) : (
            <UserX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
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
  const { toast } = useToast();

  const handleToolAction = (action: string) => {
    onToolAction(action);
  };

  const handleExportBancos = async () => {
    const bancoFilter = localStorage.getItem("filtro_bancos_banco") || "";
    if (!bancoFilter || bancoFilter === "all") {
      toast({ 
        title: "Sin banco seleccionado", 
        description: "Primero seleccione un banco en el módulo Bancos",
        variant: "destructive"
      });
      return;
    }
    
    toast({ title: "Exportando...", description: `Generando Excel del banco ${bancoFilter}` });
    
    const success = await exportBancosToExcel(bancoFilter);
    if (success) {
      toast({ title: "Exportación completada", description: `Archivo Excel generado para ${bancoFilter}` });
    } else {
      toast({ 
        title: "Error", 
        description: "No se pudo generar el archivo Excel o no hay datos",
        variant: "destructive"
      });
    }
  };

  // Filter modules based on user permissions
  const visibleModules = useMemo(() => {
    return modules.filter(m => {
      // Debug module is always visible for admins
      if (m.key === "debug") return true;
      return hasMenuAccess(m.key);
    });
  }, []);

  return (
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
            <BackgroundColorPicker />
            <WindowColorPicker />
            <PropietarioColumnToggle />
          </div>
          {onFontSizeChange && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                data-testid="button-font-decrease"
              >
                <Type className="h-3 w-3" />
                <span className="text-[8px] absolute -bottom-0.5 -right-0.5">-</span>
              </Button>
              <span className="font-mono text-xs min-w-[28px] text-center">{fontSize}px</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onFontSizeChange(Math.min(18, fontSize + 1))}
                data-testid="button-font-increase"
              >
                <Type className="h-3.5 w-3.5" />
                <span className="text-[8px] absolute -bottom-0.5 -right-0.5">+</span>
              </Button>
            </div>
          )}
        </div>

        {visibleModules.map((m) => (
          <Button
            key={m.key}
            variant={currentModule === m.key ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start h-7 text-xs gap-2"
            onClick={() => {
              if (m.key === "arrime") {
                window.open("https://arrimermw.com/", "_blank");
              } else {
                onSelectModule(m.key);
              }
            }}
            data-testid={`button-module-${m.key}`}
          >
            <span className={m.color}>{m.icon}</span>
            {m.label}
          </Button>
        ))}

        {onMinimizeAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs gap-2"
            onClick={onMinimizeAll}
            data-testid="button-minimize-all-windows"
          >
            <SpriteIcon name="minimizar" size={20} />
            Minimizar ventanas
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-7 text-xs gap-2"
          onClick={handleExportBancos}
          data-testid="button-export-bancos-excel"
        >
          <SpriteIcon name="excel" size={20} />
          Exportar Bancos Excel
        </Button>

        <Collapsible
          open={toolsOpen}
          onOpenChange={setToolsOpen}
          className="w-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-7 text-xs gap-2 px-2"
              data-testid="button-tools-menu"
            >
              <div className="flex items-center gap-2">
                <SpriteIcon name="herramientas" size={20} />
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
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("hacer_respaldo")}
              data-testid="button-tool-backup"
            >
              <Database className="h-3 w-3" />
              Hacer respaldo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("cargar_respaldo")}
              data-testid="button-tool-restore"
            >
              <Upload className="h-3 w-3" />
              Cargar respaldo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 text-[10px] gap-2"
              onClick={() => handleToolAction("borrar_respaldo")}
              data-testid="button-tool-delete-backup"
            >
              <Trash2 className="h-3 w-3" />
              Borrar respaldo
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

        <div className="border-t pt-1 mt-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs gap-2 text-destructive hover:text-destructive"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>
    </MyWindow>
  );
}
