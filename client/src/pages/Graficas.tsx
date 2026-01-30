import { useState, useMemo } from "react";
import { BarChart3, Loader2, Calendar } from "lucide-react";
import { MyWindow } from "@/components/My";
import MyFiltroDeFecha from "@/components/MyFiltroDeFecha";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

export type ModuloFiltroGraficas = "bancos" | "administracion" | "almacen" | "cosecha" | null;

interface GraficasProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
  moduloFiltro?: ModuloFiltroGraficas;
}

interface ChartGroup {
  title: string;
  options: { value: string; label: string }[];
  modulos: ModuloFiltroGraficas[];
}

const chartGroups: ChartGroup[] = [
  {
    title: "Bancos",
    modulos: ["bancos", null],
    options: [
      { value: "bancos_saldos_por_banco", label: "Saldos por banco" },
      { value: "bancos_movimientos_mes", label: "Movimientos por mes" },
      { value: "bancos_ingresos_egresos", label: "Ingresos vs Egresos" },
    ],
  },
  {
    title: "Administración",
    modulos: ["administracion", null],
    options: [
      { value: "admin_gastos_por_actividad", label: "Gastos por actividad" },
      { value: "admin_gastos_por_proveedor", label: "Gastos por proveedor" },
      { value: "admin_ingresos_por_mes", label: "Ingresos por mes" },
      { value: "admin_nomina_por_personal", label: "Nómina por personal" },
    ],
  },
  {
    title: "Almacén",
    modulos: ["almacen", null],
    options: [
      { value: "almacen_existencias", label: "Existencias por producto" },
      { value: "almacen_movimientos_mes", label: "Movimientos por mes" },
    ],
  },
  {
    title: "Cosecha",
    modulos: ["cosecha", null],
    options: [
      { value: "cosecha_por_lote", label: "Producción por lote" },
      { value: "cosecha_por_destino", label: "Distribución por destino" },
      { value: "cosecha_por_mes", label: "Producción por mes" },
    ],
  },
];

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57",
];

function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }
  return dateStr;
}

