import { useState } from "react";
import { FileText, Loader2, Calendar } from "lucide-react";
import { MyWindow } from "@/components/My";
import MyFiltroDeFecha from "@/components/MyFiltroDeFecha";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  generateGastosCompleto,
  generateGastosResumidoPorActividad,
  generateGastosResumidoPorProveedor,
  generateGastosResumidoPorInsumo,
  generateNominaCompleto,
  generateNominaResumidoPorPersonal,
  generateNominaResumidoPorActividad,
  generateVentasCompleto,
  generateVentasResumidoPorProducto,
  generateBancosCompleto,
  generateBancosSaldos,
  generateAlmacenCompleto,
  generateAlmacenExistencia,
  generateCosechaOrdenadoPorLote,
  generateCosechaResumidoPorLote,
  generateCosechaOrdenadoPorDestino,
  generateCosechaResumidoPorDestino,
  generateCxpCompleto,
  generateCxcCompleto,
  type PdfResult,
} from "@/lib/pdfReports";

interface ReportesProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

interface ReportGroup {
  title: string;
  options: { value: string; label: string }[];
}

const reportGroups: ReportGroup[] = [
  {
    title: "Gastos y Facturas",
    options: [
      { value: "gastos_completo", label: "Completo" },
      { value: "gastos_actividad", label: "Resumido por actividad" },
      { value: "gastos_proveedor", label: "Resumido por proveedor" },
      { value: "gastos_insumo", label: "Resumido por insumo" },
    ],
  },
  {
    title: "Nomina",
    options: [
      { value: "nomina_completo", label: "Completo" },
      { value: "nomina_personal", label: "Resumido por personal" },
      { value: "nomina_actividad", label: "Resumido por actividad" },
    ],
  },
  {
    title: "Ventas",
    options: [
      { value: "ventas_completo", label: "Completo" },
      { value: "ventas_producto", label: "Resumido por producto" },
    ],
  },
  {
    title: "Todo",
    options: [
      { value: "todo_completo", label: "Completo" },
    ],
  },
  {
    title: "Cuentas por pagar",
    options: [
      { value: "cxp_completo", label: "Completo" },
      { value: "cxp_ord_actividad", label: "Ordenado por actividad" },
      { value: "cxp_res_actividad", label: "Resumido por actividad" },
      { value: "cxp_ord_proveedor", label: "Ordenado por proveedor" },
      { value: "cxp_res_proveedor", label: "Resumido por proveedor" },
    ],
  },
  {
    title: "Cuentas por cobrar",
    options: [
      { value: "cxc_completo", label: "Completo" },
      { value: "cxc_ord_producto", label: "Ordenado por producto" },
      { value: "cxc_res_producto", label: "Resumido por producto" },
    ],
  },
  {
    title: "Prestamos",
    options: [
      { value: "prestamos_completo", label: "Completo" },
      { value: "prestamos_ord_personal", label: "Ordenado por personal" },
      { value: "prestamos_res_personal", label: "Resumido por personal" },
    ],
  },
  {
    title: "Bancos",
    options: [
      { value: "bancos_completo", label: "Completo" },
      { value: "bancos_saldos", label: "Saldos" },
    ],
  },
  {
    title: "Administracion",
    options: [
      { value: "admin_ingresos_unidad", label: "Ingresos/Egresos por mes de esta unidad" },
      { value: "admin_ingresos_todas", label: "Ingresos/Egresos por mes de todas las unidades" },
    ],
  },
  {
    title: "Almacen",
    options: [
      { value: "almacen_completo", label: "Completo" },
      { value: "almacen_existencia", label: "Existencia" },
    ],
  },
  {
    title: "Cosecha",
    options: [
      { value: "cosecha_ord_lote", label: "Ordenado por lote" },
      { value: "cosecha_res_lote", label: "Resumido por lote" },
      { value: "cosecha_ord_destino", label: "Ordenado por destino" },
      { value: "cosecha_res_destino", label: "Resumido por destino" },
      { value: "cosecha_kilos_tablon", label: "Kilos por tablon" },
      { value: "cosecha_completo_fecha", label: "Completo por fecha" },
      { value: "cosecha_estad_produccion", label: "Estad. de produccion" },
      { value: "cosecha_estad_ciclos", label: "Estad. ciclos (esc pal)" },
    ],
  },
];


function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function ReportGroupCard({ group, selectedReport, onSelect }: { 
  group: ReportGroup; 
  selectedReport: string; 
  onSelect: (value: string) => void;
}) {
  const isGroupSelected = group.options.some(opt => opt.value === selectedReport);
  
  return (
    <Card className={`h-fit transition-all ${isGroupSelected ? "ring-2 ring-orange-500/50 shadow-md" : "hover:shadow-sm"}`}>
      <CardHeader className="py-2 px-3 bg-gradient-to-r from-orange-500/10 to-transparent">
        <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400">{group.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <RadioGroup value={selectedReport} onValueChange={onSelect}>
          {group.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={option.value} 
                id={option.value}
                data-testid={`radio-${option.value}`}
              />
              <Label 
                htmlFor={option.value} 
                className="text-xs cursor-pointer"
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

function dateToComparable(dateStr: string): number {
  if (!dateStr) return 0;
  
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return parseInt(`${parts[0]}${parts[1]}${parts[2]}`, 10);
    }
  }
  
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) {
        year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
      }
      return parseInt(`${year}${month}${day}`, 10);
    }
  }
  
  return 0;
}

