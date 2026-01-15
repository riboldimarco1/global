import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Registro, Central } from "@shared/schema";
import { getWeekNumber } from "@/lib/weekUtils";

interface TotalsChartProps {
  registros: Registro[];
}

export function TotalsChart({ registros }: TotalsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const handleDownload = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const base64 = btoa(unescape(encodeURIComponent(svgData)));
    const dataUri = `data:image/svg+xml;base64,${base64}`;
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'grafica-semanal.svg';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  const chartData = useMemo(() => {
    if (registros.length === 0 || centrales.length === 0) return [];

    const weeklyTotals: Record<number, Record<string, number>> = {};
    
    registros.forEach((r) => {
      const week = getWeekNumber(r.fecha);
      if (week > 0) {
        if (!weeklyTotals[week]) {
          weeklyTotals[week] = {};
          centrales.forEach(c => {
            weeklyTotals[week][c.nombre] = 0;
          });
        }
        if (weeklyTotals[week][r.central] !== undefined) {
          weeklyTotals[week][r.central] += r.cantidad;
        }
      }
    });

    const weeks = Object.keys(weeklyTotals).map(Number).sort((a, b) => a - b);
    
    return weeks.map((week) => {
      const dataPoint: Record<string, string | number> = {
        semana: `S${week}`,
      };
      let total = 0;
      centrales.forEach(c => {
        const value = weeklyTotals[week][c.nombre] || 0;
        dataPoint[c.nombre] = value;
        total += value;
      });
      dataPoint.Total = total;
      return dataPoint;
    });
  }, [registros, centrales]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-totals-chart"
        >
          <BarChart3 className="h-4 w-4" />
          Gráfica Semanal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Totales por Semana</DialogTitle>
          <DialogDescription>
            Cantidad total por central a lo largo de las semanas
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {chartData.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                  <Download className="h-3 w-3" />
                  Descargar
                </Button>
              </div>
              <div className="h-72 w-full" ref={chartRef}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  {centrales.map((central) => (
                    <Line
                      key={central.id}
                      type="monotone"
                      dataKey={central.nombre}
                      stroke={central.color}
                      strokeWidth={1.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos para mostrar
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
