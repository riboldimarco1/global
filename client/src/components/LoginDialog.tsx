import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, UserCheck, ClipboardList, DollarSign, ArrowLeft } from "lucide-react";
import { validateAdminPassword, setStoredRole, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export type ModuleType = "arrime" | "finanza" | null;

type Step = "user" | "module";

interface LoginDialogProps {
  open: boolean;
  onLogin: (role: UserRole, module: ModuleType) => void;
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [step, setStep] = useState<Step>("user");
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleBack = () => {
    setStep("user");
    setSelectedRole(null);
    setShowPasswordInput(false);
    setPassword("");
    setError("");
  };

  const handleGuestLogin = () => {
    setStoredRole("invitado");
    setSelectedRole("invitado");
    onLogin("invitado", "arrime");
    toast({
      title: "Bienvenido",
      description: "Has ingresado como invitado al módulo Arrime.",
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
      setSelectedRole("admin");
      setPassword("");
      setShowPasswordInput(false);
      setStep("module");
    } else {
      setError("Contraseña incorrecta");
    }
  };

  const handleModuleSelect = (module: ModuleType) => {
    onLogin(selectedRole, module);
    toast({
      title: module === "arrime" ? "Arrime" : "Finanza",
      description: `Ingresando al módulo de ${module === "arrime" ? "Arrime" : "Finanza"}.`,
    });
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
            {step === "user" 
              ? "Identifícate para ingresar al sistema"
              : "Selecciona el módulo al que deseas ingresar"
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === "user" ? (
          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full h-14 justify-start gap-3"
              onClick={handleGuestLogin}
              data-testid="button-guest-login"
            >
              <User className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Invitado</div>
                <div className="text-xs text-muted-foreground">Solo lectura - Módulo Arrime</div>
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
                  <div className="text-xs text-muted-foreground">Acceso completo a todos los módulos</div>
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
        ) : (
          <div className="space-y-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 mb-2"
              onClick={handleBack}
              data-testid="button-back-to-user"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>

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
        )}
      </DialogContent>
    </Dialog>
  );
}
