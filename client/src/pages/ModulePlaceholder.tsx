import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  ArrowLeft,
  Power,
  User,
  Lock,
  Construction
} from "lucide-react";
import { getStoredRole, canEdit } from "@/lib/auth";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  onBack: () => void;
  onLogout: () => void;
}

export default function ModulePlaceholder({ 
  title, 
  description, 
  icon, 
  colorClass,
  onBack, 
  onLogout 
}: ModulePlaceholderProps) {
  const role = getStoredRole();
  const isAdmin = canEdit(role);

  return (
    <div className={`min-h-screen ${colorClass}`}>
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              data-testid="button-back-module"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {icon}
              <h1 className="font-semibold text-sm sm:text-base">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="button-user-info-module"
            >
              {isAdmin ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAdmin ? "Admin" : "Invitado"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="Cerrar sesión"
              data-testid="button-logout-module"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Construction className="w-10 h-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{description}</p>
            <p className="text-sm text-muted-foreground">
              Este módulo está en construcción. Pronto estará disponible.
            </p>
            <Button variant="outline" onClick={onBack} data-testid="button-return-menu">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Menú Principal
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
