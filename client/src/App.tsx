import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotification } from "@/components/UpdateNotification";
import { getStoredRole, getStoredUnidad, logout, isLoggedIn, type UserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { apiRequest } from "@/lib/queryClient";
import { clearGridDefaultsCache } from "@/lib/gridDefaults";
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
import Reportes from "@/pages/Reportes";
import { type ReportFilters } from "@/components/MyFilter";
import MyDebug from "@/pages/MyDebug";
import { ExportProgress } from "@/components/ExportProgress";
import { ImportProgress } from "@/components/ImportProgress";
import { DBFImportProgress } from "@/components/DBFImportProgress";
import { BackupDialogs } from "@/components/BackupDialogs";
import { GridSettingsProvider } from "@/contexts/GridSettingsContext";
import { MyPopProvider } from "@/components/MyPop";
import { MyProgressProvider } from "@/components/MyProgressModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type AppView = "login" | ModuleKey;

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>("parametros");
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    // Al iniciar, excluir módulos que están marcados como externos
    const externalWindows = JSON.parse(localStorage.getItem("external_windows") || "{}");
    const allModules = ["parametros", "administracion", "bancos", "cheques", "cosecha", "almacen", "transferencias", "reportes", "debug"];
    const internalModules = allModules.filter(m => !externalWindows[m]);
    return new Set(internalModules);
  });
  const [moduleZIndex, setModuleZIndex] = useState<Record<string, number>>({ menu: 110 });
  const [topZIndex, setTopZIndex] = useState(110);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });
  const [toolAction, setToolAction] = useState<string | null>(null);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [showDBFImportProgress, setShowDBFImportProgress] = useState(false);
  const [backupAction, setBackupAction] = useState<"backup_salvar" | "backup_cargar" | "backup_eliminar" | null>(null);
  const [reportFilters, setReportFilters] = useState<ReportFilters | undefined>(undefined);
  
  // Escuchar eventos WebSocket para actualizar datos en tiempo real
  useRealtimeSync();

  useEffect(() => {
    const handleOpenReportWithFilters = (e: CustomEvent<ReportFilters>) => {
      setReportFilters(e.detail);
      handleSelectModule("reportes");
    };
    window.addEventListener("openReportWithFilters", handleOpenReportWithFilters as EventListener);
    return () => {
      window.removeEventListener("openReportWithFilters", handleOpenReportWithFilters as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    localStorage.setItem("app_font_size", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const loadPreferencias = async () => {
      try {
        const res = await fetch("/api/preferencias");
        if (res.ok) {
          const prefs = await res.json();
          if (prefs.fontSize && typeof prefs.fontSize === "number") {
            setFontSize(prefs.fontSize);
          }
          if (prefs.gridSettings) {
            Object.entries(prefs.gridSettings).forEach(([key, value]) => {
              localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
            });
          }
          if (prefs.windowPositions) {
            Object.entries(prefs.windowPositions).forEach(([key, value]) => {
              localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
            });
          }
          if (prefs.theme) {
            localStorage.setItem("app-theme", prefs.theme);
            if (prefs.theme === "dark") {
              document.documentElement.classList.add("dark");
            } else if (prefs.theme === "light") {
              document.documentElement.classList.remove("dark");
            }
          }
          if (prefs.colorScheme) {
            localStorage.setItem("app-color-scheme", prefs.colorScheme);
            const root = document.documentElement;
            ["blue", "green", "purple", "orange", "rose", "banesco", "lightblue"].forEach(c => 
              root.classList.remove(`theme-${c}`)
            );
            root.classList.add(`theme-${prefs.colorScheme}`);
          }
        }
      } catch (err) {
        console.log("No se pudieron cargar preferencias:", err);
      }
    };
    loadPreferencias();
  }, []);

  // Escuchar errores para abrir MyDebug automáticamente
  useEffect(() => {
    const handleDebugError = () => {
      setOpenModules(prev => new Set(prev).add("debug"));
      // Traer al frente
      setTopZIndex(prev => {
        const next = prev + 1;
        setModuleZIndex(m => ({ ...m, debug: next }));
        return next;
      });
    };
    window.addEventListener("debugError", handleDebugError);
    return () => window.removeEventListener("debugError", handleDebugError);
  }, []);

  const { toast } = useToast();
  const { showPop } = useMyPop();

  
  
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

  const handleMinimizeAll = () => {
    // Disparar evento para que cada ventana se minimice usando su propia lógica
    window.dispatchEvent(new Event("minimizeAllWindows"));
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
    if (action === "definir_default") {
      const preferencias: Record<string, unknown> = {
        fontSize,
        gridSettings: {},
        windowPositions: {},
        theme: localStorage.getItem("app-theme") || "light",
        colorScheme: localStorage.getItem("app-color-scheme") || "blue",
        savedAt: new Date().toISOString(),
      };
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            if (key.startsWith("mygrid_widths_") || key.startsWith("mygrid_order_")) {
              try {
                (preferencias.gridSettings as Record<string, unknown>)[key] = JSON.parse(value);
              } catch {
                (preferencias.gridSettings as Record<string, unknown>)[key] = value;
              }
            } else if (key.startsWith("window_") || key.startsWith("filtro_")) {
              try {
                (preferencias.windowPositions as Record<string, unknown>)[key] = JSON.parse(value);
              } catch {
                (preferencias.windowPositions as Record<string, unknown>)[key] = value;
              }
            }
          }
        }
      }
      try {
        await apiRequest("POST", "/api/preferencias", preferencias);
        toast({ title: "Preferencias guardadas", description: "La configuración se guardó en preferencias.json" });
      } catch (error) {
        showPop({ title: "Error", message: "No se pudo guardar la configuración." });
      }
      return;
    }
    if (action === "cargar_dbf_global") {
      setShowDBFImportProgress(true);
      return;
    }
    if (action === "backup_salvar" || action === "backup_cargar" || action === "backup_eliminar") {
      setBackupAction(action);
      return;
    }
    setToolAction(action);
  };

  const executeToolAction = async () => {
    if (!toolAction) return;
    
    try {
      if (toolAction === "eliminar_datos") {
        await apiRequest("DELETE", "/api/debug/wipe-all-data");
        toast({ title: "Datos eliminados", description: "Se han borrado todos los registros. Recargando..." });
        setTimeout(() => window.location.reload(), 500);
      } else {
        toast({ title: "Acción completada", description: `Se ejecutó: ${toolAction}` });
      }
    } catch (error) {
      showPop({ title: "Error", message: "No se pudo realizar la acción." });
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
            onOpenAdministracion={(bancoId, monto, montoDolares, nombreBanco, descripcion, operacion, comprobante) => {
              window.dispatchEvent(new CustomEvent("setAdminBancoId", { detail: { bancoId, monto, montoDolares, nombreBanco, descripcion, operacion, comprobante } }));
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
        {openModules.has("reportes") && (
          <Reportes
            onBack={() => { handleCloseModule("reportes"); setReportFilters(undefined); }}
            onLogout={handleLogout}
            onFocus={() => bringToFront("reportes")}
            zIndex={moduleZIndex["reportes"] || 100}
            minimizedIndex={7}
            externalFilters={reportFilters}
          />
        )}
        {openModules.has("debug") && (
          <MyDebug
            onClose={() => handleCloseModule("debug")}
            onFocus={() => bringToFront("debug")}
            zIndex={moduleZIndex["debug"] || 100}
            minimizedIndex={8}
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
        onMinimizeAll={handleMinimizeAll}
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

      <DBFImportProgress 
        open={showDBFImportProgress} 
        onClose={() => setShowDBFImportProgress(false)}
        onSuccess={() => {
          toast({ title: "Importación DBF completada", description: "Recargando datos..." });
          setTimeout(() => window.location.reload(), 500);
        }}
      />

      <BackupDialogs 
        action={backupAction}
        onClose={() => setBackupAction(null)}
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

function StandaloneWrapper({ children }: { children: React.ReactNode }) {
  const [fontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });
  
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);
  
  // Verificar autenticación
  if (!isLoggedIn(getStoredRole())) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Sesión no válida</p>
          <p className="text-muted-foreground">Por favor inicie sesión primero</p>
          <a href="/" className="text-foreground underline">Ir a la aplicación principal</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-background p-2">
      {children}
    </div>
  );
}

function StandaloneMenu() {
  const { toast } = useToast();
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    localStorage.setItem("app_font_size", fontSize.toString());
  }, [fontSize]);

  const handleSelectModule = (module: ModuleKey) => {
    // Abrir el módulo en una nueva ventana standalone
    const url = `/standalone/${module}`;
    const newWindow = window.open(url, `${module}_popout`, 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,noopener,noreferrer');
    if (newWindow) newWindow.opener = null;
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleToolAction = (action: string) => {
    toast({ title: "Acción", description: `La acción "${action}" no está disponible en modo standalone.` });
  };

  return (
    <FloatingMenu
      onSelectModule={handleSelectModule}
      onLogout={handleLogout}
      currentModule={null}
      onToolAction={handleToolAction}
      fontSize={fontSize}
      onFontSizeChange={setFontSize}
      isStandalone
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MainApp} />
      <Route path="/standalone/parametros">
        <StandaloneWrapper><Parametros isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/administracion">
        <StandaloneWrapper><Administracion isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/bancos">
        <StandaloneWrapper><Bancos isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/almacen">
        <StandaloneWrapper><Almacen isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/cosecha">
        <StandaloneWrapper><Cosecha isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/cheques">
        <StandaloneWrapper><Cheques isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/transferencias">
        <StandaloneWrapper><Transferencias isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/reportes">
        <StandaloneWrapper><Reportes isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/menu">
        <StandaloneWrapper><StandaloneMenu /></StandaloneWrapper>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GridSettingsProvider>
          <MyPopProvider>
            <MyProgressProvider>
              <Toaster />
              <UpdateNotification />
              <Router />
            </MyProgressProvider>
          </MyPopProvider>
        </GridSettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
