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
import type { Registro } from "@shared/schema";

interface DailyChartProps {
  registros: Registro[];
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CENTRAL_COLORS: Record<string, string> = {
  Palmar: "#3b82f6",
  Portuguesa: "#22c55e",
  Pastora: "#f59e0b",
  Otros: "#8b5cf6",
  Total: "#ef4444",
};

export function DailyChart({ registros }: DailyChartProps) {
  const chartData = useMemo(() => {
    const dailyByCentral: Record<string, Record<number, number>> = {
      Palmar: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      Portuguesa: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      Pastora: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      Otros: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
    const dailyTotal: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    registros.forEach((r) => {
      const date = new Date(r.fecha + 'T12:00:00');
      const dayOfWeek = date.getDay();
      if (dailyByCentral[r.central]) {
        dailyByCentral[r.central][dayOfWeek] += r.cantidad;
      }
      dailyTotal[dayOfWeek] += r.cantidad;
    });

    return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      dia: DAY_NAMES[day],
      Palmar: dailyByCentral.Palmar[day],
      Portuguesa: dailyByCentral.Portuguesa[day],
      Pastora: dailyByCentral.Pastora[day],
      Otros: dailyByCentral.Otros[day],
      Total: dailyTotal[day],
    }));
  }, [registros]);

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
          <DialogTitle>Cantidad por Día de la Semana</DialogTitle>
          <DialogDescription>
            Totales de cada central agrupados por día de la semana
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {hasData ? (
            <div className="h-72 w-full">
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
                    stroke={CENTRAL_COLORS.Total}
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
