import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RegistroForm } from "@/components/RegistroForm";
import { WeekFilter } from "@/components/WeekFilter";
import { RegistrosGrid } from "@/components/RegistrosGrid";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { TotalsChart } from "@/components/TotalsChart";
import { CumulativeChart } from "@/components/CumulativeChart";
import { DailyChart } from "@/components/DailyChart";
import { GradeChart } from "@/components/GradeChart";
import { SettingsDialog } from "@/components/SettingsDialog";
import { LoginDialog } from "@/components/LoginDialog";
import { generateWeeklyPdf, generateAllWeeksPdf } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { isDateInWeek, getCurrentWeekNumber, getWeekNumber, getWeekStartDate } from "@/lib/weekUtils";
import { queryClient } from "@/lib/queryClient";
import { getStoredRole, logout, canEdit, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Lock } from "lucide-react";
import type { Registro, Central } from "@shared/schema";

export default function Home() {
  const [userRole, setUserRole] = useState<UserRole>(() => getStoredRole());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const currentWeek = getCurrentWeekNumber();
    return currentWeek > 0 ? currentWeek : 1;
  });
  const [selectedCentral, setSelectedCentral] = useState("todas");
  const [selectedFinca, setSelectedFinca] = useState("todas");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const filteredRegistros = fincaFilteredRegistros.filter((registro) =>
    isDateInWeek(registro.fecha, selectedWeek)
  );

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
      await generateWeeklyPdf(filteredRegistros, selectedWeek, centrales);
      const centralLabel = selectedCentral === "todas" ? "" : ` - ${selectedCentral}`;
      toast({
        title: "PDF generado",
        description: `Se ha guardado el PDF de la semana ${selectedWeek}${centralLabel}.`,
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

  const handleGenerateAllPdf = async () => {
    if (centralFilteredRegistros.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para generar el PDF.",
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
      await generateAllWeeksPdf(centralFilteredRegistros, centrales);
      const centralLabel = selectedCentral === "todas" ? "todas las centrales" : selectedCentral;
      toast({
        title: "PDF generado",
        description: `Se ha guardado el PDF con todas las semanas (${centralLabel}).`,
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

  const handleUploadPalmar = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload-palmar", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al cargar archivo");
      }
      
      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
      
      toast({
        title: "Archivo cargado",
        description: `Se crearon ${result.created} registros${result.deleted > 0 ? ` (se eliminaron ${result.deleted} duplicados)` : ""}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el archivo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSettingsChanged = useCallback(() => {
    setSettingsKey(prev => prev + 1);
    setLocalRegistros([]);
    queryClient.invalidateQueries({ queryKey: ["/api/registros"] });
  }, []);

  const handleLogout = () => {
    logout();
    setUserRole(null);
    toast({
      title: "Sesión cerrada",
      description: "Has salido del sistema.",
    });
  };

  const startDate = getWeekStartDate();
  const startDateFormatted = `${startDate.day}/${startDate.month}/${startDate.year}`;

  const isAdmin = canEdit(userRole);

  return (
    <>
      <LoginDialog open={!userRole} onLogin={setUserRole} />
      <div className="min-h-screen bg-background" key={settingsKey}>
        <Header>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {isAdmin && (
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-24">
                  <RegistroForm 
                    onRecordCreated={handleRecordCreated} 
                    isOnline={isOnline}
                  />
                </div>
              </div>
            )}
            
            <div className={isAdmin ? "lg:col-span-8" : "lg:col-span-12"}>
              <WeekFilter
                selectedWeek={selectedWeek}
                onWeekChange={setSelectedWeek}
                selectedCentral={selectedCentral}
                onCentralChange={setSelectedCentral}
                centrales={centrales}
                selectedFinca={selectedFinca}
                onFincaChange={setSelectedFinca}
                fincas={fincasFromRegistros}
                onGeneratePdf={handleGeneratePdf}
                onGenerateAllPdf={handleGenerateAllPdf}
                onUploadPalmar={handleUploadPalmar}
                isUploading={isUploading}
                isGeneratingPdf={isGeneratingPdf}
                isPdfDisabled={centralesLoading}
                totalsChartButton={<TotalsChart registros={centralFilteredRegistros} />}
                dailyChartButton={<DailyChart registros={filteredRegistros} />}
                cumulativeChartButton={<CumulativeChart registros={centralFilteredRegistros} />}
                gradeChartButton={<GradeChart registros={allRegistros} />}
              />
              <RegistrosGrid
                registros={filteredRegistros}
                isLoading={isLoading && isOnline}
                selectedWeek={selectedWeek}
                isOnline={isOnline}
                onRecordDeleted={handleRecordDeleted}
                canEdit={isAdmin}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
