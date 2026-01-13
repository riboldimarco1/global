import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Registro } from "@shared/schema";

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
    const centrales = ["Palmar", "Portuguesa", "Pastora", "Otros"];
    return centrales.map((central) => {
      const total = registros
        .filter((r) => r.central === central)
        .reduce((sum, r) => sum + r.cantidad, 0);
      return {
        central,
        cantidad: total,
        fill: CENTRAL_COLORS[central],
      };
    }).filter(d => d.cantidad > 0);
  }, [registros]);

  const totalGeneral = useMemo(() => {
    return registros.reduce((sum, r) => sum + r.cantidad, 0);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Totales por Central (Todas las Semanas)</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {chartData.length > 0 ? (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="central" type="category" width={80} />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      }
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold">
                  Total General:{" "}
                  <span className="text-primary">
                    {totalGeneral.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              </div>
            </>
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
