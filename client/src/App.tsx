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
import { apiRequest } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import Guia from "@/pages/Guia";
import LoginPage from "@/pages/Login";
import FloatingMenu, { type ModuleKey } from "@/components/FloatingMenu";
import ArrimeMenu, { type ArrimeSubModule } from "@/pages/ArrimeMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ModulePlaceholder from "@/pages/ModulePlaceholder";
import Home from "@/pages/Home";
import Finanza from "@/pages/Finanza";
import Parametros from "@/pages/Parametros";
import Administracion from "@/pages/Administracion";
import { Settings, Building2, Warehouse, Wheat, ArrowLeftRight } from "lucide-react";

type AppView = "login" | "arrime-menu" | ModuleKey | "arrime-page" | "finanza-page";

function RealtimeSyncProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
  useRealtimeSync();
  return <>{children}</>;
}

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>("login");
  const [toolAction, setToolAction] = useState<string | null>(null);
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
      setCurrentView("parametros");
    }
  }, []);

  const handleLogin = (role: UserRole, selectedUnidadId: string) => {
    setUserRole(role);
    setUnidadId(selectedUnidadId);
    setCurrentView("parametros");
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

  const getCurrentModule = (): ModuleKey | null => {
    if (["parametros", "administracion", "cosecha", "almacen", "transferencias"].includes(currentView)) {
      return currentView as ModuleKey;
    }
    if (currentView === "arrime-menu" || currentView === "arrime-page" || currentView === "finanza-page") {
      return "arrime";
    }
    return null;
  };

  const renderContent = () => {
    switch (currentView) {
      case "arrime-menu":
        return (
          <ArrimeMenu 
            onSelectSubModule={handleSelectArrimeSubModule}
            onBack={() => {}}
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
          <Parametros
            onBack={() => {}}
            onLogout={handleLogout}
          />
        );

      case "administracion":
        return (
          <Administracion
            onBack={() => {}}
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
            onBack={() => {}}
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
            onBack={() => {}}
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
            onBack={() => {}}
            onLogout={handleLogout}
          />
        );

      default:
        return <NotFound />;
    }
  };

  const handleToolAction = (action: string) => {
    setToolAction(action);
  };

  const executeToolAction = async () => {
    if (!toolAction) return;
    
    try {
      if (toolAction === "eliminar_datos") {
        await apiRequest("DELETE", "/api/debug/wipe-all-data");
        toast({ title: "Datos eliminados", description: "Se han borrado todos los registros." });
        queryClient.invalidateQueries();
      } else {
        toast({ title: "Acción completada", description: `Se ejecutó: ${toolAction}` });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo realizar la acción.", variant: "destructive" });
    } finally {
      setToolAction(null);
    }
  };

  return (
    <>
      <FloatingMenu 
        onSelectModule={handleSelectModule}
        onLogout={handleLogout}
        currentModule={getCurrentModule()}
        onToolAction={handleToolAction}
      />
      {renderContent()}

      <AlertDialog open={!!toolAction} onOpenChange={(open) => !open && setToolAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción ({toolAction?.replace("_", " ")}) no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeToolAction} className={toolAction === "eliminar_datos" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
