import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Building2, 
  Warehouse, 
  Wheat, 
  Truck, 
  ArrowLeftRight, 
  Power,
  User,
  Lock,
  Landmark,
  Trash2,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStoredRole, canEdit } from "@/lib/auth";

export type ModuleKey = "parametros" | "administracion" | "bancos" | "cosecha" | "almacen" | "arrime" | "transferencias";

interface MainMenuProps {
  unidadId: string;
  onSelectModule: (module: ModuleKey) => void;
  onLogout: () => void;
}

const modules: { key: ModuleKey; name: string; description: string; icon: typeof Settings; color: string }[] = [
  { 
    key: "parametros", 
    name: "Parámetros", 
    description: "Configuración del sistema",
    icon: Settings,
    color: "from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30"
  },
  { 
    key: "administracion", 
    name: "Administración", 
    description: "Control administrativo",
    icon: Building2,
    color: "from-indigo-500/20 to-indigo-600/20 hover:from-indigo-500/30 hover:to-indigo-600/30"
  },
  { 
    key: "bancos", 
    name: "Bancos", 
    description: "Movimientos bancarios",
    icon: Landmark,
    color: "from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30"
  },
  { 
    key: "cosecha", 
    name: "Cosecha", 
    description: "Registro de cosechas",
    icon: Wheat,
    color: "from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30"
  },
  { 
    key: "almacen", 
    name: "Almacén", 
    description: "Control de inventario",
    icon: Warehouse,
    color: "from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30"
  },
  { 
    key: "arrime", 
    name: "Arrime de Caña", 
    description: "Control de transporte y finanzas",
    icon: Truck,
    color: "from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30"
  },
  { 
    key: "transferencias", 
    name: "Transferencias", 
    description: "Movimientos entre unidades",
    icon: ArrowLeftRight,
    color: "from-rose-500/20 to-rose-600/20 hover:from-rose-500/30 hover:to-rose-600/30"
  },
];

export default function MainMenu({ unidadId, onSelectModule, onLogout }: MainMenuProps) {
  const { toast } = useToast();
  const role = getStoredRole();
  const isAdmin = canEdit(role);

  const handleClearCache = () => {
    localStorage.clear();
    toast({ title: "Caché borrada", description: "Se ha limpiado la caché local correctamente" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-sm sm:text-base">Control Administrativo</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Herramientas"
                  data-testid="button-tools-menu"
                >
                  <Wrench className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClearCache} data-testid="menu-clear-cache">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Borrar caché local
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="button-user-info-menu"
            >
              {isAdmin ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAdmin ? "Admin" : "Invitado"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Cerrar sesión"
              data-testid="button-logout-menu"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Menú Principal</h2>
          <p className="text-muted-foreground">Seleccione un módulo para continuar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card 
              key={module.key}
              className={`cursor-pointer transition-all duration-200 hover-elevate bg-gradient-to-br ${module.color} border-0`}
              onClick={() => onSelectModule(module.key)}
              data-testid={`card-module-${module.key}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-background/50">
                    <module.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{module.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
