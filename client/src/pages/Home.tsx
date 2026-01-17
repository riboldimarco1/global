import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RegistroForm } from "@/components/RegistroForm";
import { FilterPanel } from "@/components/FilterPanel";
import { CommandPanel } from "@/components/CommandPanel";
import { RegistrosGrid } from "@/components/RegistrosGrid";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { TotalsChart } from "@/components/TotalsChart";
import { CumulativeChart } from "@/components/CumulativeChart";
import { DailyChart } from "@/components/DailyChart";
import { GradeChart } from "@/components/GradeChart";
import { SettingsDialog } from "@/components/SettingsDialog";
import { LoginDialog, type ModuleType } from "@/components/LoginDialog";
import { InteractiveTutorial, useTutorial } from "@/components/InteractiveTutorial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallButton } from "@/components/InstallButton";
import Finanza from "@/pages/Finanza";
import { generateWeeklyPdf } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { isDateInWeek, getCurrentWeekNumber, getWeekNumber, getWeekStartDate } from "@/lib/weekUtils";
import { queryClient } from "@/lib/queryClient";
import { getStoredRole, logout, canEdit, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Lock, HelpCircle, GraduationCap, Table } from "lucide-react";
import { Link } from "wouter";
import type { Registro, Central } from "@shared/schema";

