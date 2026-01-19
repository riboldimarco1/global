import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileDown, Download, BarChart3 } from "lucide-react";
import { formatNumber } from "@/lib/formatNumber";
import { getWeekStartDate } from "@/lib/weekUtils";
import type { Registro } from "@shared/schema";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface WeeklyArrimeReportDialogProps {
  registros: Registro[];
  selectedWeek: number;
  selectedCentral: string;
  selectedFinca: string;
}

export function WeeklyArrimeReportDialog({ 
  registros,
  selectedWeek,
  selectedCentral,
  selectedFinca
}: WeeklyArrimeReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const filterLabel = [
    selectedWeek !== 0 ? `Semana ${selectedWeek}` : null,
    selectedFinca !== "todas" ? selectedFinca : null,
    selectedCentral !== "todas" ? selectedCentral : null,
  ].filter(Boolean).join(" - ");

  const weeklyData = useMemo(() => {
    const data: Record<number, { 
      week: number;
      startDate: string;
      byCentral: Record<string, number>;
      byFinca: Record<string, number>;
      total: number;
    }> = {};

    registros.forEach((r) => {
      // Usar la lógica de semana existente
      const date = new Date(r.fecha + 'T12:00:00');
      const startOfYear = new Date(2025, 10, 3); // 3 de Nov 2025
      const diff = date.getTime() - startOfYear.getTime();
      const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

      if (week <= 0) return;
      // Filter by selected week if one is selected
      if (selectedWeek !== 0 && week !== selectedWeek) return;

      if (!data[week]) {
        const sw = getWeekStartDate(); // getWeekStartDate without arguments returns the start date info
        // We need to calculate the actual start date for the specific week
        const baseDate = new Date(2025, 10, 3);
        const weekStartDate = new Date(baseDate.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
        
        data[week] = {
          week,
          startDate: `${weekStartDate.getDate()}/${weekStartDate.getMonth() + 1}/${weekStartDate.getFullYear()}`,
          byCentral: {},
          byFinca: {},
          total: 0,
        };
      }

      data[week].byCentral[r.central] = (data[week].byCentral[r.central] || 0) + r.cantidad;
      const fincaKey = r.finca || "Sin Finca";
      data[week].byFinca[fincaKey] = (data[week].byFinca[fincaKey] || 0) + r.cantidad;
      data[week].total += r.cantidad;
    });

    return Object.values(data).sort((a, b) => b.week - a.week);
  }, [registros]);

  const totalsByCentralGeneral = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;
    weeklyData.forEach(w => {
      Object.entries(w.byCentral).forEach(([central, qty]) => {
        totals[central] = (totals[central] || 0) + qty;
        grandTotal += qty;
      });
    });
    return { totals, grandTotal };
  }, [weeklyData]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Reporte Semanal de Arrime", 14, 20);
      doc.setFontSize(12);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

      let currentY = 40;

      weeklyData.forEach((week) => {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Semana ${week.week} (Inicia: ${week.startDate})`, 14, currentY);
        doc.setFont("helvetica", "normal");
        currentY += 10;

        // Tabla por Central
        const centralRows: any[] = Object.entries(week.byCentral).map(([name, qty]) => [name, formatNumber(qty)]);
        centralRows.push([{ content: 'TOTAL SEMANA', styles: { fontStyle: 'bold' } }, { content: formatNumber(week.total), styles: { fontStyle: 'bold' } }]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Central', 'Cantidad']],
          body: centralRows,
          theme: 'striped',
          margin: { left: 14 },
          headStyles: { fillColor: [66, 66, 66] }
        });
        
        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;

        // Tabla por Finca
        const fincaRows: any[] = Object.entries(week.byFinca).map(([name, qty]) => [name, formatNumber(qty)]);
        fincaRows.push([{ content: 'TOTAL SEMANA', styles: { fontStyle: 'bold' } }, { content: formatNumber(week.total), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
          startY: currentY,
          head: [['Finca', 'Cantidad']],
          body: fincaRows,
          theme: 'grid',
          margin: { left: 14 },
          headStyles: { fillColor: [66, 66, 66] }
        });

        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 15;
      });

      // Total General al final si hay más de una semana
      if (weeklyData.length > 1) {
        const grandTotal = weeklyData.reduce((sum, w) => sum + w.total, 0);
        const totalsByCentral: Record<string, number> = {};
        
        weeklyData.forEach(w => {
          Object.entries(w.byCentral).forEach(([central, qty]) => {
            totalsByCentral[central] = (totalsByCentral[central] || 0) + qty;
          });
        });

        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(14, currentY, 196, currentY);
        currentY += 10;
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMEN TOTAL GENERAL", 14, currentY);
        currentY += 10;

        const grandTotalRows: any[] = Object.entries(totalsByCentral).map(([name, qty]) => [name, formatNumber(qty)]);
        grandTotalRows.push([{ content: 'TOTAL GENERAL', styles: { fontStyle: 'bold' } }, { content: formatNumber(grandTotal), styles: { fontStyle: 'bold' } }]);

        autoTable(doc, {
          startY: currentY,
          head: [['Central', 'Cantidad Total']],
          body: grandTotalRows,
          theme: 'grid',
          margin: { left: 14 },
          headStyles: { fillColor: [33, 33, 33] }
        });
      }

      doc.save(`reporte-semanal-arrime-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1"
          data-testid="button-weekly-report"
        >
          <FileDown className="h-3 w-3" />
          Reporte Semanal de Arrime
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Reporte Semanal de Arrime
              {filterLabel ? ` - ${filterLabel}` : ""}
            </span>
            {weeklyData.length > 0 && (
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-1"
              >
                <Download className="h-3 w-3" />
                Descargar PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-8 py-4">
          {weeklyData.length === 0 ? (
            <p className="text-center text-muted-foreground">No hay datos disponibles</p>
          ) : (
            <>
              {weeklyData.map((week) => (
                <div key={week.week} className="space-y-4 border-b pb-8 last:border-0">
                  <h3 className="text-lg font-bold">
                    Semana {week.week} <span className="text-sm font-normal text-muted-foreground">(Desde {week.startDate})</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Por Central</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Central</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(week.byCentral).map(([name, qty]) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell className="text-right font-mono">{formatNumber(qty)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/30">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(week.total)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Por Finca</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Finca</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(week.byFinca).map(([name, qty]) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell className="text-right font-mono">{formatNumber(qty)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/30">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(week.total)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ))}

              {weeklyData.length > 1 && (
                <div className="bg-muted/30 p-4 rounded-lg border space-y-4 mt-8">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Resumen Total General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Por Central (Total)</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Central</TableHead>
                            <TableHead className="text-right">Cantidad Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(totalsByCentralGeneral.totals).map(([name, qty]) => (
                            <TableRow key={name}>
                              <TableCell>{name}</TableCell>
                              <TableCell className="text-right font-mono">{formatNumber(qty)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell>TOTAL GENERAL</TableCell>
                            <TableCell className="text-right font-mono">{formatNumber(totalsByCentralGeneral.grandTotal)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
