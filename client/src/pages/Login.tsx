import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { validateAdminPassword, setStoredRole, setStoredUnidad, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLogin: (role: UserRole, unidadId: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleAdminLogin = () => {
    if (validateAdminPassword(password)) {
      setStoredRole("admin");
      setStoredUnidad("");
      onLogin("admin", "");
    } else {
      toast({
        title: "Error",
        description: "Contraseña incorrecta",
        variant: "destructive",
      });
    }
  };

  const handleGuestLogin = () => {
    setStoredRole("guest");
    setStoredUnidad("");
    onLogin("guest", "");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Control Administrativo</CardTitle>
          <CardDescription>
            Sistema de Control de Actividades Productivas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña de Administrador</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Ingrese contraseña"
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                data-testid="input-password"
              />
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleAdminLogin}
            disabled={!password}
            data-testid="button-admin-login"
          >
            <Lock className="mr-2 h-4 w-4" />
            Ingresar como Administrador
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGuestLogin}
            data-testid="button-guest-login"
          >
            <User className="mr-2 h-4 w-4" />
            Ingresar como Invitado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
