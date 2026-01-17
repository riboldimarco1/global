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
import { ZoomableChart } from "@/components/ZoomableChart";
import { TrendingUp, Download } from "lucide-react";
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

interface DailyChartProps {
  registros: Registro[];
  selectedCentral?: string;
  selectedFinca?: string;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function DailyChart({ registros, selectedCentral, selectedFinca }: DailyChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const filterLabel = [
    selectedFinca && selectedFinca !== "todas" ? selectedFinca : null,
    selectedCentral && selectedCentral !== "todas" ? selectedCentral : null,
  ].filter(Boolean).join(" - ");

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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<html><head><title>Gráfica Diaria</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${dataUrl}" style="max-width:100%;height:auto;"/><p style="position:fixed;bottom:20px;color:white;text-align:center;width:100%;">Mantén presionada la imagen para guardarla</p></body></html>`);
      }
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'grafica-diaria.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const chartData = useMemo(() => {
    const dailyByCentral: Record<string, Record<number, number>> = {};
    centrales.forEach(c => {
      dailyByCentral[c.nombre] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    });
    const dailyTotal: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    registros.forEach((r) => {
      const date = new Date(r.fecha + 'T12:00:00');
      const jsDay = date.getDay();
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
      if (dailyByCentral[r.central]) {
        dailyByCentral[r.central][dayOfWeek] += r.cantidad;
      }
      dailyTotal[dayOfWeek] += r.cantidad;
    });

    return [0, 1, 2, 3, 4, 5, 6].map((day) => {
      const dataPoint: Record<string, string | number> = {
        dia: DAY_NAMES[day],
        Total: dailyTotal[day],
      };
      centrales.forEach(c => {
        dataPoint[c.nombre] = dailyByCentral[c.nombre]?.[day] || 0;
      });
      return dataPoint;
    });
  }, [registros, centrales]);

  const hasData = registros.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-daily-chart"
        >
          <TrendingUp className="h-4 w-4" />
          Gráfica Diaria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cantidad por Día de la Semana{filterLabel ? ` - ${filterLabel}` : ""}</DialogTitle>
          <DialogDescription>
            Totales de cada central agrupados por día de la semana{filterLabel ? ` (${filterLabel})` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {hasData ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                  <Download className="h-3 w-3" />
                  Descargar
                </Button>
              </div>
              <ZoomableChart height="h-72" chartRef={chartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
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
                      stroke="#ef4444"
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
              </ZoomableChart>
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
