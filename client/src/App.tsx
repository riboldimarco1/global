import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotification } from "@/components/UpdateNotification";
import { getStoredRole, getStoredUnidad, logout, isLoggedIn, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/Login";
import FloatingMenu, { type ModuleKey } from "@/components/FloatingMenu";
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
import Parametros from "@/pages/Parametros";
import Administracion from "@/pages/Administracion";
import Bancos from "@/pages/Bancos";
import Almacen from "@/pages/Almacen";
import Cosecha from "@/pages/Cosecha";
import Cheques from "@/pages/Cheques";
import Transferencias from "@/pages/Transferencias";
import Debug from "@/pages/Debug";
import { ExportProgress } from "@/components/ExportProgress";
import { ImportProgress } from "@/components/ImportProgress";
import { DebugProvider } from "@/contexts/DebugContext";

type AppView = "login" | ModuleKey;

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>("parametros");
  const [openModules, setOpenModules] = useState<Set<string>>(new Set([
    "parametros", "administracion", "bancos", "cheques", "cosecha", "almacen", "transferencias"
  ]));
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
    const handleBringToFrontEvent = (e: CustomEvent<{ module: string }>) => {
      const module = e.detail.module as ModuleKey;
      const minimizedIcon = document.querySelector(`[data-testid="minimized-icon-${module}"]`) as HTMLElement;
      if (minimizedIcon) {
        minimizedIcon.click();
      }
      setOpenModules(prev => new Set(prev).add(module));
      setTopZIndex(prev => {
        const next = prev + 1;
        setModuleZIndex(m => ({ ...m, [module]: next }));
        return next;
      });
    };
    window.addEventListener("bringToFront", handleBringToFrontEvent as EventListener);
    return () => window.removeEventListener("bringToFront", handleBringToFrontEvent as EventListener);
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
    // Si el módulo ya está abierto, buscar el icono minimizado y hacer clic en él
    const minimizedIcon = document.querySelector(`[data-testid="minimized-icon-${module}"]`) as HTMLElement;
    if (minimizedIcon) {
      minimizedIcon.click();
    } else {
      // Si no está minimizado o no está abierto, abrir normalmente
      setCurrentView(module);
      setOpenModules(prev => new Set(prev).add(module));
    }
    bringToFront(module);
  };

  const handleCloseModule = (module: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.delete(module);
      return next;
    });
  };

  const bringToFront = (module: string) => {
    setTopZIndex(prev => {
      const next = prev + 1;
      setModuleZIndex(m => ({ ...m, [module]: next }));
      return next;
    });
  };

  if (!isLoggedIn(userRole) || currentView === "login") {
    return <LoginPage onLogin={handleLogin} />;
  }

  const getCurrentModule = (): ModuleKey | null => {
    if (["parametros", "administracion", "bancos", "cheques", "cosecha", "almacen", "transferencias"].includes(currentView)) {
      return currentView as ModuleKey;
    }
    return null;
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
      toast({ title: "Caché borrada", description: "Se ha limpiado la caché local. Reiniciando..." });
      setTimeout(() => window.location.reload(), 500);
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
        {openModules.has("parametros") && (
          <Parametros
            onBack={() => handleCloseModule("parametros")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("parametros")}
            zIndex={moduleZIndex["parametros"] || 100}
            minimizedIndex={0}
          />
        )}
        {openModules.has("administracion") && (
          <Administracion
            onBack={() => handleCloseModule("administracion")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("administracion")}
            zIndex={moduleZIndex["administracion"] || 100}
            minimizedIndex={1}
          />
        )}
        {openModules.has("bancos") && (
          <Bancos
            onBack={() => handleCloseModule("bancos")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("bancos")}
            zIndex={moduleZIndex["bancos"] || 100}
            minimizedIndex={2}
            onOpenAdministracion={(bancoId, monto, montoDolares) => {
              window.dispatchEvent(new CustomEvent("setAdminBancoId", { detail: { bancoId, monto, montoDolares } }));
              const minimizedIcon = document.querySelector('[data-testid="minimized-icon-administracion"]') as HTMLElement;
              if (minimizedIcon) {
                minimizedIcon.click();
              } else {
                handleSelectModule("administracion");
              }
              bringToFront("administracion");
            }}
          />
        )}
        {openModules.has("cheques") && (
          <Cheques
            onBack={() => handleCloseModule("cheques")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("cheques")}
            zIndex={moduleZIndex["cheques"] || 100}
            minimizedIndex={3}
          />
        )}
        {openModules.has("transferencias") && (
          <Transferencias
            onBack={() => handleCloseModule("transferencias")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("transferencias")}
            zIndex={moduleZIndex["transferencias"] || 100}
            minimizedIndex={4}
          />
        )}
        {openModules.has("cosecha") && (
          <Cosecha
            onBack={() => handleCloseModule("cosecha")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("cosecha")}
            zIndex={moduleZIndex["cosecha"] || 100}
            minimizedIndex={5}
          />
        )}
        {openModules.has("almacen") && (
          <Almacen
            onBack={() => handleCloseModule("almacen")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("almacen")}
            zIndex={moduleZIndex["almacen"] || 100}
            minimizedIndex={6}
          />
        )}
        {openModules.has("debug") && (
          <Debug
            onClose={() => handleCloseModule("debug")}
            onFocus={() => bringToFront("debug")}
            zIndex={moduleZIndex["debug"] || 100}
            openModules={openModules}
            minimizedIndex={7}
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
      />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DebugProvider>
          <Toaster />
          <UpdateNotification />
          <Router />
        </DebugProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
