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

interface CumulativeChartProps {
  registros: Registro[];
}

export function CumulativeChart({ registros }: CumulativeChartProps) {
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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<html><head><title>Gráfica Acumulada</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${dataUrl}" style="max-width:100%;height:auto;"/><p style="position:fixed;bottom:20px;color:white;text-align:center;width:100%;">Mantén presionada la imagen para guardarla</p></body></html>`);
      }
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'grafica-acumulada.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const chartData = useMemo(() => {
    if (registros.length === 0 || centrales.length === 0) return [];

    const sortedRegistros = [...registros].sort((a, b) => 
      a.fecha.localeCompare(b.fecha)
    );

    // Get list of centrales that actually appear in the registros
    const activeCentrales = new Set(registros.map(r => r.central));
    const relevantCentrales = centrales.filter(c => activeCentrales.has(c.nombre));

    // Build daily totals for each date and each central
    const dailyTotals: Record<string, Record<string, number>> = {};
    
    sortedRegistros.forEach((r) => {
      if (!dailyTotals[r.fecha]) {
        dailyTotals[r.fecha] = {};
        relevantCentrales.forEach(c => {
          dailyTotals[r.fecha][c.nombre] = 0;
        });
      }
      // Always add the cantidad, even if central wasn't pre-initialized
      if (dailyTotals[r.fecha][r.central] === undefined) {
        dailyTotals[r.fecha][r.central] = 0;
      }
      dailyTotals[r.fecha][r.central] += r.cantidad;
    });

    const dates = Object.keys(dailyTotals).sort();
    
    // Initialize cumulatives for all centrales that appear in registros
    const cumulatives: Record<string, number> = {};
    relevantCentrales.forEach(c => {
      cumulatives[c.nombre] = 0;
    });
    let cumulativeTotal = 0;

    return dates.map((date) => {
      // Add today's values to cumulatives
      relevantCentrales.forEach(c => {
        const todayValue = dailyTotals[date][c.nombre] || 0;
        cumulatives[c.nombre] += todayValue;
      });
      
      // Calculate day total from actual values (not cumulative)
      const dayTotal = relevantCentrales.reduce((sum, c) => 
        sum + (dailyTotals[date][c.nombre] || 0), 0
      );
      cumulativeTotal += dayTotal;

      const [year, month, day] = date.split('-');
      const dataPoint: Record<string, string | number> = {
        fecha: `${day}/${month}`,
        fullDate: date,
      };
      
      // Round to 2 decimals for display
      relevantCentrales.forEach(c => {
        dataPoint[c.nombre] = Math.round(cumulatives[c.nombre] * 100) / 100;
      });
      dataPoint.Total = Math.round(cumulativeTotal * 100) / 100;
      
      return dataPoint;
    });
  }, [registros, centrales]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-cumulative-chart"
        >
          <TrendingUp className="h-4 w-4" />
          Acumulado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cantidades Acumuladas</DialogTitle>
          <DialogDescription>
            Total acumulado por central desde el primer día de registro
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
              <div className="h-80 w-full" ref={chartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => 
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                    }
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      value.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    }
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const fullDate = payload[0].payload.fullDate;
                        const [year, month, day] = fullDate.split('-');
                        return `${day}/${month}/${year}`;
                      }
                      return label;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  {centrales
                    .filter((c) => chartData.length > 0 && chartData[0][c.nombre] !== undefined)
                    .map((central) => (
                      <Line
                        key={central.id}
                        type="monotone"
                        dataKey={central.nombre}
                        stroke={central.color}
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
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
