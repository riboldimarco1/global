import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
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
import type { Registro } from "@shared/schema";
import { getWeekNumber } from "@/lib/weekUtils";

interface TotalsChartProps {
  registros: Registro[];
}

const CENTRAL_COLORS: Record<string, string> = {
  Palmar: "#3b82f6",
  Portuguesa: "#22c55e",
  Pastora: "#f59e0b",
  Otros: "#8b5cf6",
};

export function TotalsChart({ registros }: TotalsChartProps) {
  const chartData = useMemo(() => {
    if (registros.length === 0) return [];

    const weeklyTotals: Record<number, Record<string, number>> = {};
    
    registros.forEach((r) => {
      const week = getWeekNumber(r.fecha);
      if (week > 0) {
        if (!weeklyTotals[week]) {
          weeklyTotals[week] = { Palmar: 0, Portuguesa: 0, Pastora: 0, Otros: 0 };
        }
        weeklyTotals[week][r.central] += r.cantidad;
      }
    });

    const weeks = Object.keys(weeklyTotals).map(Number).sort((a, b) => a - b);
    
    return weeks.map((week) => ({
      semana: `S${week}`,
      Palmar: weeklyTotals[week].Palmar || 0,
      Portuguesa: weeklyTotals[week].Portuguesa || 0,
      Pastora: weeklyTotals[week].Pastora || 0,
      Otros: weeklyTotals[week].Otros || 0,
      Total: (weeklyTotals[week].Palmar || 0) + 
             (weeklyTotals[week].Portuguesa || 0) + 
             (weeklyTotals[week].Pastora || 0) + 
             (weeklyTotals[week].Otros || 0),
    }));
  }, [registros]);

  if (registros.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-totals-chart"
        >
          <BarChart3 className="h-4 w-4" />
          Ver Totales
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
            <div className="h-72 w-full">
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
                  <Line
                    type="monotone"
                    dataKey="Palmar"
                    stroke={CENTRAL_COLORS.Palmar}
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Portuguesa"
                    stroke={CENTRAL_COLORS.Portuguesa}
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Pastora"
                    stroke={CENTRAL_COLORS.Pastora}
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Otros"
                    stroke={CENTRAL_COLORS.Otros}
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                  />
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
