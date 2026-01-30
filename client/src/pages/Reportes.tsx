import { useState } from "react";
import { FileText, Loader2, ChevronRight } from "lucide-react";
import { MyWindow, MyFiltroDeFecha } from "@/components/My";
import { Button } from "@/components/ui/button";
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

interface ReportOption {
  value: string;
  label: string;
}

interface ReportGroup {
  title: string;
  options: ReportOption[];
}

const reportGroups: ReportGroup[] = [
  {
    title: "Gastos y Facturas",
    options: [
      { value: "gastos_completo", label: "Completo" },
      { value: "gastos_actividad", label: "Por actividad" },
      { value: "gastos_proveedor", label: "Por proveedor" },
      { value: "gastos_insumo", label: "Por insumo" },
    ],
  },
  {
    title: "Nomina",
    options: [
      { value: "nomina_completo", label: "Completo" },
      { value: "nomina_personal", label: "Por personal" },
      { value: "nomina_actividad", label: "Por actividad" },
    ],
  },
  {
    title: "Ventas",
    options: [
      { value: "ventas_completo", label: "Completo" },
      { value: "ventas_producto", label: "Por producto" },
    ],
  },
  {
    title: "Cuentas por pagar",
    options: [
      { value: "cxp_completo", label: "Completo" },
    ],
  },
  {
    title: "Cuentas por cobrar",
    options: [
      { value: "cxc_completo", label: "Completo" },
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
    title: "Almacen",
    options: [
      { value: "almacen_completo", label: "Completo" },
      { value: "almacen_existencia", label: "Existencia" },
    ],
  },
  {
    title: "Cosecha",
    options: [
      { value: "cosecha_ord_lote", label: "Por lote" },
      { value: "cosecha_res_lote", label: "Resumen lote" },
      { value: "cosecha_ord_destino", label: "Por destino" },
      { value: "cosecha_res_destino", label: "Resumen destino" },
    ],
  },
];

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
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [fechaInicial, setFechaInicial] = useState<string>("");
  const [fechaFinal, setFechaFinal] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDateChange = (range: { start: string; end: string }) => {
    setFechaInicial(range.start);
    setFechaFinal(range.end);
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast({ title: "Seleccione un reporte", variant: "destructive" });
      return;
    }
    if (!fechaInicial || !fechaFinal) {
      toast({ title: "Seleccione un período", description: "Use el filtro de fecha", variant: "destructive" });
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
        toast({ title: "Reporte no implementado", variant: "destructive" });
      }

      if (result) {
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank");
        toast({ title: "PDF generado", description: "Se abrió en una nueva pestaña" });
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({ title: "Error", description: error.message || "Error al generar el reporte", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedLabel = () => {
    for (const group of reportGroups) {
      const option = group.options.find(o => o.value === selectedReport);
      if (option) return `${group.title} - ${option.label}`;
    }
    return null;
  };

  return (
    <div className="flex h-full gap-3 p-3">
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 flex-1 overflow-auto">
          {reportGroups.map((group) => (
            <div 
              key={group.title}
              className="border rounded-lg overflow-hidden bg-card"
            >
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.title ? null : group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-muted/50 hover:bg-muted transition-colors"
                data-testid={`group-${group.title}`}
              >
                <span>{group.title}</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${expandedGroup === group.title ? "rotate-90" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-all ${expandedGroup === group.title ? "max-h-96" : "max-h-0"}`}>
                <div className="p-2 space-y-1">
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedReport(option.value)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                        selectedReport === option.value 
                          ? "bg-orange-500 text-white" 
                          : "hover:bg-muted"
                      }`}
                      data-testid={`option-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex-1 text-sm">
            {selectedReport ? (
              <span className="font-medium text-orange-600">{getSelectedLabel()}</span>
            ) : (
              <span className="text-muted-foreground">Seleccione un reporte</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {fechaInicial && fechaFinal ? (
              `${fechaInicial} - ${fechaFinal}`
            ) : (
              "Sin período"
            )}
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport || !fechaInicial || !fechaFinal || isLoading}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="button-generate-report"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="ml-1.5">{isLoading ? "Generando..." : "Generar PDF"}</span>
          </Button>
        </div>
      </div>

      <div className="w-56 shrink-0">
        <MyFiltroDeFecha
          onChange={handleDateChange}
          testId="reportes-fecha"
        />
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
      initialSize={{ width: 900, height: 550 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1200, height: 800 }}
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
