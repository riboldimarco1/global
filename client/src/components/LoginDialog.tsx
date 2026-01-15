import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, UserCheck, ClipboardList, DollarSign, ArrowLeft } from "lucide-react";
import { validateAdminPassword, setStoredRole, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export type ModuleType = "arrime" | "finanza" | null;

interface LoginDialogProps {
  open: boolean;
  onLogin: (role: UserRole, module: ModuleType) => void;
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [selectedModule, setSelectedModule] = useState<ModuleType>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleModuleSelect = (module: ModuleType) => {
    if (module === "finanza") {
      setStoredRole("invitado");
      onLogin("invitado", "finanza");
      toast({
        title: "Finanza",
        description: "Ingresando al módulo de Finanza.",
      });
    } else {
      setSelectedModule(module);
    }
  };

  const handleBack = () => {
    setSelectedModule(null);
    setShowPasswordInput(false);
    setPassword("");
    setError("");
  };

  const handleGuestLogin = () => {
    setStoredRole("invitado");
    onLogin("invitado", "arrime");
    toast({
      title: "Bienvenido",
      description: "Has ingresado como invitado. Solo puedes ver los datos.",
    });
  };

  const handleAdminLogin = () => {
    if (!showPasswordInput) {
      setShowPasswordInput(true);
      setError("");
      return;
    }

    if (validateAdminPassword(password)) {
      setStoredRole("admin");
      onLogin("admin", "arrime");
      setPassword("");
      setShowPasswordInput(false);
      toast({
        title: "Bienvenido Admin",
        description: "Tienes acceso completo al sistema.",
      });
    } else {
      setError("Contraseña incorrecta");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdminLogin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Arrime Nucleo RMW</DialogTitle>
          <DialogDescription className="text-center">
            {selectedModule === null 
              ? "Selecciona el módulo al que deseas ingresar"
              : "Selecciona cómo deseas ingresar al sistema"
            }
          </DialogDescription>
        </DialogHeader>
        
        {selectedModule === null ? (
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full h-16 justify-start gap-4"
              onClick={() => handleModuleSelect("arrime")}
              data-testid="button-module-arrime"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <ClipboardList className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <div className="font-medium text-lg">Arrime</div>
                <div className="text-xs text-muted-foreground">Registro de centrales</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-16 justify-start gap-4"
              onClick={() => handleModuleSelect("finanza")}
              data-testid="button-module-finanza"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-lg">Finanza</div>
                <div className="text-xs text-muted-foreground">Gestión financiera</div>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 mb-2"
              onClick={handleBack}
              data-testid="button-back-to-modules"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a módulos
            </Button>

            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={handleGuestLogin}
              data-testid="button-guest-login"
            >
              <User className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Invitado</div>
                <div className="text-xs text-muted-foreground">Solo lectura</div>
              </div>
            </Button>

            <div className="space-y-2">
              <Button
                variant={showPasswordInput ? "default" : "outline"}
                className="w-full h-14 justify-start gap-3"
                onClick={handleAdminLogin}
                data-testid="button-admin-login"
              >
                <Lock className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Administrador</div>
                  <div className="text-xs text-muted-foreground">Acceso completo</div>
                </div>
                {showPasswordInput && <UserCheck className="h-5 w-5 ml-auto" />}
              </Button>

              {showPasswordInput && (
                <div className="space-y-2 pl-1">
                  <Label htmlFor="admin-password">Contraseña</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Ingresa la contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    data-testid="input-admin-password"
                  />
                  {error && (
                    <p className="text-sm text-destructive" data-testid="text-login-error">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
