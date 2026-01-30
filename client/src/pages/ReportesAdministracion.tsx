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
  generateCxpCompleto,
  generateCxcCompleto,
  type PdfResult,
} from "@/lib/pdfReports";

interface ReportesAdministracionProps {
  onBack?: () => void;
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

function ReportGroupCard({ group, selectedReport, onSelect }: { 
  group: ReportGroup; 
  selectedReport: string; 
  onSelect: (value: string) => void;
}) {
  const isGroupSelected = group.options.some(opt => opt.value === selectedReport);
  
  return (
    <Card className={`h-fit transition-all ${isGroupSelected ? "ring-1 ring-orange-500/50" : ""}`}>
      <CardHeader className="py-1.5 px-2">
        <CardTitle className="text-xs font-semibold text-orange-600 dark:text-orange-400">{group.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-1 px-2">
        <RadioGroup value={selectedReport} onValueChange={onSelect} className="gap-0.5">
          {group.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-1.5">
              <RadioGroupItem 
                value={option.value} 
                id={`admin-${option.value}`}
                className="h-3 w-3"
                data-testid={`radio-admin-${option.value}`}
              />
              <Label 
                htmlFor={`admin-${option.value}`} 
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

function ReportesAdministracionContent() {
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
      
      const config = { title: "", fechaInicial, fechaFinal, unidad: "all" };
      let result: PdfResult | null = null;

      const filterByDate = (data: any[]) => {
        if (!Array.isArray(data)) return [];
        return data.filter((row: any) => {
          if (!row.fecha) return false;
          const rowDateNum = dateToComparable(row.fecha);
          if (rowDateNum === 0) return false;
          return rowDateNum >= fechaInicialNum && rowDateNum <= fechaFinalNum;
        });
      };

      const fetchAndFilter = async (endpoint: string) => {
        const response = await apiRequest("GET", endpoint);
        const allData = await response.json();
        if (!Array.isArray(allData)) {
          console.error("API no devolvió un array:", allData);
          return [];
        }
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
      } else if (selectedReport.startsWith("prestamos_")) {
        const filteredData = await fetchAndFilter("/api/administracion?tipo=prestamos");
        if (filteredData.length === 0) {
          toast({ title: "Sin datos", description: "No hay registros en el período seleccionado", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        toast({ title: "Reporte no implementado", description: "Este reporte aún no está disponible", variant: "destructive" });
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
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-2 gap-2 auto-rows-min">
          <div className="flex flex-col gap-2">
            <ReportGroupCard group={reportGroups[0]} selectedReport={selectedReport} onSelect={setSelectedReport} />
            <ReportGroupCard group={reportGroups[1]} selectedReport={selectedReport} onSelect={setSelectedReport} />
            <ReportGroupCard group={reportGroups[2]} selectedReport={selectedReport} onSelect={setSelectedReport} />
          </div>
          <div className="flex flex-col gap-2">
            <ReportGroupCard group={reportGroups[3]} selectedReport={selectedReport} onSelect={setSelectedReport} />
            <ReportGroupCard group={reportGroups[4]} selectedReport={selectedReport} onSelect={setSelectedReport} />
            <ReportGroupCard group={reportGroups[5]} selectedReport={selectedReport} onSelect={setSelectedReport} />
            
            <Card className="h-fit">
              <CardHeader className="py-1.5 px-2">
                <CardTitle className="text-xs font-semibold text-orange-600 dark:text-orange-400">Período</CardTitle>
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
                      data-testid="button-admin-fecha-filter"
                    >
                      <Calendar className="h-3 w-3" />
                      {hasActiveDate ? `${formatDateDisplay(fechaInicial)} - ${formatDateDisplay(fechaFinal)}` : "Seleccionar fecha"}
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
                      testId="admin-reportes-fecha"
                    />
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerateReport}
              disabled={!selectedReport || isLoading}
              size="sm"
              className="h-8 gap-1.5 bg-orange-600 hover:bg-orange-700"
              data-testid="button-generate-admin-report"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              {isLoading ? "Generando..." : "Generar PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportesAdministracion({
  onBack,
  onFocus,
  zIndex,
  minimizedIndex,
  isStandalone = false,
}: ReportesAdministracionProps) {
  return (
    <MyWindow
      id="reportes-administracion"
      title="Reportes Administración"
      icon={<FileText className="h-4 w-4 text-orange-600" />}
      initialPosition={{ x: 200, y: 60 }}
      initialSize={{ width: 520, height: 520 }}
      minSize={{ width: 480, height: 450 }}
      maxSize={{ width: 700, height: 700 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-orange-500"
      minimizedIndex={minimizedIndex}
      isStandalone={isStandalone}
      popoutUrl="/standalone/reportes-administracion"
    >
      <ReportesAdministracionContent />
    </MyWindow>
  );
}
