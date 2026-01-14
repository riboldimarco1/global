import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import type { Registro } from "@shared/schema";

interface GradeChartProps {
  registros: Registro[];
}

export function GradeChart({ registros }: GradeChartProps) {
  const [open, setOpen] = useState(false);

  const registrosConGrado = registros.filter(r => r.grado !== null && r.grado !== undefined);
  
  if (registrosConGrado.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled data-testid="button-grade-chart">
        <TrendingUp className="h-4 w-4 mr-1" />
        Grado
      </Button>
    );
  }

  const dailyGrades: Record<string, { totalWeighted: number; totalCantidad: number }> = {};
  
  registrosConGrado.forEach(r => {
    if (!dailyGrades[r.fecha]) {
      dailyGrades[r.fecha] = { totalWeighted: 0, totalCantidad: 0 };
    }
    dailyGrades[r.fecha].totalWeighted += r.cantidad * (r.grado ?? 0);
    dailyGrades[r.fecha].totalCantidad += r.cantidad;
  });

  const chartData = Object.entries(dailyGrades)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, data]) => {
      const [, month, day] = fecha.split('-');
      return {
        fecha: `${day}/${month}`,
        grado: data.totalCantidad > 0 ? data.totalWeighted / data.totalCantidad : 0,
      };
    });

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
          <DialogTitle>Grado Promedio por Fecha</DialogTitle>
        </DialogHeader>
        <div className="h-80 w-full">
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
                formatter={(value: number) => [value.toFixed(2), 'Grado Prom.']}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="grado" 
                name="Grado Promedio"
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
