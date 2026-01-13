import { useMemo } from "react";
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
import { TrendingUp } from "lucide-react";
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
  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const chartData = useMemo(() => {
    if (registros.length === 0 || centrales.length === 0) return [];

    const sortedRegistros = [...registros].sort((a, b) => 
      a.fecha.localeCompare(b.fecha)
    );

    const dailyTotals: Record<string, Record<string, number>> = {};
    
    sortedRegistros.forEach((r) => {
      if (!dailyTotals[r.fecha]) {
        dailyTotals[r.fecha] = {};
        centrales.forEach(c => {
          dailyTotals[r.fecha][c.nombre] = 0;
        });
      }
      if (dailyTotals[r.fecha][r.central] !== undefined) {
        dailyTotals[r.fecha][r.central] += r.cantidad;
      }
    });

    const dates = Object.keys(dailyTotals).sort();
    
    const cumulatives: Record<string, number> = {};
    centrales.forEach(c => {
      cumulatives[c.nombre] = 0;
    });
    let cumulativeTotal = 0;

    return dates.map((date) => {
      centrales.forEach(c => {
        cumulatives[c.nombre] += dailyTotals[date][c.nombre] || 0;
      });
      
      const dayTotal = Object.values(dailyTotals[date]).reduce((sum, v) => sum + v, 0);
      cumulativeTotal += dayTotal;

      const [year, month, day] = date.split('-');
      const dataPoint: Record<string, string | number> = {
        fecha: `${day}/${month}`,
        fullDate: date,
      };
      
      centrales.forEach(c => {
        dataPoint[c.nombre] = cumulatives[c.nombre];
      });
      dataPoint.Total = cumulativeTotal;
      
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
            <div className="h-80 w-full">
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
                  {centrales.map((central) => (
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
