import { useState, useEffect } from "react";
import { FileText, Loader2, ArrowLeft } from "lucide-react";
import { MyWindow } from "@/components/My";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { apiRequest } from "@/lib/queryClient";
import { type ReportFilters } from "@/components/MyFilter";
import ReporteArrime from "@/components/ReporteArrime";
import ReporteIngresosEgresos from "@/components/ReporteIngresosEgresos";
import { MyButtonStyle } from "@/components/MyButtonStyle";
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
  generateCxcOrdenadoPorCliente,
  generateCxcResumidoPorCliente,
  type PdfResult,
} from "@/lib/pdfReports";

interface ReportesProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
  externalFilters?: ReportFilters;
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
      { value: "cxc_ord_cliente", label: "Ordenado por cliente" },
      { value: "cxc_res_cliente", label: "Resumido por cliente" },
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
  {
    title: "Arrime",
    options: [
      { value: "arrime_semanal", label: "Validación de Caña (semanal)" },
    ],
  },
];

const MODULE_TO_REPORT_GROUPS: Record<string, string[]> = {
  administracion: ["Gastos y Facturas", "Nomina", "Ventas", "Cuentas por pagar", "Cuentas por cobrar", "Prestamos", "Administracion"],
  bancos: ["Bancos"],
  almacen: ["Almacen"],
  cosecha: ["Cosecha"],
  arrime: ["Arrime"],
};

const TAB_TO_REPORT_GROUPS: Record<string, string[]> = {
  facturas: ["Gastos y Facturas", "Administracion"],
  nomina: ["Nomina", "Administracion"],
  ventas: ["Ventas", "Administracion"],
  cuentasporpagar: ["Cuentas por pagar", "Administracion"],
  cuentasporcobrar: ["Cuentas por cobrar", "Administracion"],
  prestamos: ["Prestamos", "Administracion"],
  movimientos: ["Bancos"],
  entradas: ["Almacen"],
  salidas: ["Almacen"],
  arrime: ["Cosecha"],
};

