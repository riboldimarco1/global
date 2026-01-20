import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Building2, 
  Warehouse, 
  Wheat, 
  ArrowLeftRight, 
  Truck,
  GripVertical,
  LogOut,
  Minimize2,
  Maximize2,
  Wrench,
  ChevronRight,
  Database,
  Upload,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type ModuleKey = "parametros" | "administracion" | "cosecha" | "almacen" | "arrime" | "transferencias";

interface FloatingMenuProps {
  onSelectModule: (module: ModuleKey) => void;
  onLogout: () => void;
  currentModule: ModuleKey | null;
}

const modules: { key: ModuleKey; label: string; icon: JSX.Element; color: string }[] = [
  { key: "parametros", label: "Parámetros", icon: <Settings className="h-4 w-4" />, color: "text-blue-500" },
  { key: "administracion", label: "Admin & Bancos", icon: <Building2 className="h-4 w-4" />, color: "text-green-500" },
  { key: "cosecha", label: "Cosecha", icon: <Wheat className="h-4 w-4" />, color: "text-amber-500" },
  { key: "almacen", label: "Almacén", icon: <Warehouse className="h-4 w-4" />, color: "text-purple-500" },
  { key: "arrime", label: "Arrime", icon: <Truck className="h-4 w-4" />, color: "text-teal-500" },
  { key: "transferencias", label: "Transferencias", icon: <ArrowLeftRight className="h-4 w-4" />, color: "text-rose-500" },
];

export default function FloatingMenu({ onSelectModule, onLogout, currentModule }: FloatingMenuProps) {
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 180, height: "auto" as string | number });
  const [isResizing, setIsResizing] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;
        setPosition({
          x: Math.max(0, dragRef.current.startPosX + deltaX),
          y: Math.max(0, dragRef.current.startPosY + deltaY),
        });
      }
      if (isResizing && resizeRef.current) {
        const deltaX = e.clientX - resizeRef.current.startX;
        setSize(s => ({
          ...s,
          width: Math.max(140, Math.min(300, resizeRef.current!.startWidth + deltaX)),
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      dragRef.current = null;
      resizeRef.current = null;
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
    };
  };

  const handleToolAction = (action: string) => {
    console.log(`Tool action: ${action}`);
    // Future implementation for tool actions
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
      }}
      data-testid="floating-menu"
    >
      <Card className="shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader 
          className="py-2 px-3 cursor-move flex flex-row items-center justify-between gap-1 border-b"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-xs font-semibold">Menú</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5" 
              onClick={() => setIsMinimized(!isMinimized)}
              data-testid="button-minimize-menu"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-2 space-y-1">
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
              </CollapsibleContent>
            </Collapsible>
            
            <div className="border-t pt-1 mt-2">
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
          </CardContent>
        )}
        
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={handleResizeStart}
          style={{ 
            background: "linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground)/0.3) 50%)",
            borderBottomRightRadius: "0.375rem"
          }}
        />
      </Card>
    </div>
  );
}
