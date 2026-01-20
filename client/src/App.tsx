import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { UpdateNotification } from "@/components/UpdateNotification";
import { WindowProvider } from "@/contexts/WindowContext";
import { WindowManager } from "@/components/WindowManager";
import { getStoredRole, getStoredUnidad, logout, isLoggedIn, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Guia from "@/pages/Guia";
import LoginPage from "@/pages/Login";

function RealtimeSyncProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
  useRealtimeSync();
  return <>{children}</>;
}

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = () => {
      const role = getStoredRole();
      if (!role && userRole) {
        setUserRole(null);
        setIsAuthenticated(false);
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha expirado después de 1 hora de inactividad.",
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, [userRole, toast]);

  useEffect(() => {
    const role = getStoredRole();
    const unidad = getStoredUnidad();
    if (isLoggedIn(role)) {
      setUserRole(role);
      setUnidadId(unidad);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (role: UserRole, selectedUnidadId: string) => {
    setUserRole(role);
    setUnidadId(selectedUnidadId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    logout();
    setUserRole(null);
    setUnidadId("");
    setIsAuthenticated(false);
    toast({
      title: "Sesión cerrada",
      description: "Has salido del sistema.",
    });
  };

  if (!isLoggedIn(userRole) || !isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <WindowProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800">
        <WindowManager onLogout={handleLogout} />
      </div>
    </WindowProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route path="/guia" component={Guia} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RealtimeSyncProvider>
          <Toaster />
          <UpdateNotification />
          <Router />
        </RealtimeSyncProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
