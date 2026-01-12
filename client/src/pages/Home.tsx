import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RegistroForm } from "@/components/RegistroForm";
import { WeekFilter } from "@/components/WeekFilter";
import { RegistrosGrid } from "@/components/RegistrosGrid";
import { generateWeeklyPdf, shareWeeklyPdf } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { isDateInWeek, getCurrentWeekNumber, getWeekNumber } from "@/lib/weekUtils";
import type { Registro } from "@shared/schema";

export default function Home() {
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const currentWeek = getCurrentWeekNumber();
    return currentWeek > 0 ? currentWeek : 1;
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const { toast } = useToast();

  const { data: allRegistros = [], isLoading } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const filteredRegistros = allRegistros.filter((registro) =>
    isDateInWeek(registro.fecha, selectedWeek)
  );

  const handleRecordCreated = (fecha: string) => {
    const recordWeek = getWeekNumber(fecha);
    if (recordWeek > 0 && recordWeek !== selectedWeek) {
      setSelectedWeek(recordWeek);
    }
  };

  const handleGeneratePdf = () => {
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
      generateWeeklyPdf(filteredRegistros, selectedWeek);
      toast({
        title: "PDF generado",
        description: `Se ha descargado el PDF de la semana ${selectedWeek}.`,
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

  const handleSharePdf = async () => {
    if (filteredRegistros.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay registros para compartir de esta semana.",
        variant: "destructive",
      });
      return;
    }

    setIsSharingPdf(true);
    try {
      const shared = await shareWeeklyPdf(filteredRegistros, selectedWeek);
      if (!shared) {
        generateWeeklyPdf(filteredRegistros, selectedWeek);
        toast({
          title: "PDF descargado",
          description: "La opción de compartir no está disponible. Se descargó el PDF.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo compartir el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsSharingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <RegistroForm onRecordCreated={handleRecordCreated} />
            </div>
          </div>
          
          <div className="lg:col-span-8">
            <WeekFilter
              selectedWeek={selectedWeek}
              onWeekChange={setSelectedWeek}
              onGeneratePdf={handleGeneratePdf}
              onSharePdf={handleSharePdf}
              isGeneratingPdf={isGeneratingPdf}
              isSharingPdf={isSharingPdf}
            />
            <RegistrosGrid
              registros={filteredRegistros}
              isLoading={isLoading}
              selectedWeek={selectedWeek}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
