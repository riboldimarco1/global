import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, UserCheck } from "lucide-react";
import { validateAdminPassword, setStoredRole, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LoginDialogProps {
  open: boolean;
  onLogin: (role: UserRole) => void;
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleGuestLogin = () => {
    setStoredRole("invitado");
    onLogin("invitado");
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
      onLogin("admin");
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
          <DialogTitle className="text-center text-xl">Registro de Centrales</DialogTitle>
          <DialogDescription className="text-center">
            Selecciona cómo deseas ingresar al sistema
          </DialogDescription>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
}