export default function Home() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [selectedModule, setSelectedModule] = useState<ModuleType>(null);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const currentWeek = getCurrentWeekNumber();
    return currentWeek > 0 ? currentWeek : 1;
  });
  const [selectedCentral, setSelectedCentral] = useState("todas");
  const [selectedFinca, setSelectedFinca] = useState("todas");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPortuguesa, setIsUploadingPortuguesa] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [localRegistros, setLocalRegistros] = useState<Registro[]>([]);
  const [settingsKey, setSettingsKey] = useState(0);
  const { toast } = useToast();
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    syncPendingActions,
    getAllLocalRegistros,
    saveLocalRegistros
  } = useOnlineStatus();

  const { data: serverRegistros = [], isLoading, isError } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
    enabled: isOnline,
    retry: false,
  });
  
  const { data: centrales = [], isLoading: centralesLoading } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const { data: backups = [] } = useQuery<{ id: string; nombre: string; fecha: string }[]>({
    queryKey: ["/api/backups"],
  });

  const { showTutorial, openTutorial, closeTutorial } = useTutorial();

  useEffect(() => {
    if (isOnline && serverRegistros.length >= 0) {
      saveLocalRegistros(serverRegistros);
      setLocalRegistros(serverRegistros);
    }
  }, [serverRegistros, isOnline, saveLocalRegistros]);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const local = await getAllLocalRegistros();
        setLocalRegistros(local);
      } catch {
        console.error("Error loading local registros");
      }
    };
    loadLocal();
    
    if (isOnline && pendingCount > 0) {
      syncPendingActions();
    }
  }, [getAllLocalRegistros, isOnline, pendingCount, syncPendingActions]);

  const allRegistros = isOnline && !isError ? serverRegistros : localRegistros;

  const fincasFromRegistros = Array.from(
    new Set(allRegistros.map(r => r.finca).filter((f): f is string => !!f))
  ).sort();

  const centralFilteredRegistros = allRegistros.filter((registro) => 
    selectedCentral === "todas" || registro.central === selectedCentral
  );

  const fincaFilteredRegistros = centralFilteredRegistros.filter((registro) =>
    selectedFinca === "todas" || registro.finca === selectedFinca
  );

  const filteredRegistros = selectedWeek === 0 
    ? fincaFilteredRegistros 
    : fincaFilteredRegistros.filter((registro) => isDateInWeek(registro.fecha, selectedWeek));

  const handleRecordCreated = async (fecha: string, newRegistro?: Registro) => {
    const recordWeek = getWeekNumber(fecha);
    if (recordWeek > 0 && recordWeek !== selectedWeek) {
      setSelectedWeek(recordWeek);
    }
    if (newRegistro) {
      setLocalRegistros(prev => [...prev, newRegistro]);
    }
  };

  const handleRecordDeleted = (id: string) => {
    setLocalRegistros(prev => prev.filter(r => r.id !== id));
  };

  const handleGeneratePdf = async () => {
    if (filteredRegistros.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para generar el PDF de esta semana.",
        variant: "destructive",
      });
      return;
    }
    
    if (centralesLoading) {
      toast({
        title: "Cargando",
        description: "Espere mientras se cargan las centrales.",
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await generateWeeklyPdf(filteredRegistros, selectedWeek, centrales, selectedCentral, selectedFinca);
      const filterParts = [
        selectedFinca !== "todas" ? selectedFinca : null,
        selectedCentral !== "todas" ? selectedCentral : null,
      ].filter(Boolean);
      const filterLabel = filterParts.length > 0 ? ` - ${filterParts.join(" / ")}` : "";
      toast({
        title: "PDF generado",
        description: `Se ha guardado el PDF de la semana ${selectedWeek}${filterLabel}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUploadPalmar = async (files: File[]) => {
    if (!files || files.length === 0) {
      toast({
        title: "Error",
        description: "No se seleccionaron archivos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    let totalCreated = 0;
    let errors: string[] = [];
    
    try {
      for (const file of files) {
        if (!file || !(file instanceof File)) {
          errors.push("Archivo inválido");
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("file", file, file.name);
          
          const response = await fetch("/api/upload-palmar", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            const error = await response.json();
            errors.push(`${file.name}: ${error.error || "Error"}`);
            continue;
          }
          
          const result = await response.json();
          totalCreated += result.created || 0;
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message || "Error"}`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      
      if (totalCreated > 0) {
        toast({
          title: "Archivos cargados",
          description: `Se crearon ${totalCreated} registros de ${files.length} archivo(s).`,
        });
      }
      if (errors.length > 0) {
        toast({
          title: totalCreated > 0 ? "Errores parciales" : "Error",
          description: errors.join("\n"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar los archivos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadPortuguesa = async (files: File[]) => {
    if (!files || files.length === 0) {
      toast({
        title: "Error",
        description: "No se seleccionaron archivos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploadingPortuguesa(true);
    let totalCreated = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let errors: string[] = [];
    
    try {
      for (const file of files) {
        if (!file || !(file instanceof File)) {
          errors.push("Archivo inválido");
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("file", file, file.name);
          
          const response = await fetch("/api/upload-portuguesa", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            const error = await response.json();
            errors.push(`${file.name}: ${error.error || "Error"}`);
            continue;
          }
          
          const result = await response.json();
          totalCreated += result.created || 0;
          totalProcessed += result.rowsProcessed || 0;
          totalSkipped += result.rowsSkipped || 0;
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message || "Error"}`);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      
      if (totalCreated > 0) {
        toast({
          title: "Archivos cargados",
          description: `${files.length} archivo(s): ${totalProcessed} filas procesadas (núcleo 1013), ${totalSkipped} descartadas.`,
        });
      }
      if (errors.length > 0) {
        toast({
          title: totalCreated > 0 ? "Errores parciales" : "Error",
          description: errors.join("\n"),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar los archivos.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPortuguesa(false);
    }
  };

  const handleSettingsChanged = useCallback(() => {
    setSettingsKey(prev => prev + 1);
    setLocalRegistros([]);
    queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
  }, []);

  const handleBackup = async (nombre: string) => {
    setIsBackingUp(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear respaldo");
      }
      
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      
      toast({
        title: "Respaldo creado",
        description: `"${result.nombre}" guardado con ${result.registrosCount} registros.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el respaldo.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/backups/${backupId}/restore`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al restaurar");
      }
      
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      queryClient.invalidateQueries({ queryKey: ["/api/centrales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fincas"] });
      
      toast({
        title: "Respaldo restaurado",
        description: `Restaurados: ${result.restored.registros} registros, ${result.restored.centrales} centrales, ${result.restored.fincas} fincas.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo restaurar el respaldo.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserRole(null);
    setSelectedModule(null);
    toast({
      title: "Sesión cerrada",
      description: "Has salido del sistema.",
    });
  };

  const handleLogin = (role: UserRole, module: ModuleType) => {
    setUserRole(role);
    setSelectedModule(module);
  };

  const handleBackToModules = () => {
    logout();
    setUserRole(null);
    setSelectedModule(null);
  };

  const startDate = getWeekStartDate();
  const startDateFormatted = `${startDate.day}/${startDate.month}/${startDate.year}`;

  const isAdmin = canEdit(userRole);

  if (selectedModule === "finanza") {
    return <Finanza onBack={handleBackToModules} />;
  }

  return (
    <>
      <LoginDialog open={!userRole || !selectedModule} onLogin={handleLogin} />
      <InteractiveTutorial isOpen={showTutorial} onClose={closeTutorial} />
      <div className="min-h-screen bg-background" key={settingsKey}>
        <Header>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={openTutorial}
            data-testid="button-tutorial"
            title="Tutorial interactivo"
          >
            <GraduationCap className="h-5 w-5" />
          </Button>
          <Link href="/guia">
            <Button variant="ghost" size="icon" data-testid="button-help">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </Link>
          <InstallButton />
          <ThemeToggle />
          {isAdmin && <SettingsDialog onSettingsChanged={handleSettingsChanged} />}
          <ConnectionStatus
            isOnline={isOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSync={syncPendingActions}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline-block">
              Inicio: {startDateFormatted}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              data-testid="button-user-info"
            >
              {isAdmin ? <Lock className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="hidden sm:inline">{isAdmin ? "Admin" : "Invitado"}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </Header>
        <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {isAdmin && (
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <RegistroForm 
                    onRecordCreated={handleRecordCreated} 
                    isOnline={isOnline}
                    fincas={fincasFromRegistros}
                  />
                </div>
              </div>
            )}
            
            <div className={isAdmin ? "lg:col-span-8" : "lg:col-span-12"}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FilterPanel
                  selectedWeek={selectedWeek}
                  onWeekChange={setSelectedWeek}
                  selectedCentral={selectedCentral}
                  onCentralChange={setSelectedCentral}
                  centrales={centrales}
                  selectedFinca={selectedFinca}
                  onFincaChange={setSelectedFinca}
                  fincas={fincasFromRegistros}
                />
                <CommandPanel
                  onGeneratePdf={handleGeneratePdf}
                  onUploadPalmar={handleUploadPalmar}
                  onUploadPortuguesa={handleUploadPortuguesa}
                  onBackup={handleBackup}
                  onRestore={handleRestore}
                  backups={backups}
                  isUploading={isUploading}
                  isUploadingPortuguesa={isUploadingPortuguesa}
                  isBackingUp={isBackingUp}
                  isRestoring={isRestoring}
                  isGeneratingPdf={isGeneratingPdf}
                  isPdfDisabled={centralesLoading}
                  isWeeklyPdfDisabled={selectedWeek === 0}
                  totalsChartButton={<TotalsChart registros={fincaFilteredRegistros} selectedCentral={selectedCentral} selectedFinca={selectedFinca} />}
                  dailyChartButton={<DailyChart registros={filteredRegistros} selectedCentral={selectedCentral} selectedFinca={selectedFinca} disabled={selectedWeek === 0} />}
                  cumulativeChartButton={<CumulativeChart registros={fincaFilteredRegistros} selectedCentral={selectedCentral} selectedFinca={selectedFinca} />}
                  gradeChartButton={<GradeChart registros={fincaFilteredRegistros} selectedCentral={selectedCentral} selectedFinca={selectedFinca} />}
                  isAdmin={isAdmin}
                />
              </div>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Table className="h-4 w-4" />
                    {selectedWeek === 0 ? "Todos los Registros" : `Registros de la Semana ${selectedWeek}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <RegistrosGrid
                    registros={filteredRegistros}
                    isLoading={isLoading && isOnline}
                    selectedWeek={selectedWeek}
                    isOnline={isOnline}
                    onRecordDeleted={handleRecordDeleted}
                    canEdit={isAdmin}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