function ReportesContent() {
  const currentYear = new Date().getFullYear();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [fechaInicial, setFechaInicial] = useState<string>(() => 
    formatDateForInput(new Date(currentYear, 0, 1))
  );
  const [fechaFinal, setFechaFinal] = useState<string>(() => 
    formatDateForInput(new Date())
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  const handleDateChange = (range: { start: string; end: string }) => {
    if (range.start) setFechaInicial(range.start);
    if (range.end) setFechaFinal(range.end);
  };
  
  const hasActiveDate = fechaInicial || fechaFinal;

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast({ title: "Seleccione un reporte", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const fechaInicialNum = dateToComparable(fechaInicial);
      const fechaFinalNum = dateToComparable(fechaFinal);
      
      const config = { title: "", fechaInicial, fechaFinal };
      let result: PdfResult | null = null;

      const filterByDate = (data: any[]) => data.filter((row: any) => {
        if (!row.fecha) return false;
        const rowDateNum = dateToComparable(row.fecha);
        if (rowDateNum === 0) return false;
        return rowDateNum >= fechaInicialNum && rowDateNum <= fechaFinalNum;
      });

      const fetchAndFilter = async (endpoint: string) => {
        const response = await apiRequest("GET", endpoint);
        const allData = await response.json();
        return filterByDate(allData);
      };

      if (selectedReport.startsWith("gastos_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=facturas");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "gastos_completo": result = generateGastosCompleto(filteredData, config); break;
          case "gastos_actividad": result = generateGastosResumidoPorActividad(filteredData, config); break;
          case "gastos_proveedor": result = generateGastosResumidoPorProveedor(filteredData, config); break;
          case "gastos_insumo": result = generateGastosResumidoPorInsumo(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("nomina_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=nomina");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "nomina_completo": result = generateNominaCompleto(filteredData, config); break;
          case "nomina_personal": result = generateNominaResumidoPorPersonal(filteredData, config); break;
          case "nomina_actividad": result = generateNominaResumidoPorActividad(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("ventas_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=ventas");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "ventas_completo": result = generateVentasCompleto(filteredData, config); break;
          case "ventas_producto": result = generateVentasResumidoPorProducto(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("bancos_")) {
        const filteredData = await fetchAndFilter("/api/bancos");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "bancos_completo": result = generateBancosCompleto(filteredData, config); break;
          case "bancos_saldos": result = generateBancosSaldos(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("almacen_")) {
        const filteredData = await fetchAndFilter("/api/almacen");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "almacen_completo": result = generateAlmacenCompleto(filteredData, config); break;
          case "almacen_existencia": result = generateAlmacenExistencia(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("cosecha_")) {
        const filteredData = await fetchAndFilter("/api/cosecha");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        switch (selectedReport) {
          case "cosecha_ord_lote": result = generateCosechaOrdenadoPorLote(filteredData, config); break;
          case "cosecha_res_lote": result = generateCosechaResumidoPorLote(filteredData, config); break;
          case "cosecha_ord_destino": result = generateCosechaOrdenadoPorDestino(filteredData, config); break;
          case "cosecha_res_destino": result = generateCosechaResumidoPorDestino(filteredData, config); break;
          default:
            toast({ title: "Reporte no implementado", description: "Este reporte aún no está disponible", variant: "destructive" });
        }
      } else if (selectedReport.startsWith("cxp_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=cuentasporpagar");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        result = generateCxpCompleto(filteredData, config);
      } else if (selectedReport.startsWith("cxc_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=cuentasporcobrar");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        result = generateCxcCompleto(filteredData, config);
      } else {
        toast({ title: "Reporte no implementado", description: "Este reporte aún no está disponible", variant: "destructive" });
      }

      if (result) {
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank");
        toast({ title: "PDF generado", description: "Se abrió en una nueva pestaña. Usa Ctrl+P para imprimir." });
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: error.message || "Error al generar el reporte", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 p-3 border-b bg-gradient-to-r from-orange-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-medium text-muted-foreground">Seleccione un reporte y el período de fechas</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs gap-1.5 border-rose-500/30 ${
                  hasActiveDate ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : ""
                }`}
                data-testid="button-fecha-filter"
              >
                <Calendar className="h-3.5 w-3.5" />
                Fecha
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
                testId="reportes-fecha"
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport || isLoading}
            className="h-8 gap-2 bg-orange-600 hover:bg-orange-700"
            data-testid="button-generate-report"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isLoading ? "Generando..." : "Generar PDF"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-4 gap-3 auto-rows-min">
          {reportGroups.map((group) => (
            <ReportGroupCard
              key={group.title}
              group={group}
              selectedReport={selectedReport}
              onSelect={setSelectedReport}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Reportes({
  onBack,
  onFocus,
  zIndex,
  minimizedIndex,
  isStandalone = false,
}: ReportesProps) {
  return (
    <MyWindow
      id="reportes"
      title="Reportes PDF"
      icon={<FileText className="h-4 w-4 text-orange-600" />}
      initialPosition={{ x: 180, y: 40 }}
      initialSize={{ width: 1100, height: 650 }}
      minSize={{ width: 800, height: 500 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-orange-500"
      minimizedIndex={minimizedIndex}
      isStandalone={isStandalone}
      popoutUrl="/standalone/reportes"
    >
      <ReportesContent />
    </MyWindow>
  );
}
