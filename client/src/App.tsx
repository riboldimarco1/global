import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { UpdateNotification } from "@/components/UpdateNotification";
import { getStoredRole, getStoredUnidad, logout, isLoggedIn, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Guia from "@/pages/Guia";
import LoginPage from "@/pages/Login";
import MainMenu, { type ModuleKey } from "@/pages/MainMenu";
import ArrimeMenu, { type ArrimeSubModule } from "@/pages/ArrimeMenu";
import ModulePlaceholder from "@/pages/ModulePlaceholder";
import Home from "@/pages/Home";
import Finanza from "@/pages/Finanza";
import { Settings, Building2, Warehouse, Wheat, ArrowLeftRight } from "lucide-react";

type AppView = "login" | "menu" | "arrime-menu" | ModuleKey | "arrime-page" | "finanza-page";

function RealtimeSyncProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
  useRealtimeSync();
  return <>{children}</>;
}

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>("login");
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = () => {
      const role = getStoredRole();
      if (!role && userRole) {
        setUserRole(null);
        setCurrentView("login");
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
      setCurrentView("menu");
    }
  }, []);

  const handleLogin = (role: UserRole, selectedUnidadId: string) => {
    setUserRole(role);
    setUnidadId(selectedUnidadId);
    setCurrentView("menu");
  };

  const handleLogout = () => {
    logout();
    setUserRole(null);
    setUnidadId("");
    setCurrentView("login");
    toast({
      title: "Sesión cerrada",
      description: "Has salido del sistema.",
    });
  };

  const handleSelectModule = (module: ModuleKey) => {
    if (module === "arrime") {
      setCurrentView("arrime-menu");
    } else {
      setCurrentView(module);
    }
  };

  const handleBackToMenu = () => {
    setCurrentView("menu");
  };

  const handleSelectArrimeSubModule = (subModule: ArrimeSubModule) => {
    if (subModule === "arrime") {
      setCurrentView("arrime-page");
    } else {
      setCurrentView("finanza-page");
    }
  };

  const handleBackFromArrime = () => {
    setCurrentView("arrime-menu");
  };

  if (!isLoggedIn(userRole) || currentView === "login") {
    return <LoginPage onLogin={handleLogin} />;
  }

  switch (currentView) {
    case "menu":
      return (
        <MainMenu 
          unidadId={unidadId} 
          onSelectModule={handleSelectModule} 
          onLogout={handleLogout} 
        />
      );

    case "arrime-menu":
      return (
        <ArrimeMenu 
          onSelectSubModule={handleSelectArrimeSubModule}
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    case "arrime-page":
      return (
        <Home 
          onBack={handleBackFromArrime}
          onLogout={handleLogout}
          userRole={userRole}
        />
      );

    case "finanza-page":
      return (
        <Finanza 
          onBack={handleBackFromArrime}
          onLogout={handleLogout}
        />
      );

    case "parametros":
      return (
        <ModulePlaceholder
          title="Parámetros"
          description="Configure los parámetros generales del sistema"
          icon={<Settings className="h-6 w-6 text-primary" />}
          colorClass="bg-gradient-to-br from-blue-500/5 to-blue-600/10"
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    case "administracion":
      return (
        <ModulePlaceholder
          title="Administración y Bancos"
          description="Control financiero y operaciones bancarias"
          icon={<Building2 className="h-6 w-6 text-primary" />}
          colorClass="bg-gradient-to-br from-emerald-500/5 to-emerald-600/10"
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    case "cosecha":
      return (
        <ModulePlaceholder
          title="Cosecha"
          description="Registro y control de cosechas"
          icon={<Wheat className="h-6 w-6 text-primary" />}
          colorClass="bg-gradient-to-br from-amber-500/5 to-amber-600/10"
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    case "almacen":
      return (
        <ModulePlaceholder
          title="Almacén"
          description="Control de inventario y almacenamiento"
          icon={<Warehouse className="h-6 w-6 text-primary" />}
          colorClass="bg-gradient-to-br from-purple-500/5 to-purple-600/10"
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    case "transferencias":
      return (
        <ModulePlaceholder
          title="Transferencias"
          description="Movimientos entre unidades de producción"
          icon={<ArrowLeftRight className="h-6 w-6 text-primary" />}
          colorClass="bg-gradient-to-br from-rose-500/5 to-rose-600/10"
          onBack={handleBackToMenu}
          onLogout={handleLogout}
        />
      );

    default:
      return <NotFound />;
  }
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
