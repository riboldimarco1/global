import { useState, useMemo } from "react";
import { FileText, Calendar } from "lucide-react";
import { MyWindow } from "@/components/My";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const months = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
  { value: "year", label: "Año actual" },
  { value: "lastyear", label: "Hace un año" },
  { value: "custom", label: "Cualquier fecha" },
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
  return (
    <Card className="h-fit">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-medium">{group.title}</CardTitle>
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

function ReportesContent() {
  const currentYear = new Date().getFullYear();
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>("year");
  const [fechaInicial, setFechaInicial] = useState<string>(() => 
    formatDateForInput(new Date(currentYear, 0, 1))
  );
  const [fechaFinal, setFechaFinal] = useState<string>(() => 
    formatDateForInput(new Date())
  );

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    
    if (month === "year") {
      setFechaInicial(formatDateForInput(new Date(selectedYear, 0, 1)));
      setFechaFinal(formatDateForInput(new Date(selectedYear, 11, 31)));
    } else if (month === "lastyear") {
      const lastYear = selectedYear - 1;
      setFechaInicial(formatDateForInput(new Date(lastYear, 0, 1)));
      setFechaFinal(formatDateForInput(new Date(lastYear, 11, 31)));
    } else if (month !== "custom") {
      const monthNum = parseInt(month, 10) - 1;
      const startDate = new Date(selectedYear, monthNum, 1);
      const endDate = new Date(selectedYear, monthNum + 1, 0);
      setFechaInicial(formatDateForInput(startDate));
      setFechaFinal(formatDateForInput(endDate));
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (selectedMonth !== "custom") {
      handleMonthChange(selectedMonth);
    }
  };

  const handleGenerateReport = () => {
    if (!selectedReport) {
      return;
    }
    console.log("Generating report:", {
      report: selectedReport,
      year: selectedYear,
      month: selectedMonth,
      fechaInicial,
      fechaFinal,
    });
  };

  return (
    <div className="flex h-full gap-2 p-2 overflow-auto">
      <div className="flex-1 grid grid-cols-4 gap-2 auto-rows-min content-start">
        {reportGroups.map((group) => (
          <ReportGroupCard
            key={group.title}
            group={group}
            selectedReport={selectedReport}
            onSelect={setSelectedReport}
          />
        ))}
      </div>

      <div className="w-48 flex flex-col gap-2">
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Año
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <Input
              type="number"
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10) || currentYear)}
              className="h-8 text-sm"
              data-testid="input-year"
            />
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
          </CardHeader>
          <CardContent className="py-1 px-3 max-h-[280px] overflow-y-auto">
            <RadioGroup value={selectedMonth} onValueChange={handleMonthChange}>
              {months.map((month) => (
                <div key={month.value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={month.value} 
                    id={`month-${month.value}`}
                    data-testid={`radio-month-${month.value}`}
                  />
                  <Label 
                    htmlFor={`month-${month.value}`} 
                    className="text-xs cursor-pointer"
                  >
                    {month.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-2 px-3 space-y-2">
            <div>
              <Label className="text-xs">Fecha inicial:</Label>
              <Input
                type="date"
                value={fechaInicial}
                onChange={(e) => {
                  setFechaInicial(e.target.value);
                  setSelectedMonth("custom");
                }}
                className="h-8 text-xs"
                data-testid="input-fecha-inicial"
              />
            </div>
            <div>
              <Label className="text-xs">Fecha final:</Label>
              <Input
                type="date"
                value={fechaFinal}
                onChange={(e) => {
                  setFechaFinal(e.target.value);
                  setSelectedMonth("custom");
                }}
                className="h-8 text-xs"
                data-testid="input-fecha-final"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleGenerateReport}
          disabled={!selectedReport}
          className="w-full"
          data-testid="button-generate-report"
        >
          <FileText className="h-4 w-4 mr-2" />
          Generar PDF
        </Button>
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
