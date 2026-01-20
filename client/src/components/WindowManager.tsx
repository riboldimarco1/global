import { FloatingWindow } from "./FloatingWindow";
import { useWindows, WindowId } from "@/contexts/WindowContext";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import AdministracionWindow from "./AdministracionWindow";
import BancosWindow from "./BancosWindow";
import ParametrosWindow from "./ParametrosWindow";
import { 
  Settings, 
  Building2, 
  Warehouse, 
  Wheat, 
  Truck, 
  ArrowLeftRight,
  Landmark,
  Menu
} from "lucide-react";

const modules: { id: WindowId; name: string; description: string; icon: typeof Settings; color: string }[] = [
  { 
    id: "parametros", 
    name: "Parámetros", 
    description: "Configuración del sistema",
    icon: Settings,
    color: "from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30"
  },
  { 
    id: "administracion", 
    name: "Administración", 
    description: "Control financiero",
    icon: Building2,
    color: "from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30"
  },
  { 
    id: "bancos", 
    name: "Bancos", 
    description: "Control bancario",
    icon: Landmark,
    color: "from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30"
  },
  { 
    id: "cosecha", 
    name: "Cosecha", 
    description: "Registro de cosechas",
    icon: Wheat,
    color: "from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30"
  },
  { 
    id: "almacen", 
    name: "Almacén", 
    description: "Control de inventario",
    icon: Warehouse,
    color: "from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30"
  },
  { 
    id: "arrime", 
    name: "Arrime de Caña", 
    description: "Control de transporte",
    icon: Truck,
    color: "from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30"
  },
  { 
    id: "transferencias", 
    name: "Transferencias", 
    description: "Movimientos entre unidades",
    icon: ArrowLeftRight,
    color: "from-rose-500/20 to-rose-600/20 hover:from-rose-500/30 hover:to-rose-600/30"
  },
];

interface WindowManagerProps {
  onLogout: () => void;
}

function MainMenuContent({ onLogout }: { onLogout: () => void }) {
  const { openWindow } = useWindows();

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Módulos</span>
        <ThemeToggle />
      </div>
      <div className="space-y-1.5">
        {modules.map((module) => (
          <Button
            key={module.id}
            variant="ghost"
            className={`w-full justify-start gap-2 h-auto py-2 px-3 bg-gradient-to-r ${module.color}`}
            onClick={() => openWindow(module.id)}
            data-testid={`menu-button-${module.id}`}
          >
            <module.icon className="h-4 w-4 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-sm font-medium truncate">{module.name}</div>
              <div className="text-xs text-muted-foreground truncate">{module.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">{title}</p>
        <p className="text-sm">Módulo en desarrollo</p>
      </div>
    </div>
  );
}

export function WindowManager({ onLogout }: WindowManagerProps) {
  const { windows, closeWindow, focusWindow, getZIndex, openWindow } = useWindows();

  return (
    <>
      <FloatingWindow
        id="menu"
        title="Menú Principal"
        icon={<Menu className="h-4 w-4 text-primary" />}
        defaultPosition={{ x: 20, y: 20, width: 280, height: 480 }}
        minWidth={240}
        minHeight={300}
        zIndex={getZIndex("menu")}
        onFocus={() => focusWindow("menu")}
        onLogout={onLogout}
        showLogout
        headerClassName="bg-primary/10"
        resizable={false}
      >
        <MainMenuContent onLogout={onLogout} />
      </FloatingWindow>

      {windows.administracion.isOpen && (
        <FloatingWindow
          id="administracion"
          title="Administración"
          icon={<Building2 className="h-4 w-4 text-emerald-600" />}
          defaultPosition={{ x: 320, y: 50, width: 900, height: 600 }}
          minWidth={600}
          minHeight={400}
          zIndex={getZIndex("administracion")}
          onFocus={() => focusWindow("administracion")}
          onClose={() => closeWindow("administracion")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-emerald-500/10"
        >
          <AdministracionWindow />
        </FloatingWindow>
      )}

      {windows.bancos.isOpen && (
        <FloatingWindow
          id="bancos"
          title="Bancos"
          icon={<Landmark className="h-4 w-4 text-green-600" />}
          defaultPosition={{ x: 400, y: 100, width: 900, height: 550 }}
          minWidth={600}
          minHeight={400}
          zIndex={getZIndex("bancos")}
          onFocus={() => focusWindow("bancos")}
          onClose={() => closeWindow("bancos")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-green-500/10"
        >
          <BancosWindow />
        </FloatingWindow>
      )}

      {windows.parametros.isOpen && (
        <FloatingWindow
          id="parametros"
          title="Parámetros"
          icon={<Settings className="h-4 w-4 text-blue-600" />}
          defaultPosition={{ x: 350, y: 80, width: 800, height: 550 }}
          minWidth={600}
          minHeight={400}
          zIndex={getZIndex("parametros")}
          onFocus={() => focusWindow("parametros")}
          onClose={() => closeWindow("parametros")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-blue-500/10"
        >
          <ParametrosWindow />
        </FloatingWindow>
      )}

      {windows.cosecha.isOpen && (
        <FloatingWindow
          id="cosecha"
          title="Cosecha"
          icon={<Wheat className="h-4 w-4 text-amber-600" />}
          defaultPosition={{ x: 380, y: 110, width: 800, height: 500 }}
          minWidth={500}
          minHeight={300}
          zIndex={getZIndex("cosecha")}
          onFocus={() => focusWindow("cosecha")}
          onClose={() => closeWindow("cosecha")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-amber-500/10"
        >
          <PlaceholderContent title="Cosecha" />
        </FloatingWindow>
      )}

      {windows.almacen.isOpen && (
        <FloatingWindow
          id="almacen"
          title="Almacén"
          icon={<Warehouse className="h-4 w-4 text-purple-600" />}
          defaultPosition={{ x: 410, y: 140, width: 800, height: 500 }}
          minWidth={500}
          minHeight={300}
          zIndex={getZIndex("almacen")}
          onFocus={() => focusWindow("almacen")}
          onClose={() => closeWindow("almacen")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-purple-500/10"
        >
          <PlaceholderContent title="Almacén" />
        </FloatingWindow>
      )}

      {windows.arrime.isOpen && (
        <FloatingWindow
          id="arrime"
          title="Arrime de Caña"
          icon={<Truck className="h-4 w-4 text-orange-600" />}
          defaultPosition={{ x: 440, y: 170, width: 800, height: 500 }}
          minWidth={500}
          minHeight={300}
          zIndex={getZIndex("arrime")}
          onFocus={() => focusWindow("arrime")}
          onClose={() => closeWindow("arrime")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-orange-500/10"
        >
          <PlaceholderContent title="Arrime de Caña" />
        </FloatingWindow>
      )}

      {windows.transferencias.isOpen && (
        <FloatingWindow
          id="transferencias"
          title="Transferencias"
          icon={<ArrowLeftRight className="h-4 w-4 text-rose-600" />}
          defaultPosition={{ x: 470, y: 200, width: 800, height: 500 }}
          minWidth={500}
          minHeight={300}
          zIndex={getZIndex("transferencias")}
          onFocus={() => focusWindow("transferencias")}
          onClose={() => closeWindow("transferencias")}
          onLogout={onLogout}
          showLogout
          headerClassName="bg-rose-500/10"
        >
          <PlaceholderContent title="Transferencias" />
        </FloatingWindow>
      )}
    </>
  );
}
