import { useState, useEffect, useCallback } from "react";
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
import { menuModules } from "@/config/menuModules";
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

import Transferencias from "@/pages/Transferencias";
import Agrodata from "@/pages/Agrodata";
import Agronomia from "@/pages/Agronomia";
import Reparaciones from "@/pages/Reparaciones";
import Bitacora from "@/pages/Bitacora";
import Reportes from "@/pages/Reportes";
import { type ReportFilters } from "@/components/MyFilter";
import MyDebug from "@/pages/MyDebug";
import { DBFImportProgress } from "@/components/DBFImportProgress";
import { DireccionesDBFImportProgress } from "@/components/DireccionesDBFImportProgress";
import GridBancosImportDialog from "@/components/GridBancosImportDialog";
import ExcelMergeDialog from "@/components/ExcelMergeDialog";
import ExcelSummaryDialog from "@/components/ExcelSummaryDialog";
import DocxSummaryDialog from "@/components/DocxSummaryDialog";
import DocxZafraSummaryDialog from "@/components/DocxZafraSummaryDialog";
import { BackupRestore } from "@/components/BackupRestore";
import { BackupDelete } from "@/components/BackupDelete";
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
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [moduleZIndex, setModuleZIndex] = useState<Record<string, number>>({ menu: 110 });
  const [topZIndex, setTopZIndex] = useState(110);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });
  
  const [pendingBancosRelation, setPendingBancosRelation] = useState<{ adminId: string; monto?: number; montoDolares?: number; descripcion?: string; fecha?: string } | null>(null);
  const [pendingAdminRelation, setPendingAdminRelation] = useState<{ bancoId: string; monto?: number; montoDolares?: number; nombreBanco?: string; descripcion?: string; fecha?: string } | null>(null);
  const [toolAction, setToolAction] = useState<string | null>(null);
  const [showDBFImportProgress, setShowDBFImportProgress] = useState(false);
  const [showDireccionesImport, setShowDireccionesImport] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showBackupDelete, setShowBackupDelete] = useState(false);
  const [showGridBancosImport, setShowGridBancosImport] = useState(false);
  const [showExcelMerge, setShowExcelMerge] = useState(false);
  const [showExcelSummary, setShowExcelSummary] = useState(false);
  const [showDocxSummary, setShowDocxSummary] = useState(false);
  const [showDocxZafra, setShowDocxZafra] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilters | undefined>(undefined);
  
  const { flushAll: flushGridPreferences } = useGridPreferences();

  useRealtimeSync();

  useEffect(() => {
    const handleServerError = (e: CustomEvent<{ message: string; stack?: string }>) => {
      toast({
        variant: "destructive",
        title: "Error en el servidor",
        description: e.detail?.message || "Error desconocido",
        duration: 10000,
      });
    };
    window.addEventListener("server:error", handleServerError as EventListener);

    const handleOpenReportWithFilters = (e: CustomEvent<ReportFilters>) => {
      setReportFilters(e.detail);
      handleSelectModule("reportes");
    };
    window.addEventListener("openReportWithFilters", handleOpenReportWithFilters as EventListener);

    const handleOpenModule = (e: CustomEvent<{ module: string }>) => {
      handleSelectModule(e.detail.module as ModuleKey);
    };
    window.addEventListener("openModule", handleOpenModule as EventListener);

    return () => {
      window.removeEventListener("server:error", handleServerError as EventListener);
      window.removeEventListener("openReportWithFilters", handleOpenReportWithFilters as EventListener);
      window.removeEventListener("openModule", handleOpenModule as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
    localStorage.setItem("app_font_size", fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const stateKey = "main_window_state";
    const stored = localStorage.getItem(stateKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.x != null && parsed.y != null) {
          window.moveTo(parsed.x, parsed.y);
        }
        if (parsed.width && parsed.height) {
          window.resizeTo(parsed.width, parsed.height);
        }
      } catch (e) {}
    }

    const saveState = () => {
      const state = {
        x: window.screenX,
        y: window.screenY,
        width: window.outerWidth,
        height: window.outerHeight,
      };
      localStorage.setItem(stateKey, JSON.stringify(state));
    };

    window.addEventListener("resize", saveState);
    window.addEventListener("beforeunload", saveState);
    const moveInterval = setInterval(saveState, 2000);

    return () => {
      window.removeEventListener("resize", saveState);
      window.removeEventListener("beforeunload", saveState);
      clearInterval(moveInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("app_current_view", currentView);
  }, [currentView]);

  useEffect(() => {
    const nonMinimized = Array.from(openModules).filter(m => {
      try {
        const ws = localStorage.getItem(`window_state_${m}`);
        if (ws) {
          const parsed = JSON.parse(ws);
          if (parsed.isMinimized) return false;
        }
      } catch (e) {}
      return true;
    });
    localStorage.setItem("app_open_modules", JSON.stringify(nonMinimized));
  }, [openModules]);

  useEffect(() => {
    const refreshPermissions = async () => {
      const username = getStoredUsername();
      if (!username || !isLoggedIn(userRole)) return;
      if (username.toLowerCase() === "admin") {
        setStoredPermissions(null);
        return;
      }
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
            const skipKeys = ["auth_timestamp", "user_role"];
            Object.entries(data.valores).forEach(([key, value]) => {
              if (!skipKeys.includes(key)) {
                localStorage.setItem(key, value as string);
              }
            });
            
            const previouslyOpen = new Set<string>();
            const savedModulesStr = localStorage.getItem("app_open_modules");
            if (savedModulesStr) {
              try {
                const savedModules = JSON.parse(savedModulesStr);
                if (Array.isArray(savedModules)) {
                  savedModules.forEach(m => previouslyOpen.add(m));
                }
              } catch (e) {}
            }

            const allPermittedModules = menuModules
              .filter(mod => hasMenuAccess(mod.id))
              .map(mod => mod.id);

            allPermittedModules.forEach(modId => {
              const existingState = localStorage.getItem(`window_state_${modId}`);
              if (previouslyOpen.has(modId)) {
                if (!existingState) {
                  const visibleDefault = {
                    position: { x: 200, y: 100 },
                    size: { width: 1000, height: 600 },
                    isMinimized: false,
                    isMaximized: false,
                    prevState: { position: { x: 200, y: 100 }, size: { width: 1000, height: 600 } }
                  };
                  localStorage.setItem(`window_state_${modId}`, JSON.stringify(visibleDefault));
                }
              } else {
                const minimizedDefault = {
                  position: existingState ? JSON.parse(existingState).position || { x: 200, y: 100 } : { x: 200, y: 100 },
                  size: existingState ? JSON.parse(existingState).size || { width: 1000, height: 600 } : { width: 1000, height: 600 },
                  isMinimized: true,
                  isMaximized: false,
                  prevState: existingState ? JSON.parse(existingState).prevState || { position: { x: 200, y: 100 }, size: { width: 1000, height: 600 } } : { position: { x: 200, y: 100 }, size: { width: 1000, height: 600 } }
                };
                localStorage.setItem(`window_state_${modId}`, JSON.stringify(minimizedDefault));
              }
            });

            localStorage.setItem("app_open_modules", JSON.stringify(allPermittedModules));
            setOpenModules(new Set(allPermittedModules as ModuleKey[]));
            
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
    const allPermitted = menuModules
      .filter(mod => hasMenuAccess(mod.id))
      .map(mod => mod.id);
    allPermitted.forEach(modId => {
      const defaultState = {
        position: { x: 200, y: 100 },
        size: { width: 1000, height: 600 },
        isMinimized: true,
        isMaximized: false,
        prevState: { position: { x: 200, y: 100 }, size: { width: 1000, height: 600 } }
      };
      localStorage.setItem(`window_state_${modId}`, JSON.stringify(defaultState));
    });
    localStorage.setItem("app_open_modules", JSON.stringify(allPermitted));
    setOpenModules(new Set(allPermitted as ModuleKey[]));
    setCurrentView("parametros");
  };

  const handleLogout = async () => {
    const username = getStoredUsername();
    console.log("[LOGOUT] username:", username);
    if (username) {
      try {
        const nonMinimizedModules = Array.from(openModules).filter(m => {
          try {
            const windowState = localStorage.getItem(`window_state_${m}`);
            if (windowState) {
              const parsed = JSON.parse(windowState);
              return !parsed.isMinimized;
            }
          } catch (e) {}
          return true;
        });
        localStorage.setItem("app_open_modules", JSON.stringify(nonMinimizedModules));

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
    const stateKey = `window_state_${module}`;
    const existing = localStorage.getItem(stateKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      parsed.isMinimized = false;
      localStorage.setItem(stateKey, JSON.stringify(parsed));
    } else {
      localStorage.setItem(stateKey, JSON.stringify({
        position: { x: 200, y: 100 },
        size: { width: 1000, height: 600 },
        isMinimized: false,
        isMaximized: false,
        prevState: { position: { x: 200, y: 100 }, size: { width: 1000, height: 600 } }
      }));
    }
    setOpenModules(prev => new Set(prev).add(module));
    bringToFront(module);
    window.dispatchEvent(new CustomEvent("restoreWindow", { detail: { module } }));
  };

  const handleCloseModule = useCallback((module: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.delete(module);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleCloseModuleEvent = (e: CustomEvent<{ module: string }>) => {
      handleCloseModule(e.detail.module);
    };
    window.addEventListener("closeModule", handleCloseModuleEvent as EventListener);
    return () => window.removeEventListener("closeModule", handleCloseModuleEvent as EventListener);
  }, [handleCloseModule]);

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
    if (["parametros", "administracion", "bancos", "cosecha", "almacen", "transferencias"].includes(currentView)) {
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
      showPop({ title: "Respaldo", message: "Exportando tablas de la base de datos..." });
      try {
        const res = await apiRequest("POST", "/api/backup");
        const data = await res.json();
        showPop({ title: "Respaldo creado", message: `Se respaldaron ${data.tables} tablas en ${data.filename}` });
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
    if (action === "backup_cargar") {
      setShowBackupRestore(true);
      return;
    }
    if (action === "backup_eliminar") {
      setShowBackupDelete(true);
      return;
    }
    if (action === "cargar_dbf_global") {
      setShowDBFImportProgress(true);
      return;
    }
    if (action === "recalcular_saldos") {
      toast({ title: "Recalculando saldos...", description: "Por favor espere, esto puede tardar unos segundos." });
      try {
        const res = await fetch("/api/bancos/recalcular-todos-saldos");
        const data = await res.json();
        if (data.ok) {
          toast({ title: "Saldos recalculados", description: `${data.bancos} bancos, ${data.registros} registros actualizados.` });
          queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
        } else {
          toast({ title: "Error", description: data.error || "No se pudo recalcular.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
      }
      return;
    }
    if (action === "minusculas_arrime") {
      toast({ title: "Convirtiendo a minúsculas...", description: "Por favor espere, esto puede tardar unos segundos." });
      try {
        const res = await fetch("/api/arrime/lowercase", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          toast({ title: "Conversión completada", description: `${data.updated} registros convertidos a minúsculas.` });
          queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
        } else {
          toast({ title: "Error", description: data.error || "No se pudo convertir.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
      }
      return;
    }
    if (action === "limpiar_horas_fecha") {
      toast({ title: "Limpiando horas de fechas...", description: "Por favor espere, esto puede tardar unos segundos." });
      try {
        const res = await fetch("/api/herramientas/limpiar-horas-fecha", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          const detalle = data.tablas.filter((t: any) => t.updated > 0).map((t: any) => `${t.tabla}: ${t.updated}`).join(", ");
          toast({ title: "Horas eliminadas", description: `${data.totalUpdated} registros actualizados.${detalle ? " " + detalle : ""}` });
          const tablas = ["bancos", "administracion", "cosecha", "almacen", "transferencias", "arrime", "agronomia", "reparaciones", "bitacora"];
          tablas.forEach(t => queryClient.invalidateQueries({ queryKey: [`/api/${t}`] }));
        } else {
          toast({ title: "Error", description: data.error || "No se pudo limpiar.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
      }
      return;
    }
    if (action === "migrar_proveedores_personal") {
      toast({ title: "Migrando datos...", description: "Por favor espere, esto puede tardar unos segundos." });
      try {
        const res = await fetch("/api/herramientas/migrar-proveedores-personal", { method: "POST" });
        const data = await res.json();
        if (data.ok) {
          toast({ title: "Migración completada", description: `Cuentas migradas: ${data.cuentasMigradas}, Correos migrados: ${data.correosMigrados}` });
          queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
        } else {
          toast({ title: "Error", description: data.error || "No se pudo migrar.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
      }
      return;
    }
    if (action === "importar_direcciones_dbf") {
      setShowDireccionesImport(true);
      return;
    }
    if (action === "importar_excel_bancos") {
      setShowGridBancosImport(true);
      return;
    }
    if (action === "unir_excel") {
      setShowExcelMerge(true);
      return;
    }
    if (action === "resumen_excel") {
      setShowExcelSummary(true);
      return;
    }
    if (action === "resumen_docx_cana") {
      setShowDocxSummary(true);
      return;
    }
    if (action === "resumen_docx_zafra") {
      setShowDocxZafra(true);
      return;
    }
    if (action === "recalcular_secuencias") {
      toast({ title: "Recalculando secuencias...", description: "Por favor espere, esto puede tardar unos segundos." });
      try {
        const res = await fetch("/api/bancos/recalcular-todas-secuencias");
        const data = await res.json();
        if (data.ok) {
          toast({ title: "Secuencias recalculadas", description: `${data.bancos} bancos, ${data.registros} registros actualizados.` });
          queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
        } else {
          toast({ title: "Error", description: data.error || "No se pudo recalcular.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "No se pudo conectar con el servidor.", variant: "destructive" });
      }
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
      } else if (toolAction === "borrar_conservando_parametros") {
        await apiRequest("DELETE", "/api/debug/wipe-keep-parametros");
        toast({ title: "Datos eliminados", description: "Se han borrado los datos conservando parámetros. Recargando..." });
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
            pendingRelationData={pendingAdminRelation}
            onClearPendingRelation={() => setPendingAdminRelation(null)}
            onOpenBancos={(adminId, monto, montoDolares, descripcion, fecha) => {
              setPendingBancosRelation({ adminId, monto, montoDolares, descripcion, fecha });
              const minimizedIcon = document.querySelector('[data-testid="minimized-icon-bancos"]') as HTMLElement;
              if (minimizedIcon) {
                minimizedIcon.click();
              } else {
                handleSelectModule("bancos");
              }
              bringToFront("bancos");
            }}
          />
        )}
        {openModules.has("bancos") && (
          <Bancos
            onBack={() => handleCloseModule("bancos")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("bancos")}
            zIndex={moduleZIndex["bancos"] || 100}
            minimizedIndex={2}
            pendingRelationData={pendingBancosRelation}
            onClearPendingRelation={() => setPendingBancosRelation(null)}
            onOpenAdministracion={(bancoId, monto, montoDolares, nombreBanco, descripcion, fecha) => {
              setPendingAdminRelation({ bancoId, monto, montoDolares, nombreBanco, descripcion, fecha });
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
        {openModules.has("agronomia") && (
          <Agronomia
            onBack={() => handleCloseModule("agronomia")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("agronomia")}
            zIndex={moduleZIndex["agronomia"] || 100}
            minimizedIndex={10}
            onOpenAlmacen={(agronomiaId, fecha) => {
              localStorage.setItem("pending_agronomia_relacionar", agronomiaId);
              if (fecha) localStorage.setItem("pending_agronomia_fecha", fecha);
              else localStorage.removeItem("pending_agronomia_fecha");
              window.dispatchEvent(new CustomEvent("setAlmacenAgronomiaId", { detail: { agronomiaId, fecha } }));
              const minimizedIcon = document.querySelector('[data-testid="minimized-icon-almacen"]') as HTMLElement;
              if (minimizedIcon) {
                minimizedIcon.click();
              } else {
                handleSelectModule("almacen");
              }
              bringToFront("almacen");
            }}
          />
        )}
        {openModules.has("reparaciones") && (
          <Reparaciones
            onBack={() => handleCloseModule("reparaciones")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("reparaciones")}
            zIndex={moduleZIndex["reparaciones"] || 100}
            minimizedIndex={11}
          />
        )}
        {openModules.has("bitacora") && (
          <Bitacora
            onBack={() => handleCloseModule("bitacora")}
            onLogout={handleLogout}
            onFocus={() => bringToFront("bitacora")}
            zIndex={moduleZIndex["bitacora"] || 100}
            minimizedIndex={12}
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

      <DireccionesDBFImportProgress
        open={showDireccionesImport}
        onClose={() => setShowDireccionesImport(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
        }}
      />

      <BackupRestore
        open={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
      />

      <BackupDelete
        open={showBackupDelete}
        onClose={() => setShowBackupDelete(false)}
      />

      <GridBancosImportDialog
        open={showGridBancosImport}
        onOpenChange={setShowGridBancosImport}
      />

      <ExcelMergeDialog
        open={showExcelMerge}
        onOpenChange={setShowExcelMerge}
      />

      <ExcelSummaryDialog
        open={showExcelSummary}
        onOpenChange={setShowExcelSummary}
      />

      <DocxSummaryDialog
        open={showDocxSummary}
        onOpenChange={setShowDocxSummary}
      />

      <DocxZafraSummaryDialog
        open={showDocxZafra}
        onOpenChange={setShowDocxZafra}
      />

      <AlertDialog open={!!toolAction} onOpenChange={(open) => !open && setToolAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {toolAction === "borrar_conservando_parametros"
                ? "Se borrarán todos los datos de todas las tablas excepto Parámetros. Esta acción no se puede deshacer."
                : `Esta acción (${toolAction?.replace("_", " ")}) no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeToolAction} className={toolAction === "eliminar_datos" || toolAction === "borrar_conservando_parametros" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StandaloneWrapper({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(() => isLoggedIn(getStoredRole()));
  const [fontSize] = useState<number>(() => {
    const saved = localStorage.getItem("app_font_size");
    return saved ? parseInt(saved) : 12;
  });

  const moduleId = window.location.pathname.replace("/standalone/", "");
  
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    if (!moduleId) return;
    const stateKey = `standalone_window_state_${moduleId}`;
    const stored = localStorage.getItem(stateKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.x != null && parsed.y != null) {
          window.moveTo(parsed.x, parsed.y);
        }
        if (parsed.width && parsed.height) {
          window.resizeTo(parsed.width, parsed.height);
        }
      } catch (e) {}
    }

    const saveState = () => {
      const state = {
        x: window.screenX,
        y: window.screenY,
        width: window.outerWidth,
        height: window.outerHeight,
      };
      localStorage.setItem(stateKey, JSON.stringify(state));
    };

    window.addEventListener("resize", saveState);
    window.addEventListener("beforeunload", saveState);
    const moveInterval = setInterval(saveState, 2000);

    return () => {
      window.removeEventListener("resize", saveState);
      window.removeEventListener("beforeunload", saveState);
      clearInterval(moveInterval);
    };
  }, [moduleId]);

  const handleLogin = () => {
    setAuthenticated(true);
  };
  
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
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
    const url = `/standalone/${module}`;
    const ss = localStorage.getItem(`standalone_window_state_${module}`);
    const sp = ss ? JSON.parse(ss) : null;
    const w = sp?.width || 1200;
    const h = sp?.height || 800;
    window.open(url, `${module}_popout`, `width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no`);
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
      <Route path="/standalone/transferencias">
        <StandaloneWrapper><Transferencias isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/agrodata">
        <StandaloneWrapper><Agrodata isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/agronomia">
        <StandaloneWrapper><Agronomia isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/reportes">
        <StandaloneWrapper><Reportes isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/bitacora">
        <StandaloneWrapper><Bitacora isStandalone /></StandaloneWrapper>
      </Route>
      <Route path="/standalone/reparaciones">
        <StandaloneWrapper><Reparaciones isStandalone /></StandaloneWrapper>
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
