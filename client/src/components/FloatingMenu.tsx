import { useState } from "react";
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
  Minimize2
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import { ColorSettings } from "./ColorSettings";
import MyWindow from "./MyWindow";

export type ModuleKey = "parametros" | "administracion" | "bancos" | "cosecha" | "almacen" | "arrime" | "transferencias" | "cheques" | "debug";

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
}

const modules: { key: ModuleKey; label: string; icon: JSX.Element; color: string }[] = [
  { key: "parametros", label: "Parámetros", icon: <Settings className="h-4 w-4" />, color: "text-purple-500" },
  { key: "administracion", label: "Administración", icon: <Building2 className="h-4 w-4" />, color: "text-indigo-500" },
  { key: "bancos", label: "Bancos", icon: <Landmark className="h-4 w-4" />, color: "text-green-500" },
  { key: "cheques", label: "Cheques", icon: <FileText className="h-4 w-4" />, color: "text-green-600" },
  { key: "cosecha", label: "Cosecha", icon: <Wheat className="h-4 w-4" />, color: "text-amber-500" },
  { key: "almacen", label: "Almacén", icon: <Warehouse className="h-4 w-4" />, color: "text-purple-500" },
  { key: "arrime", label: "Arrime", icon: <Truck className="h-4 w-4" />, color: "text-teal-500" },
  { key: "transferencias", label: "Transferencias", icon: <ArrowLeftRight className="h-4 w-4" />, color: "text-rose-500" },
  { key: "debug", label: "Debug", icon: <Bug className="h-4 w-4" />, color: "text-red-500" },
];

export default function FloatingMenu({ 
  onSelectModule, 
  onLogout, 
  currentModule, 
  onToolAction, 
  onFocus, 
  zIndex = 110,
  fontSize = 12,
  onFontSizeChange,
  onMinimizeAll
}: FloatingMenuProps) {
  const [toolsOpen, setToolsOpen] = useState(false);

  const handleToolAction = (action: string) => {
    onToolAction(action);
  };

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
    >
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between gap-1 pb-2 border-b mb-2">
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <ColorSettings />
          </div>
          {onFontSizeChange && (
            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5" 
                onClick={() => onFontSizeChange(Math.max(8, fontSize - 1))}
                data-testid="button-font-size-decrease"
              >
                <Type className="h-2 w-2" />
              </Button>
              <span className="text-[9px] font-mono min-w-[12px] text-center">{fontSize}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5" 
                onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
                data-testid="button-font-size-increase"
              >
                <Type className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {modules.map((m) => (
          <Button
            key={m.key}
            variant={currentModule === m.key ? "default" : "ghost"}
            size="sm"
            className="w-full justify-start h-7 text-xs gap-2"
            onClick={() => onSelectModule(m.key)}
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
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
            Minimizar ventanas
          </Button>
        )}

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
                <Wrench className="h-4 w-4 text-slate-500" />
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
