import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { FileDown, Download } from "lucide-react";
import { generateWeeklyPdf } from "@/lib/pdfGenerator";
import { formatNumber } from "@/lib/formatNumber";
import type { Registro, Central } from "@shared/schema";

interface ArrimeReportDialogProps {
  registros: Registro[];
  selectedWeek: number;
  selectedCentral: string;
  selectedFinca: string;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const jsDay = date.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
  return DAY_NAMES[dayIndex];
}

export function ArrimeReportDialog({
  registros,
  selectedWeek,
  selectedCentral,
  selectedFinca,
}: ArrimeReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const filterLabel = [
    selectedFinca !== "todas" ? selectedFinca : null,
    selectedCentral !== "todas" ? selectedCentral : null,
  ].filter(Boolean).join(" - ");

  const sortedRegistros = useMemo(() => {
    return [...registros].sort((a, b) => {
      const dateCompare = a.fecha.localeCompare(b.fecha);
      if (dateCompare !== 0) return dateCompare;
      return a.central.localeCompare(b.central);
    });
  }, [registros]);

  const totals = useMemo(() => {
    const byCentral: Record<string, { cantidad: number; weightedGrade: number; cantidadConGrado: number }> = {};
    const byFinca: Record<string, { cantidad: number; weightedGrade: number; cantidadConGrado: number }> = {};
    let totalCantidad = 0;
    let totalWeightedGrade = 0;
    let totalCantidadConGrado = 0;

    sortedRegistros.forEach((r) => {
      const fincaKey = r.finca || "Sin Finca";
      
      if (!byCentral[r.central]) {
        byCentral[r.central] = { cantidad: 0, weightedGrade: 0, cantidadConGrado: 0 };
      }
      if (!byFinca[fincaKey]) {
        byFinca[fincaKey] = { cantidad: 0, weightedGrade: 0, cantidadConGrado: 0 };
      }
      
      byCentral[r.central].cantidad += r.cantidad;
      byFinca[fincaKey].cantidad += r.cantidad;
      totalCantidad += r.cantidad;
      
      if (r.grado !== null && r.grado !== undefined) {
        byCentral[r.central].weightedGrade += r.cantidad * r.grado;
        byCentral[r.central].cantidadConGrado += r.cantidad;
        byFinca[fincaKey].weightedGrade += r.cantidad * r.grado;
        byFinca[fincaKey].cantidadConGrado += r.cantidad;
        totalWeightedGrade += r.cantidad * r.grado;
        totalCantidadConGrado += r.cantidad;
      }
    });

    return {
      byCentral,
      byFinca,
      totalCantidad,
      avgGrade: totalCantidadConGrado > 0 ? totalWeightedGrade / totalCantidadConGrado : 0,
    };
  }, [sortedRegistros]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await generateWeeklyPdf(registros, selectedWeek, centrales, selectedCentral, selectedFinca);
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
          data-testid="button-generate-pdf"
          className="gap-1"
        >
          <FileDown className="h-3 w-3" />
          Reporte Completo de Arrime
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>
              {selectedWeek === 0 ? "Reporte General" : `Reporte Semana ${selectedWeek}`}
              {filterLabel ? ` - ${filterLabel}` : ""}
              {registros.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({registros.length} registros)
                </span>
              )}
            </span>
            {registros.length > 0 && (
              <Button
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-1"
                data-testid="button-download-report"
              >
                <Download className="h-3 w-3" />
                {isDownloading ? "Descargando..." : "Descargar PDF"}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {registros.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No hay registros para mostrar
          </div>
        ) : (
          <div className="flex-1 max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Finca</TableHead>
                    <TableHead>Central</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Grado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRegistros.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{getDayName(r.fecha)}</TableCell>
                      <TableCell>{formatDateDisplay(r.fecha)}</TableCell>
                      <TableCell>{r.finca || "-"}</TableCell>
                      <TableCell>{r.central}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(r.cantidad)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {r.grado !== null && r.grado !== undefined ? formatNumber(r.grado) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Resumen por Central</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Central</TableHead>
                      <TableHead className="text-right">Total Cantidad</TableHead>
                      <TableHead className="text-right">Grado Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(totals.byCentral).map(([central, data]) => (
                      <TableRow key={central}>
                        <TableCell className="font-medium">{central}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(data.cantidad)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {data.cantidadConGrado > 0
                            ? formatNumber(data.weightedGrade / data.cantidadConGrado)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(totals.totalCantidad)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {totals.avgGrade > 0 ? formatNumber(totals.avgGrade) : "-"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Resumen por Finca</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finca</TableHead>
                      <TableHead className="text-right">Total Cantidad</TableHead>
                      <TableHead className="text-right">Grado Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(totals.byFinca)
                      .sort((a, b) => b[1].cantidad - a[1].cantidad)
                      .map(([finca, data]) => (
                      <TableRow key={finca}>
                        <TableCell className="font-medium">{finca}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(data.cantidad)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {data.cantidadConGrado > 0
                            ? formatNumber(data.weightedGrade / data.cantidadConGrado)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(totals.totalCantidad)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {totals.avgGrade > 0 ? formatNumber(totals.avgGrade) : "-"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
