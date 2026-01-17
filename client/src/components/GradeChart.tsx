import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZoomableChart } from "@/components/ZoomableChart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, Download } from "lucide-react";
import type { Registro, Central } from "@shared/schema";

interface GradeChartProps {
  registros: Registro[];
  selectedCentral?: string;
  selectedFinca?: string;
}

export function GradeChart({ registros, selectedCentral, selectedFinca }: GradeChartProps) {
  const [open, setOpen] = useState(false);
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
        newWindow.document.write(`<html><head><title>Gráfica Grado</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;"><img src="${dataUrl}" style="max-width:100%;height:auto;"/><p style="position:fixed;bottom:20px;color:white;text-align:center;width:100%;">Mantén presionada la imagen para guardarla</p></body></html>`);
      }
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'grafica-grado.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const registrosConGrado = registros.filter(r => r.grado !== null && r.grado !== undefined);
  
  const { chartData, overallAverage, relevantCentrales } = useMemo(() => {
    if (registrosConGrado.length === 0 || centrales.length === 0) {
      return { chartData: [], overallAverage: 0, relevantCentrales: [] };
    }

    // Get centrales that have data
    const activeCentrales = new Set(registrosConGrado.map(r => r.central));
    const relevantCentrales = centrales.filter(c => activeCentrales.has(c.nombre));

    // Group by date and calculate weighted average per central per date
    const dailyData: Record<string, Record<string, { weighted: number; cantidad: number }>> = {};
    let overallWeighted = 0;
    let overallCantidad = 0;

    registrosConGrado.forEach(r => {
      if (!dailyData[r.fecha]) {
        dailyData[r.fecha] = {};
      }
      if (!dailyData[r.fecha][r.central]) {
        dailyData[r.fecha][r.central] = { weighted: 0, cantidad: 0 };
      }
      const weighted = r.cantidad * (r.grado ?? 0);
      dailyData[r.fecha][r.central].weighted += weighted;
      dailyData[r.fecha][r.central].cantidad += r.cantidad;
      overallWeighted += weighted;
      overallCantidad += r.cantidad;
    });

    const overallAverage = overallCantidad > 0 
      ? Math.round((overallWeighted / overallCantidad) * 100) / 100 
      : 0;

    // Build chart data
    const dates = Object.keys(dailyData).sort();
    const chartData = dates.map(fecha => {
      const [, month, day] = fecha.split('-');
      const dataPoint: Record<string, string | number> = {
        fecha: `${day}/${month}`,
        fullDate: fecha,
      };

      // Calculate weighted average for each central on this date
      relevantCentrales.forEach(c => {
        if (dailyData[fecha][c.nombre]) {
          const { weighted, cantidad } = dailyData[fecha][c.nombre];
          dataPoint[c.nombre] = cantidad > 0 
            ? Math.round((weighted / cantidad) * 100) / 100 
            : 0;
        }
      });

      // Calculate overall weighted average for this date
      let dayWeighted = 0;
      let dayCantidad = 0;
      Object.values(dailyData[fecha]).forEach(({ weighted, cantidad }) => {
        dayWeighted += weighted;
        dayCantidad += cantidad;
      });
      dataPoint["Promedio"] = dayCantidad > 0 
        ? Math.round((dayWeighted / dayCantidad) * 100) / 100 
        : 0;

      return dataPoint;
    });

    return { chartData, overallAverage, relevantCentrales };
  }, [registrosConGrado, centrales]);

  if (registrosConGrado.length === 0 || centrales.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled data-testid="button-grade-chart">
        <TrendingUp className="h-4 w-4 mr-1" />
        Grado
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-grade-chart">
          <TrendingUp className="h-4 w-4 mr-1" />
          Grado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grado Promedio por Fecha{filterLabel ? ` - ${filterLabel}` : ""} (Prom. Total: {overallAverage.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
              <Download className="h-3 w-3" />
              Descargar
            </Button>
          </div>
          <ZoomableChart height="h-80" chartRef={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="fecha" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <ReferenceLine 
                  y={overallAverage} 
                  stroke="#666" 
                  strokeDasharray="5 5" 
                  label={{ value: `Prom: ${overallAverage.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, position: 'right', fontSize: 10 }} 
                />
                {relevantCentrales.map((central) => (
                  <Line
                    key={central.id}
                    type="monotone"
                    dataKey={central.nombre}
                    stroke={central.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="Promedio"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ZoomableChart>
        </div>
      </DialogContent>
    </Dialog>
  );
}
