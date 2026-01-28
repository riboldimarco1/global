import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Building2, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  validateAdminPassword, 
  setStoredRole, 
  setStoredUnidad, 
  setStoredUsername,
  setStoredPermissions,
  type UserRole 
} from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLogin: (role: UserRole, unidadId: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      // Try to validate against database first
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoredRole("admin");
        setStoredUnidad("");
        setStoredUsername(data.username);
        setStoredPermissions(data.permissions);
        onLogin("admin", "");
        return;
      }
      
      // Fallback to legacy admin login if API returns 404 (no users in DB yet)
      if (response.status === 404 || response.status === 401) {
        // Try legacy admin login
        if (username.toLowerCase() === "admin" && validateAdminPassword(password)) {
          setStoredRole("admin");
          setStoredUnidad("");
          setStoredUsername("admin");
          setStoredPermissions(null); // No restrictions for legacy admin
          onLogin("admin", "");
          return;
        }
      }
      
      toast({
        title: "Error",
        description: "Usuario o contraseña incorrecta",
        variant: "destructive",
      });
    } catch (error) {
      // If API fails, try legacy admin login
      if (username.toLowerCase() === "admin" && validateAdminPassword(password)) {
        setStoredRole("admin");
        setStoredUnidad("");
        setStoredUsername("admin");
        setStoredPermissions(null);
        onLogin("admin", "");
        return;
      }
      
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <Label htmlFor="username">Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Ingrese usuario"
                className="pl-10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("password")?.focus()}
                data-testid="input-username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
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
            disabled={!username || !password || isLoading}
            data-testid="button-admin-login"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Validando..." : "Ingresar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