function ChartGroupCard({ group, selectedChart, onSelect }: { 
  group: ChartGroup; 
  selectedChart: string; 
  onSelect: (value: string) => void;
}) {
  const isGroupSelected = group.options.some(opt => opt.value === selectedChart);
  
  return (
    <Card className={`h-fit transition-all ${isGroupSelected ? "ring-1 ring-indigo-500/50" : ""}`}>
      <CardHeader className="py-1.5 px-2">
        <CardTitle className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{group.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-1 px-2">
        <RadioGroup value={selectedChart} onValueChange={onSelect} className="gap-0.5">
          {group.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-1.5">
              <RadioGroupItem 
                value={option.value} 
                id={option.value}
                className="h-3 w-3"
                data-testid={`radio-${option.value}`}
              />
              <Label 
                htmlFor={option.value} 
                className="text-[11px] cursor-pointer leading-tight"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

function GraficasContent({ moduloFiltro }: { moduloFiltro?: ModuloFiltroGraficas }) {
  const currentYear = new Date().getFullYear();
  const [selectedChart, setSelectedChart] = useState<string>("");
  const [fechaInicial, setFechaInicial] = useState<string>(() => 
    formatDateForInput(new Date(currentYear, 0, 1))
  );
  const [fechaFinal, setFechaFinal] = useState<string>(() => 
    formatDateForInput(new Date())
  );
  const { toast } = useToast();

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  const filteredGroups = moduloFiltro 
    ? chartGroups.filter(g => g.modulos.includes(moduloFiltro))
    : chartGroups;
  
  const handleDateChange = (range: { start: string; end: string }) => {
    if (range.start) setFechaInicial(range.start);
    if (range.end) setFechaFinal(range.end);
  };
  
  const hasActiveDate = fechaInicial || fechaFinal;

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["/api/graficas", selectedChart, fechaInicial, fechaFinal],
    enabled: !!selectedChart,
  });

  const sampleData = useMemo(() => {
    if (selectedChart.includes("saldos")) {
      return [
        { name: "Banesco", value: 125000 },
        { name: "Provincial", value: 85000 },
        { name: "Venezuela", value: 45000 },
        { name: "Exterior", value: 32000 },
        { name: "BNC", value: 18000 },
      ];
    } else if (selectedChart.includes("mes") || selectedChart.includes("ingresos")) {
      return [
        { name: "Ene", ingresos: 45000, egresos: 32000 },
        { name: "Feb", ingresos: 52000, egresos: 38000 },
        { name: "Mar", ingresos: 48000, egresos: 41000 },
        { name: "Abr", ingresos: 61000, egresos: 45000 },
        { name: "May", ingresos: 55000, egresos: 42000 },
        { name: "Jun", ingresos: 67000, egresos: 48000 },
      ];
    } else if (selectedChart.includes("actividad") || selectedChart.includes("proveedor") || selectedChart.includes("personal")) {
      return [
        { name: "Item 1", value: 35 },
        { name: "Item 2", value: 25 },
        { name: "Item 3", value: 20 },
        { name: "Item 4", value: 12 },
        { name: "Item 5", value: 8 },
      ];
    } else if (selectedChart.includes("lote") || selectedChart.includes("destino")) {
      return [
        { name: "Lote A", value: 1250 },
        { name: "Lote B", value: 980 },
        { name: "Lote C", value: 750 },
        { name: "Lote D", value: 620 },
        { name: "Lote E", value: 480 },
      ];
    } else {
      return [
        { name: "Categoría 1", value: 400 },
        { name: "Categoría 2", value: 300 },
        { name: "Categoría 3", value: 200 },
        { name: "Categoría 4", value: 100 },
      ];
    }
  }, [selectedChart]);

  const renderChart = () => {
    if (!selectedChart) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Seleccione un tipo de gráfica
        </div>
      );
    }

    if (selectedChart.includes("ingresos_egresos") || selectedChart.includes("_mes")) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sampleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {"ingresos" in (sampleData[0] || {}) ? (
              <>
                <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
                <Bar dataKey="egresos" fill="#ef4444" name="Egresos" />
              </>
            ) : (
              <Bar dataKey="value" fill="#6366f1" name="Valor" />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (selectedChart.includes("por_mes") || selectedChart.includes("produccion")) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {"ingresos" in (sampleData[0] || {}) ? (
              <>
                <Line type="monotone" dataKey="ingresos" stroke="#22c55e" name="Ingresos" />
                <Line type="monotone" dataKey="egresos" stroke="#ef4444" name="Egresos" />
              </>
            ) : (
              <Line type="monotone" dataKey="value" stroke="#6366f1" name="Valor" />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={sampleData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {sampleData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-2 flex-1 overflow-hidden">
        <div className={`flex flex-col gap-2 ${moduloFiltro ? "w-40" : "w-48"} shrink-0 overflow-auto`}>
          {filteredGroups.map((group) => (
            <ChartGroupCard 
              key={group.title} 
              group={group} 
              selectedChart={selectedChart} 
              onSelect={setSelectedChart} 
            />
          ))}
          
          <Card className="h-fit">
            <CardHeader className="py-1.5 px-2">
              <CardTitle className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Período</CardTitle>
            </CardHeader>
            <CardContent className="py-1.5 px-2">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full h-7 text-xs gap-1 ${
                      hasActiveDate ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-300" : ""
                    }`}
                    data-testid="button-fecha-filter"
                  >
                    <Calendar className="h-3 w-3" />
                    {hasActiveDate ? `${formatDateDisplay(fechaInicial)} - ${formatDateDisplay(fechaFinal)}` : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0 border-0 bg-transparent shadow-none" 
                  align="end"
                  sideOffset={5}
                >
                  <MyFiltroDeFecha
                    onChange={handleDateChange}
                    onClose={() => setDatePopoverOpen(false)}
                    testId="graficas-fecha"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1 border rounded-md bg-card p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>
    </div>
  );
}

export default function Graficas({
  onBack,
  onFocus,
  zIndex,
  minimizedIndex,
  isStandalone = false,
  moduloFiltro,
}: GraficasProps) {
  const moduloTitles: Record<string, string> = {
    bancos: "Gráficas - Bancos",
    administracion: "Gráficas - Administración",
    almacen: "Gráficas - Almacén",
    cosecha: "Gráficas - Cosecha",
  };
  
  return (
    <MyWindow
      id={moduloFiltro ? `graficas-${moduloFiltro}` : "graficas"}
      title={moduloFiltro ? moduloTitles[moduloFiltro] || "Gráficas" : "Gráficas"}
      icon={<BarChart3 className="h-4 w-4 text-indigo-600" />}
      initialPosition={{ x: 200, y: 60 }}
      initialSize={{ width: moduloFiltro ? 600 : 750, height: moduloFiltro ? 450 : 550 }}
      minSize={{ width: moduloFiltro ? 500 : 650, height: moduloFiltro ? 350 : 450 }}
      maxSize={{ width: 1000, height: 800 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-indigo-500"
      minimizedIndex={minimizedIndex}
      isStandalone={isStandalone}
      popoutUrl={moduloFiltro ? `/standalone/graficas/${moduloFiltro}` : "/standalone/graficas"}
    >
      <GraficasContent moduloFiltro={moduloFiltro} />
    </MyWindow>
  );
}
