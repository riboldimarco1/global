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
import Parametros1 from "@/pages/Parametros1";
import Administracion from "@/pages/Administracion";
import Bancos from "@/pages/Bancos";
import Almacen from "@/pages/Almacen";
import Cosecha from "@/pages/Cosecha";
import Cheques from "@/pages/Cheques";
import Transferencias from "@/pages/Transferencias";
import { Settings, Building2, Warehouse, Wheat, ArrowLeftRight, Landmark, FileText } from "lucide-react";
import { ExportProgress } from "@/components/ExportProgress";
import { ImportProgress } from "@/components/ImportProgress";
import { ParametrosProvider } from "@/contexts/ParametrosContext";

type AppView = "login" | "arrime-menu" | ModuleKey | "arrime-page" | "finanza-page";

function RealtimeSyncProvider({ children }: { children: JSX.Element | JSX.Element[] }) {
  useRealtimeSync();
  return <>{children}</>;
}

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>("login");
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [moduleZIndex, setModuleZIndex] = useState<Record<string, number>>({ menu: 110 });
  const [topZIndex, setTopZIndex] = useState(110);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });
  const [toolAction, setToolAction] = useState<string | null>(null);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    localStorage.setItem("app_font_size", fontSize.toString());
  }, [fontSize]);
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
      setCurrentView("parametros1");
    }
  }, []);

  const handleLogin = (role: UserRole, selectedUnidadId: string) => {
    setUserRole(role);
    setUnidadId(selectedUnidadId);
    setCurrentView("parametros1");
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
      setOpenModules(prev => new Set(prev).add(module));
      bringToFront(module);
    }
  };

  const handleCloseModule = (module: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.delete(module);
      return next;
    });
  };

  const handleCloseAllWindows = () => {
    setOpenModules(new Set());
  };

  const bringToFront = (module: string) => {
    setTopZIndex(prev => {
      const next = prev + 1;
      setModuleZIndex(m => ({ ...m, [module]: next }));
      return next;
    });
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
    if (["parametros1", "administracion", "bancos", "cheques", "cosecha", "almacen", "transferencias"].includes(currentView)) {
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

      case "parametros1":
        return null;

      case "administracion":
        return null;

      case "bancos":
        return null;

      case "cheques":
        return null;

      case "cosecha":
        return null;

      case "almacen":
        return null;

      case "transferencias":
        return null;

      default:
        return <NotFound />;
    }
  };

  const handleToolAction = async (action: string) => {
    if (action === "exportar_datos") {
      setShowExportProgress(true);
      return;
    }
    if (action === "importar_datos") {
      setShowImportProgress(true);
      return;
    }
    if (action === "borrar_cache") {
      localStorage.clear();
      toast({ title: "Caché borrada", description: "Se ha limpiado la caché local correctamente" });
      return;
    }
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

  const renderOpenModules = () => {
    return (
      <>
        {openModules.has("parametros1") && (
          <Parametros1
            onBack={() => handleCloseModule("parametros1")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("parametros1")}
            zIndex={moduleZIndex["parametros1"] || 100}
          />
        )}
        {openModules.has("administracion") && (
          <Administracion
            onBack={() => handleCloseModule("administracion")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("administracion")}
            zIndex={moduleZIndex["administracion"] || 100}
          />
        )}
        {openModules.has("bancos") && (
          <Bancos
            onBack={() => handleCloseModule("bancos")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("bancos")}
            zIndex={moduleZIndex["bancos"] || 100}
          />
        )}
        {openModules.has("cheques") && (
          <Cheques
            onBack={() => handleCloseModule("cheques")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("cheques")}
            zIndex={moduleZIndex["cheques"] || 100}
          />
        )}
        {openModules.has("transferencias") && (
          <Transferencias
            onBack={() => handleCloseModule("transferencias")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("transferencias")}
            zIndex={moduleZIndex["transferencias"] || 100}
          />
        )}
        {openModules.has("cosecha") && (
          <Cosecha
            onBack={() => handleCloseModule("cosecha")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("cosecha")}
            zIndex={moduleZIndex["cosecha"] || 100}
          />
        )}
        {openModules.has("almacen") && (
          <Almacen
            onBack={() => handleCloseModule("almacen")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("almacen")}
            zIndex={moduleZIndex["almacen"] || 100}
          />
        )}
      </>
    );
  };

  return (
    <>
      <FloatingMenu 
        onSelectModule={handleSelectModule}
        onLogout={handleLogout}
        currentModule={getCurrentModule()}
        onToolAction={handleToolAction}
        onFocus={() => bringToFront("menu")}
        zIndex={moduleZIndex["menu"] || 110}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onCloseAllWindows={handleCloseAllWindows}
      />
      {renderContent()}
      {renderOpenModules()}

      <ExportProgress 
        open={showExportProgress} 
        onClose={() => setShowExportProgress(false)} 
      />

      <ImportProgress 
        open={showImportProgress} 
        onClose={() => setShowImportProgress(false)}
        onSuccess={() => {
          queryClient.invalidateQueries();
          toast({ title: "Importación completada", description: "Los datos se han importado correctamente." });
        }}
      />

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
        <ParametrosProvider>
          <RealtimeSyncProvider>
            <Toaster />
            <UpdateNotification />
            <Router />
          </RealtimeSyncProvider>
        </ParametrosProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
