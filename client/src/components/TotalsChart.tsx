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

  const handleDownload = async () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const base64 = btoa(unescape(encodeURIComponent(svgData)));
    
    const img = new Image();
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        canvas.width = img.width * 2 || 800;
        canvas.height = img.height * 2 || 600;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `data:image/svg+xml;base64,${base64}`;
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'grafica-semanal.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
