import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, Building2, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { validateAdminPassword, setStoredRole, setStoredUnidad, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { UnidadProduccion } from "@shared/schema";

interface LoginPageProps {
  onLogin: (role: UserRole, unidadId: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [step, setStep] = useState<"user" | "unidad">("user");
  const [password, setPassword] = useState("");
  const [selectedUnidad, setSelectedUnidad] = useState<string>("");
  const [role, setRole] = useState<UserRole>(null);
  const { toast } = useToast();

  const { data: unidades = [] } = useQuery<UnidadProduccion[]>({
    queryKey: ["/api/unidades-produccion"],
  });

  const handleGuestLogin = () => {
    setRole("guest");
    setStoredRole("guest");
    if (unidades.length === 0) {
      onLogin("guest", "");
    } else {
      setStep("unidad");
    }
  };

  const handleAdminLogin = () => {
    if (validateAdminPassword(password)) {
      setRole("admin");
      setStoredRole("admin");
      if (unidades.length === 0) {
        onLogin("admin", "");
      } else {
        setStep("unidad");
      }
    } else {
      toast({
        title: "Error",
        description: "Contraseña incorrecta",
        variant: "destructive",
      });
    }
  };

  const handleUnidadSelect = () => {
    if (!role) return;
    setStoredUnidad(selectedUnidad);
    onLogin(role, selectedUnidad);
  };

  const handleBack = () => {
    setStep("user");
    setPassword("");
    setRole(null);
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
            {step === "user" 
              ? "Sistema de Control de Actividades Productivas"
              : "Seleccione la unidad de producción"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "user" ? (
            <>
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Unidad de Producción</Label>
                <Select value={selectedUnidad} onValueChange={setSelectedUnidad}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Seleccione una unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidad) => (
                      <SelectItem key={unidad.id} value={unidad.id}>
                        {unidad.nombre}
                      </SelectItem>
                    ))}
                    {unidades.length === 0 && (
                      <SelectItem value="default" disabled>
                        No hay unidades configuradas
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={handleUnidadSelect}
                disabled={!selectedUnidad && unidades.length > 0}
                data-testid="button-continue"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Continuar
              </Button>

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={handleBack}
                data-testid="button-back"
              >
                Volver
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
