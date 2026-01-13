import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RegistroForm } from "@/components/RegistroForm";
import { WeekFilter } from "@/components/WeekFilter";
import { RegistrosGrid } from "@/components/RegistrosGrid";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { TotalsChart } from "@/components/TotalsChart";
import { DailyChart } from "@/components/DailyChart";
import { generateWeeklyPdf } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { isDateInWeek, getCurrentWeekNumber, getWeekNumber } from "@/lib/weekUtils";
import type { Registro } from "@shared/schema";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const currentWeek = getCurrentWeekNumber();
    return currentWeek > 0 ? currentWeek : 1;
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [localRegistros, setLocalRegistros] = useState<Registro[]>([]);
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

  const filteredRegistros = allRegistros.filter((registro) =>
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

    setIsGeneratingPdf(true);
    try {
      await generateWeeklyPdf(filteredRegistros, selectedWeek);
      toast({
        title: "PDF generado",
        description: `Se ha guardado el PDF de la semana ${selectedWeek}.`,
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

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <ConnectionStatus
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSync={syncPendingActions}
        />
      </Header>
      <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <RegistroForm 
                onRecordCreated={handleRecordCreated} 
                isOnline={isOnline}
              />
            </div>
          </div>
          
          <div className="lg:col-span-8">
            <WeekFilter
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
              onGeneratePdf={handleGeneratePdf}
              isGeneratingPdf={isGeneratingPdf}
              totalsChartButton={<TotalsChart registros={allRegistros} />}
              dailyChartButton={<DailyChart registros={filteredRegistros} />}
            />
            <RegistrosGrid
              registros={filteredRegistros}
              isLoading={isLoading && isOnline}
              selectedWeek={selectedWeek}
              isOnline={isOnline}
              onRecordDeleted={handleRecordDeleted}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
