import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Truck, 
  DollarSign, 
  ArrowLeft,
  Power,
  User,
  Lock
} from "lucide-react";
import { getStoredRole, canEdit } from "@/lib/auth";

export type ArrimeSubModule = "arrime" | "finanza";

interface ArrimeMenuProps {
  onSelectSubModule: (subModule: ArrimeSubModule) => void;
  onBack: () => void;
  onLogout: () => void;
}

const subModules: { key: ArrimeSubModule; name: string; description: string; icon: typeof Truck; color: string }[] = [
  { 
    key: "arrime", 
    name: "Arrime", 
    description: "Registro y control de transporte de caña",
    icon: Truck,
    color: "from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30"
  },
  { 
    key: "finanza", 
    name: "Finanza", 
    description: "Control financiero de fincas y pagos",
    icon: DollarSign,
    color: "from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30"
  },
];

export default function ArrimeMenu({ onSelectSubModule, onBack, onLogout }: ArrimeMenuProps) {
  const role = getStoredRole();
  const isAdmin = canEdit(role);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              data-testid="button-back-arrime-menu"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <h1 className="font-semibold text-sm sm:text-base">Arrime Núcleo RMW</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="button-user-info-arrime"
            >
              {isAdmin ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAdmin ? "Admin" : "Invitado"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Cerrar sesión"
              data-testid="button-logout-arrime"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Arrime de Caña</h2>
          <p className="text-muted-foreground">Seleccione una opción</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {subModules.map((module) => (
            <Card 
              key={module.key}
              className={`cursor-pointer transition-all duration-200 hover-elevate bg-gradient-to-br ${module.color} border-0`}
              onClick={() => onSelectSubModule(module.key)}
              data-testid={`card-submodule-${module.key}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-md bg-background/50">
                    <module.icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{module.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