function formatDateDDMMAA(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function ReportGroupCard({ group, selectedReport, onSelect, isEnabled = true }: { 
  group: ReportGroup; 
  selectedReport: string; 
  onSelect: (value: string) => void;
  isEnabled?: boolean;
}) {
  const isGroupSelected = group.options.some(opt => opt.value === selectedReport);
  
  return (
    <Card className={`h-fit transition-all ${isGroupSelected ? "ring-1 ring-orange-500/50" : ""} ${!isEnabled ? "opacity-30 pointer-events-none blur-[1px]" : ""}`}>
      <CardHeader className="py-1.5 px-2">
        <CardTitle className="text-xs font-bold text-orange-800 dark:text-orange-300">{group.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-1 px-2">
        <RadioGroup value={selectedReport} onValueChange={onSelect} className="gap-0.5">
          {group.options.map((option) => (
            <div key={option.value} className="flex items-center space-x-1.5">
              <RadioGroupItem 
                value={option.value} 
                id={option.value}
                className="h-3 w-3"
                data-testid={`radio-${option.value}`}
                disabled={!isEnabled}
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

function dateToComparable(dateStr: string): number {
  if (!dateStr) return 0;
  
  // Handle timestamp format "YYYY-MM-DD HH:MM:SS" - extract only date part
  const datePart = dateStr.split(" ")[0];
  
  if (datePart.includes("-")) {
    const parts = datePart.split("-");
    if (parts.length === 3) {
      const year = parts[0].padStart(4, "20");
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return parseInt(`${year}${month}${day}`, 10);
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

function ReportesContent({ externalFilters, onClose }: { externalFilters?: ReportFilters; onClose?: () => void }) {
  const currentYear = new Date().getFullYear();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: externalFilters?.dateRange?.start || formatDateDDMMAA(new Date(currentYear, 0, 1)),
    end: externalFilters?.dateRange?.end || formatDateDDMMAA(new Date())
  });
  const [unidad, setUnidad] = useState<string>(externalFilters?.unidad || "all");
  const [banco, setBanco] = useState<string>(externalFilters?.banco || "all");
  const [textFilters, setTextFilters] = useState<Record<string, string>>(externalFilters?.textFilters || {});
  const [descripcion, setDescripcion] = useState<string>(externalFilters?.descripcion || "");
  const [booleanFilters, setBooleanFilters] = useState<Record<string, string>>(externalFilters?.booleanFilters || {});
  const [isLoading, setIsLoading] = useState(false);
  const [showArrimeReport, setShowArrimeReport] = useState<boolean>(false);
  const [showIngresosReport, setShowIngresosReport] = useState<boolean>(false);
  const [ingresosConfig, setIngresosConfig] = useState<{ unidad: string; fechaInicio: string; fechaFin: string; fechaInicioDisplay: string; fechaFinDisplay: string } | null>(null);
  const { toast } = useToast();
  const { showPop } = useMyPop();

  const sourceModule = externalFilters?.sourceModule;
  const activeTab = externalFilters?.activeTab;
  const enabledGroups = activeTab 
    ? TAB_TO_REPORT_GROUPS[activeTab] || (sourceModule ? MODULE_TO_REPORT_GROUPS[sourceModule] || [] : null)
    : (sourceModule ? MODULE_TO_REPORT_GROUPS[sourceModule] || [] : null);

  useEffect(() => {
    if (externalFilters) {
      // Resetear todos los filtros a los valores de externalFilters (o defaults si no existen)
      setDateRange({
        start: externalFilters.dateRange?.start || formatDateDDMMAA(new Date(currentYear, 0, 1)),
        end: externalFilters.dateRange?.end || formatDateDDMMAA(new Date())
      });
      setUnidad(externalFilters.unidad || "all");
      setBanco(externalFilters.banco || "all");
      setTextFilters(externalFilters.textFilters || {});
      setDescripcion(externalFilters.descripcion || "");
      setBooleanFilters(externalFilters.booleanFilters || {});
    }
  }, [externalFilters, currentYear]);

  const hasActiveDate = dateRange.start || dateRange.end;

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      showPop({ title: "Advertencia", message: "Seleccione un reporte" });
      return;
    }

    setIsLoading(true);

    try {
      const fechaInicialNum = dateToComparable(dateRange.start);
      const fechaFinalNum = dateToComparable(dateRange.end);
      
      console.log("Filtro de fechas:", { fechaInicial: dateRange.start, fechaFinal: dateRange.end, fechaInicialNum, fechaFinalNum });
      
      const config = { title: "", fechaInicial: dateRange.start, fechaFinal: dateRange.end, unidad: "all" };
      let result: PdfResult | null = null;

      const filterByDate = (data: any[]) => {
        if (!Array.isArray(data)) return [];
        console.log("Total registros antes de filtrar:", data.length);
        const filtered = data.filter((row: any) => {
          if (!row.fecha) return false;
          const rowDateNum = dateToComparable(row.fecha);
          if (rowDateNum === 0) return false;
          return rowDateNum >= fechaInicialNum && rowDateNum <= fechaFinalNum;
        });
        console.log("Total registros después de filtrar:", filtered.length);
        if (filtered.length > 0) {
          console.log("Primera fecha filtrada:", filtered[0].fecha, "->", dateToComparable(filtered[0].fecha));
          console.log("Última fecha filtrada:", filtered[filtered.length-1].fecha, "->", dateToComparable(filtered[filtered.length-1].fecha));
        }
        return filtered;
      };

      const convertDDMMAATOISO = (dateStr: string): string => {
        if (!dateStr) return "";
        const parts = dateStr.split("/");
        if (parts.length !== 3) return dateStr;
        const [day, month, yearShort] = parts;
        const year = parseInt(yearShort) < 50 ? `20${yearShort}` : `19${yearShort}`;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      const fetchWithServerFilter = async (baseEndpoint: string) => {
        const fechaInicioISO = convertDDMMAATOISO(dateRange.start);
        const fechaFinISO = convertDDMMAATOISO(dateRange.end);
        const separator = baseEndpoint.includes("?") ? "&" : "?";
        let endpoint = `${baseEndpoint}${separator}fechaInicio=${fechaInicioISO}&fechaFin=${fechaFinISO}&limit=10000`;
        if (unidad && unidad !== "all") {
          endpoint += `&unidad=${encodeURIComponent(unidad)}`;
        }
        // Agregar filtro de descripción
        if (descripcion && descripcion.trim()) {
          endpoint += `&descripcion=${encodeURIComponent(descripcion.trim())}`;
        }
        // Agregar textFilters
        for (const [key, value] of Object.entries(textFilters)) {
          if (value) {
            endpoint += `&${key}=${encodeURIComponent(value)}`;
          }
        }
        // Agregar booleanFilters
        for (const [key, value] of Object.entries(booleanFilters)) {
          if (value && value !== "all") {
            endpoint += `&${key}=${encodeURIComponent(value)}`;
          }
        }
        console.log("Fetching from:", endpoint);
        const response = await apiRequest("GET", endpoint);
        const result = await response.json();
        const allData = Array.isArray(result) ? result : (result.data || []);
        console.log("Registros recibidos del servidor:", allData.length);
        return allData;
      };

      if (selectedReport.startsWith("gastos_")) {
        const filteredData = await fetchWithServerFilter("/api/administracion?tipo=facturas");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "gastos_completo": result = generateGastosCompleto(filteredData, config); break;
          case "gastos_actividad": result = generateGastosResumidoPorActividad(filteredData, config); break;
          case "gastos_proveedor": result = generateGastosResumidoPorProveedor(filteredData, config); break;
          case "gastos_insumo": result = generateGastosResumidoPorInsumo(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("nomina_")) {
        const filteredData = await fetchWithServerFilter("/api/administracion?tipo=nomina");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "nomina_completo": result = generateNominaCompleto(filteredData, config); break;
          case "nomina_personal": result = generateNominaResumidoPorPersonal(filteredData, config); break;
          case "nomina_actividad": result = generateNominaResumidoPorActividad(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("ventas_")) {
        const filteredData = await fetchWithServerFilter("/api/administracion?tipo=ventas");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "ventas_completo": result = generateVentasCompleto(filteredData, config); break;
          case "ventas_producto": result = generateVentasResumidoPorProducto(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("bancos_")) {
        const filteredData = await fetchWithServerFilter("/api/bancos");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "bancos_completo": result = generateBancosCompleto(filteredData, config); break;
          case "bancos_saldos": result = generateBancosSaldos(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("almacen_")) {
        const filteredData = await fetchWithServerFilter("/api/almacen");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "almacen_completo": result = generateAlmacenCompleto(filteredData, config); break;
          case "almacen_existencia": result = generateAlmacenExistencia(filteredData, config); break;
        }
      } else if (selectedReport.startsWith("cosecha_")) {
        const filteredData = await fetchWithServerFilter("/api/cosecha");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        switch (selectedReport) {
          case "cosecha_ord_lote": result = generateCosechaOrdenadoPorLote(filteredData, config); break;
          case "cosecha_res_lote": result = generateCosechaResumidoPorLote(filteredData, config); break;
          case "cosecha_ord_destino": result = generateCosechaOrdenadoPorDestino(filteredData, config); break;
          case "cosecha_res_destino": result = generateCosechaResumidoPorDestino(filteredData, config); break;
          default:
            showPop({ title: "Reporte no implementado", message: "Este reporte aún no está disponible" });
        }
      } else if (selectedReport.startsWith("cxp_")) {
        const filteredData = await fetchWithServerFilter("/api/administracion?tipo=cuentasporpagar");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        result = generateCxpCompleto(filteredData, config);
      } else if (selectedReport.startsWith("cxc_")) {
        const filteredData = await fetchWithServerFilter("/api/administracion?tipo=cuentasporcobrar");
        if (filteredData.length === 0) {
          showPop({ title: "Sin datos", message: "No hay registros en el período seleccionado" });
          setIsLoading(false);
          if (onClose) onClose();
          return;
        }
        if (selectedReport === "cxc_ord_cliente") {
          result = generateCxcOrdenadoPorCliente(filteredData, config);
        } else if (selectedReport === "cxc_res_cliente") {
          result = generateCxcResumidoPorCliente(filteredData, config);
        } else {
          result = generateCxcCompleto(filteredData, config);
        }
      } else if (selectedReport.startsWith("admin_")) {
        const fechaInicioISO = convertDDMMAATOISO(dateRange.start);
        const fechaFinISO = convertDDMMAATOISO(dateRange.end);
        setIngresosConfig({
          unidad: selectedReport === "admin_ingresos_unidad" ? (config.unidad || "all") : "all",
          fechaInicio: fechaInicioISO,
          fechaFin: fechaFinISO,
          fechaInicioDisplay: dateRange.start,
          fechaFinDisplay: dateRange.end,
        });
        setShowIngresosReport(true);
        setIsLoading(false);
        return;
      } else if (selectedReport === "arrime_semanal") {
        setShowArrimeReport(true);
        setIsLoading(false);
        return;
      } else {
        showPop({ title: "Reporte no implementado", message: "Este reporte aún no está disponible" });
      }

      if (result) {
        const url = URL.createObjectURL(result.blob);
        window.open(url, "_blank");
        toast({ title: "PDF generado", description: "Se abrió en una nueva pestaña. Usa Ctrl+P para imprimir." });
        if (onClose) onClose();
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      showPop({ title: "Error", message: error.message || "Error al generar el reporte" });
    } finally {
      setIsLoading(false);
    }
  };

  const isGroupEnabled = (groupTitle: string) => {
    if (!enabledGroups) return true;
    return enabledGroups.includes(groupTitle);
  };

  if (showIngresosReport && ingresosConfig) {
    return (
      <div className="flex flex-col h-full min-h-0 flex-1">
        <div className="flex items-center gap-2 px-2 py-1 border-b bg-muted/30">
          <MyButtonStyle color="gray" onClick={() => setShowIngresosReport(false)} data-testid="button-volver-reportes-ie">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Volver
          </MyButtonStyle>
          <span className="text-xs font-bold">
            Ingresos / Egresos
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ReporteIngresosEgresos
            unidad={ingresosConfig.unidad}
            fechaInicio={ingresosConfig.fechaInicio}
            fechaFin={ingresosConfig.fechaFin}
            fechaInicioDisplay={ingresosConfig.fechaInicioDisplay}
            fechaFinDisplay={ingresosConfig.fechaFinDisplay}
          />
        </div>
      </div>
    );
  }

  if (showArrimeReport) {
    return (
      <div className="flex flex-col h-full min-h-0 flex-1">
        <div className="flex items-center gap-2 px-2 py-1 border-b bg-muted/30">
          <MyButtonStyle color="gray" onClick={() => setShowArrimeReport(false)} data-testid="button-volver-reportes">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Volver
          </MyButtonStyle>
          <span className="text-xs font-bold">
            Validación de Caña
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <ReporteArrime />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      {/* Info de filtros externos */}
      {externalFilters && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-gradient-to-r from-orange-500/10 to-orange-600/5 text-xs">
          <span className="font-bold text-orange-800 dark:text-orange-300">Filtros del módulo:</span>
          <span>Período: {dateRange.start} - {dateRange.end}</span>
          {unidad && unidad !== "all" && <span>| Unidad: {unidad}</span>}
          {banco && banco !== "all" && <span>| Banco: {banco}</span>}
          {Object.entries(textFilters).map(([key, value]) => (
            <span key={key}>| {key}: {value}</span>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-3 gap-1.5 auto-rows-min">
          {/* Columna 1: Gastos, Nomina, Ventas, Cuentas por pagar */}
          <div className="flex flex-col gap-1.5">
            <ReportGroupCard group={reportGroups[0]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[0].title)} />
            <ReportGroupCard group={reportGroups[1]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[1].title)} />
            <ReportGroupCard group={reportGroups[2]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[2].title)} />
            <ReportGroupCard group={reportGroups[3]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[3].title)} />
          </div>
          {/* Columna 2: Cuentas por cobrar, Prestamos, Bancos, Administracion */}
          <div className="flex flex-col gap-1.5">
            <ReportGroupCard group={reportGroups[4]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[4].title)} />
            <ReportGroupCard group={reportGroups[5]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[5].title)} />
            <ReportGroupCard group={reportGroups[6]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[6].title)} />
            <ReportGroupCard group={reportGroups[7]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[7].title)} />
          </div>
          {/* Columna 3: Almacen, Cosecha, Arrime */}
          <div className="flex flex-col gap-1.5">
            <ReportGroupCard group={reportGroups[8]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[8].title)} />
            <ReportGroupCard group={reportGroups[10]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[10].title)} />
            <ReportGroupCard group={reportGroups[9]} selectedReport={selectedReport} onSelect={setSelectedReport} isEnabled={isGroupEnabled(reportGroups[9].title)} />
          </div>
        </div>
        
        {/* Botón centrado en la última línea */}
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleGenerateReport}
            disabled={!selectedReport || isLoading}
            size="lg"
            className="gap-2 bg-orange-600 hover:bg-orange-700 px-8"
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
    </div>
  );
}

export default function Reportes({
  onBack,
  onFocus,
  zIndex,
  minimizedIndex,
  isStandalone = false,
  externalFilters,
}: ReportesProps) {
  return (
    <MyWindow
      id="reportes"
      title="Reportes PDF"
      icon={<FileText className="h-4 w-4 text-orange-800 dark:text-orange-300" />}
      initialPosition={{ x: 180, y: 40 }}
      initialSize={{ width: 680, height: 580 }}
      minSize={{ width: 600, height: 500 }}
      maxSize={{ width: 900, height: 800 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-orange-500"
      minimizedIndex={minimizedIndex}
      isStandalone={isStandalone}
      popoutUrl="/standalone/reportes"
    >
      <ReportesContent externalFilters={externalFilters} onClose={onBack} />
    </MyWindow>
  );
}
