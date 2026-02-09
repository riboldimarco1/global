import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotification } from "@/components/UpdateNotification";
import { getStoredRole, getStoredUnidad, getStoredUsername, setStoredPermissions, logout, isLoggedIn, hasMenuAccess, type UserRole } from "@/lib/auth";
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
import Arrime from "@/pages/Arrime";
import Cheques from "@/pages/Cheques";
import Transferencias from "@/pages/Transferencias";
import Agrodata from "@/pages/Agrodata";
import Reportes from "@/pages/Reportes";
import { type ReportFilters } from "@/components/MyFilter";
import MyDebug from "@/pages/MyDebug";
import { DBFImportProgress } from "@/components/DBFImportProgress";
import { GridSettingsProvider } from "@/contexts/GridSettingsContext";
import { GridPreferencesProvider, useGridPreferences } from "@/contexts/GridPreferencesContext";
import { StyleModeProvider } from "@/contexts/StyleModeContext";
import { UserDefaultsProvider } from "@/contexts/UserDefaultsContext";
import { MyPopProvider } from "@/components/MyPop";
import { MyProgressProvider } from "@/components/MyProgressModal";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

type AppView = "login" | ModuleKey;

function MainApp() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [unidadId, setUnidadId] = useState<string>(() => getStoredUnidad());
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem("app_current_view");
    return (saved as AppView) || "parametros";
  });
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const isAdmin = getStoredUsername().toLowerCase() === "admin";
    const filterByAccess = (modules: string[]) => modules.filter(m => {
      if (m === "debug") return isAdmin;
      return hasMenuAccess(m);
    });
    
    const saved = localStorage.getItem("app_open_modules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return new Set(filterByAccess(parsed));
        }
      } catch (e) {}
    }
    const externalWindows = JSON.parse(localStorage.getItem("external_windows") || "{}");
    const allModules = ["parametros", "administracion", "bancos", "cheques", "cosecha", "almacen", "transferencias", "arrime", "agrodata", "reportes", "debug"];
    const internalModules = filterByAccess(allModules).filter(m => !externalWindows[m]);
    return new Set(internalModules);
  });
  const [moduleZIndex, setModuleZIndex] = useState<Record<string, number>>({ menu: 110 });
  const [topZIndex, setTopZIndex] = useState(110);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });
  
  const [toolAction, setToolAction] = useState<string | null>(null);
  const [showDBFImportProgress, setShowDBFImportProgress] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters | undefined>(undefined);
  
  const { flushAll: flushGridPreferences } = useGridPreferences();

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
    localStorage.setItem("app_current_view", currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem("app_open_modules", JSON.stringify(Array.from(openModules)));
  }, [openModules]);

  useEffect(() => {
    const refreshPermissions = async () => {
      const username = getStoredUsername();
      if (!username || !isLoggedIn(userRole)) return;
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(username)}`);
        if (res.ok) {
          const perms = await res.json();
          setStoredPermissions(perms);
        }
      } catch (e) {
      }
    };
    refreshPermissions();
  }, [userRole]);

  useEffect(() => {
    const loadPreferencias = async () => {
      try {
        const res = await fetch("/api/preferencias");
        if (res.ok) {
          const prefs = await res.json();
          if (prefs.fontSize && typeof prefs.fontSize === "number") {
            setFontSize(prefs.fontSize);
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

  // Mostrar toast si el service worker borró la caché
  useEffect(() => {
    if (sessionStorage.getItem("sw_cache_cleared") === "true") {
      sessionStorage.removeItem("sw_cache_cleared");
      toast({ title: "Aplicación actualizada", description: "Se ha actualizado la caché de la aplicación." });
    }
  }, []);
  
  const handleLogin = async (role: UserRole, selectedUnidadId: string) => {
    setUserRole(role);
    setUnidadId(selectedUnidadId);
    
    // Cargar configuración guardada del usuario
    const username = getStoredUsername();
    if (username) {
      try {
        const response = await fetch(`/api/defaults/${encodeURIComponent(username)}`, {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.valores && Object.keys(data.valores).length > 0) {
            // Restaurar todo el localStorage
            Object.entries(data.valores).forEach(([key, value]) => {
              localStorage.setItem(key, value as string);
            });
            
            // Aplicar valores al estado
            const savedModulesStr = localStorage.getItem("app_open_modules");
            if (savedModulesStr) {
              try {
                const savedModules = JSON.parse(savedModulesStr);
                if (Array.isArray(savedModules) && savedModules.length > 0) {
                  const isAdminUser = getStoredUsername().toLowerCase() === "admin";
                  const filtered = (savedModules as string[]).filter(m => {
                    if (m === "debug") return isAdminUser;
                    return hasMenuAccess(m);
                  });
                  setOpenModules(new Set(filtered as ModuleKey[]));
                }
              } catch (e) {}
            }
            
            const savedView = localStorage.getItem("app_current_view");
            if (savedView) {
              setCurrentView(savedView as AppView);
            } else {
              setCurrentView("parametros");
            }
            
            const savedFontSizeStr = localStorage.getItem("app_font_size");
            if (savedFontSizeStr) {
              setFontSize(parseInt(savedFontSizeStr));
            }
            
            // Aplicar tema
            const savedTheme = localStorage.getItem("app-theme");
            if (savedTheme === "dark") {
              document.documentElement.classList.add("dark");
            } else if (savedTheme === "light") {
              document.documentElement.classList.remove("dark");
            }
            
            // Aplicar color scheme
            const savedColorScheme = localStorage.getItem("app-color-scheme");
            if (savedColorScheme) {
              const root = document.documentElement;
              ["blue", "green", "purple", "orange", "rose", "banesco", "lightblue"].forEach(c => 
                root.classList.remove(`theme-${c}`)
              );
              root.classList.add(`theme-${savedColorScheme}`);
            }
            return;
          }
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    }
    setCurrentView("parametros");
  };

  const handleLogout = async () => {
    const username = getStoredUsername();
    console.log("[LOGOUT] username:", username);
    if (username) {
      try {
        const allLocalStorage: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            allLocalStorage[key] = localStorage.getItem(key) || "";
          }
        }
        const payload = {
          valores: allLocalStorage
        };
        console.log("[LOGOUT] Enviando payload:", JSON.stringify(payload));
        const response = await fetch(`/api/defaults/${encodeURIComponent(username)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("[LOGOUT] Response status:", response.status);
        const data = await response.json();
        console.log("[LOGOUT] Response data:", data);
      } catch (error) {
        console.error("Error guardando configuración:", error);
      }
    } else {
      console.log("[LOGOUT] No username found, skipping save");
    }
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
    if (action === "borrar_cache") {
      localStorage.clear();
      toast({ title: "Caché borrada", description: "Se ha limpiado la caché local. Reiniciando..." });
      setTimeout(() => window.location.reload(), 500);
      return;
    }
    if (action === "definir_default") {
      const preferencias: Record<string, unknown> = {
        fontSize,
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
            if (key.startsWith("window_") || key.startsWith("filtro_")) {
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
        await flushGridPreferences();
        await apiRequest("POST", "/api/preferencias", preferencias);
        toast({ title: "Preferencias guardadas", description: "La configuración se guardó correctamente" });
      } catch (error) {
        showPop({ title: "Error", message: "No se pudo guardar la configuración." });
      }
      return;
    }
    if (action === "backup_salvar") {
      toast({ title: "Creando respaldo...", description: "Exportando tablas de la base de datos..." });
      try {
        const res = await apiRequest("POST", "/api/backup");
        const data = await res.json();
        toast({
          title: "Respaldo creado",
          description: `Se respaldaron ${data.tables} tablas en ${data.filename}`,
        });
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        showPop({ title: "Error", message: "No se pudo crear el respaldo." });
      }
      return;
    }
    if (action === "cargar_dbf_global") {
      setShowDBFImportProgress(true);
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
        {openModules.has("arrime") && (
          <Arrime
            onBack={() => handleCloseModule("arrime")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("arrime")}
            zIndex={moduleZIndex["arrime"] || 100}
            minimizedIndex={7}
          />
        )}
        {openModules.has("agrodata") && (
          <Agrodata
            onBack={() => handleCloseModule("agrodata")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("agrodata")}
            zIndex={moduleZIndex["agrodata"] || 100}
            minimizedIndex={9}
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

      <div
        id="taskbar"
        className="fixed bottom-0 left-0 right-0 flex flex-row items-center gap-1 px-2 py-1 bg-muted/80 backdrop-blur-sm border-t border-border empty:hidden"
        style={{ zIndex: 9999 }}
        data-testid="taskbar"
      />

      <DBFImportProgress 
        open={showDBFImportProgress} 
        onClose={() => setShowDBFImportProgress(false)}
        onSuccess={() => {
          toast({ title: "Importación DBF completada", description: "Recargando datos..." });
          setTimeout(() => window.location.reload(), 500);
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
      <Route path="/standalone/arrime">
        <StandaloneWrapper><Arrime isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/cheques">
        <StandaloneWrapper><Cheques isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/transferencias">
        <StandaloneWrapper><Transferencias isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/agrodata">
        <StandaloneWrapper><Agrodata isStandalone /></StandaloneWrapper>
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
        <UserDefaultsProvider>
          <StyleModeProvider>
            <GridSettingsProvider>
              <GridPreferencesProvider>
                <MyPopProvider>
                  <MyProgressProvider>
                    <Toaster />
                    <UpdateNotification />
                    <Router />
                  </MyProgressProvider>
                </MyPopProvider>
              </GridPreferencesProvider>
            </GridSettingsProvider>
          </StyleModeProvider>
        </UserDefaultsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
