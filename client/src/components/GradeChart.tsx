import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";
import type { Registro, Central } from "@shared/schema";

interface GradeChartProps {
  registros: Registro[];
}

export function GradeChart({ registros }: GradeChartProps) {
  const [open, setOpen] = useState(false);

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const registrosConGrado = registros.filter(r => r.grado !== null && r.grado !== undefined);
  
  if (registrosConGrado.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled data-testid="button-grade-chart">
        <TrendingUp className="h-4 w-4 mr-1" />
        Grado
      </Button>
    );
  }

  // Calculate weighted average grade per central
  const centralGrades: Record<string, { totalWeighted: number; totalCantidad: number }> = {};
  let overallWeighted = 0;
  let overallCantidad = 0;
  
  registrosConGrado.forEach(r => {
    if (!centralGrades[r.central]) {
      centralGrades[r.central] = { totalWeighted: 0, totalCantidad: 0 };
    }
    const weighted = r.cantidad * (r.grado ?? 0);
    centralGrades[r.central].totalWeighted += weighted;
    centralGrades[r.central].totalCantidad += r.cantidad;
    overallWeighted += weighted;
    overallCantidad += r.cantidad;
  });

  // Build chart data with centrales + total
  const chartData = centrales
    .filter(c => centralGrades[c.nombre])
    .map(c => ({
      nombre: c.nombre,
      grado: centralGrades[c.nombre].totalCantidad > 0 
        ? Math.round((centralGrades[c.nombre].totalWeighted / centralGrades[c.nombre].totalCantidad) * 100) / 100
        : 0,
      color: c.color,
    }));

  // Add total average
  const totalAverage = overallCantidad > 0 
    ? Math.round((overallWeighted / overallCantidad) * 100) / 100 
    : 0;
  
  chartData.push({
    nombre: "Promedio Total",
    grado: totalAverage,
    color: "#000000",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-grade-chart">
          <TrendingUp className="h-4 w-4 mr-1" />
          Grado
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grado Promedio por Central</DialogTitle>
        </DialogHeader>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="nombre" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 'auto']}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [value.toFixed(2), 'Grado Promedio']}
              />
              <Bar dataKey="grado" name="Grado Promedio" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="grado" 
                  position="top" 
                  formatter={(value: number) => value.toFixed(2)}
                  style={{ fontSize: 12, fontWeight: 'bold' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
