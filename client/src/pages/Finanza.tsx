import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { FincasGrid } from "@/components/FincasGrid";
import { PagosGrid } from "@/components/PagosGrid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, Receipt, X, Download, Filter, Zap, GraduationCap, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallButton } from "@/components/InstallButton";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { useFinanza } from "@/hooks/use-finanza";
import { formatNumber } from "@/lib/formatNumber";
import type { Registro, Central } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const savePdfMobile = (doc: jsPDF, fileName: string) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } else {
    doc.save(fileName);
  }
};

interface FinanzaProps {
  onBack: () => void;
}

interface IngresoItem {
  fecha: string;
  finca: string;
  central: string;
  cantidad: number;
  gradoOriginal: number | null;
  gradoAjustado: number;
  ingresoAzucar: number;
  ingresoMelaza: number;
  ingresoFlete: number;
  costoCosecha: number;
  ingresoTotal: number;
}

interface EstadoCuentaConsolidadoItem {
  fecha: string;
  tipo: "ingreso" | "pago";
  descripcion: string;
  finca: string;
  central: string;
  monto: number;
  cantidad: number;
  saldoAcumulado: number;
}

export default function Finanza({ onBack }: FinanzaProps) {
  const [filterFinca, setFilterFinca] = useState<string>("");
  const [filterCentral, setFilterCentral] = useState<string>("");
  const [ingresosDialogOpen, setIngresosDialogOpen] = useState(false);
  const [ingresos, setIngresos] = useState<IngresoItem[]>([]);
  const [estadoCuentaOpen, setEstadoCuentaOpen] = useState(false);
  const [estadoCuentaConsolidado, setEstadoCuentaConsolidado] = useState<EstadoCuentaConsolidadoItem[]>([]);

  const { fincas, pagos, isLoading } = useFinanza();

  const { data: registros = [] } = useQuery<Registro[]>({
    queryKey: ["/api/registros"],
  });

  const { data: centrales = [] } = useQuery<Central[]>({
    queryKey: ["/api/centrales"],
  });

  const fincasFromRegistros = Array.from(
    new Set(registros.map((r) => r.finca).filter((f): f is string => !!f))
  );
  const fincasFromConfig = fincas.map((f) => f.nombre);
  const fincaNames = ["Nucleo", ...Array.from(new Set([...fincasFromConfig, ...fincasFromRegistros])).sort()];

  const formatDateDDMMYY = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year.slice(-2)}`;
  };

  const calcularIngresos = () => {
    const items: IngresoItem[] = [];

    const isNucleoFilter = filterFinca === "Nucleo";

    const filteredRegistros = registros.filter((r) => {
      if (filterFinca && filterFinca !== "Nucleo" && r.finca !== filterFinca) return false;
      if (filterCentral && r.central !== filterCentral) return false;
      return true;
    });

    const palmarRegistros = registros.filter(
      (r) => r.central.toLowerCase() === "palmar"
    );
    let palmarFirstDate: Date | null = null;
    if (palmarRegistros.length > 0) {
      const dates = palmarRegistros.map((r) => new Date(r.fecha));
      palmarFirstDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    }

    for (const registro of filteredRegistros) {
      const fincaConfig = fincas.find(
        (f) => f.nombre === registro.finca && f.central === registro.central
      );

      if (!fincaConfig) continue;

      const registroDate = new Date(registro.fecha);
      const registroYear = registroDate.getFullYear();
      let gradoAjustado = registro.grado ?? 0;

      if (registro.central.toLowerCase() === "palmar" && palmarFirstDate) {
        const sixWeeksLater = new Date(palmarFirstDate);
        sixWeeksLater.setDate(sixWeeksLater.getDate() + 6 * 7);

        if (registroDate <= sixWeeksLater) {
          gradoAjustado = 8.3;
        }
      }

      if (registro.central.toLowerCase() === "portuguesa") {
        const endOfYear = new Date(registroYear, 11, 31);
        const gradoReal = registro.grado ?? 0;
        if (registroDate <= endOfYear) {
          if (gradoReal > 8.47) {
            gradoAjustado = gradoReal;
          } else {
            gradoAjustado = Math.min(gradoReal + 1, 8.47);
          }
        }
      }

      const cantidad = registro.cantidad;
      
      let ingresoAzucar: number;
      let ingresoMelaza: number;
      let ingresoFlete: number;
      let ingresoTotal: number;

      const costoCosechaTotal = cantidad * fincaConfig.costoCosecha;

      if (isNucleoFilter) {
        ingresoAzucar = 0;
        ingresoMelaza = 0;
        ingresoFlete = 0;
        ingresoTotal = costoCosechaTotal;
      } else {
        ingresoAzucar = (cantidad * gradoAjustado * fincaConfig.valorTonAzucar) / 100;
        ingresoMelaza = cantidad * fincaConfig.valorMelazaTc;
        ingresoFlete = cantidad * fincaConfig.compFlete;
        ingresoTotal = ingresoAzucar + ingresoMelaza + ingresoFlete - costoCosechaTotal;
      }

      items.push({
        fecha: registro.fecha,
        finca: registro.finca || "",
        central: registro.central,
        cantidad,
        gradoOriginal: registro.grado,
        gradoAjustado,
        ingresoAzucar,
        ingresoMelaza,
        ingresoFlete,
        costoCosecha: costoCosechaTotal,
        ingresoTotal,
      });
    }

    items.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    return items;
  };

  const generateIngresosDialog = () => {
    const items = calcularIngresos();
    setIngresos(items);
    setIngresosDialogOpen(true);
  };

  const generateEstadoCuenta = () => {
    const ingresosItems = calcularIngresos();
    
    const filteredPagos = pagos.filter((p) => {
      if (filterFinca && filterFinca !== "Nucleo" && p.finca !== filterFinca) return false;
      if (filterCentral && p.central !== filterCentral) return false;
      return true;
    });

    const allItems: { fecha: string; tipo: "ingreso" | "pago"; descripcion: string; finca: string; central: string; monto: number; cantidad: number }[] = [];

    for (const ingreso of ingresosItems) {
      allItems.push({
        fecha: ingreso.fecha,
        tipo: "ingreso",
        descripcion: `Arrime: ${formatNumber(ingreso.cantidad)} tc @ grado ${formatNumber(ingreso.gradoAjustado)}`,
        finca: ingreso.finca,
        central: ingreso.central,
        monto: ingreso.ingresoTotal,
        cantidad: ingreso.cantidad,
      });
    }

    for (const pago of filteredPagos) {
      allItems.push({
        fecha: pago.fecha,
        tipo: "pago",
        descripcion: pago.comentario || "Pago",
        finca: pago.finca,
        central: pago.central,
        monto: pago.monto,
        cantidad: 0,
      });
    }

    allItems.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    let saldoAcumulado = 0;
    const consolidado: EstadoCuentaConsolidadoItem[] = allItems.map((item) => {
      if (item.tipo === "ingreso") {
        saldoAcumulado += item.monto;
      } else {
        saldoAcumulado -= item.monto;
      }
      return {
        ...item,
        saldoAcumulado,
      };
    });

    setEstadoCuentaConsolidado(consolidado);
    setEstadoCuentaOpen(true);
  };

  const totalIngresos = ingresos.reduce((sum, item) => sum + item.ingresoTotal, 0);
  const totalCantidadIngresos = ingresos.reduce((sum, item) => sum + item.cantidad, 0);
  const saldoFinal = estadoCuentaConsolidado.length > 0 
    ? estadoCuentaConsolidado[estadoCuentaConsolidado.length - 1].saldoAcumulado 
    : 0;

  const ingresosPorFinca = estadoCuentaConsolidado
    .filter(item => item.tipo === "ingreso")
    .reduce((acc, item) => {
      acc[item.finca] = (acc[item.finca] || 0) + item.monto;
      return acc;
    }, {} as Record<string, number>);

  const totalIngresosEstado = Object.values(ingresosPorFinca).reduce((sum, val) => sum + val, 0);
  const totalCantidadEstado = estadoCuentaConsolidado
    .filter(item => item.tipo === "ingreso")
    .reduce((sum, item) => sum + item.cantidad, 0);

  const downloadIngresosPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const isNucleo = filterFinca === "Nucleo";
    
    doc.setFontSize(16);
    doc.text("Ingresos por Arrimes", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 22);
    if (filterFinca) doc.text(`Finca: ${filterFinca}`, 14, 28);
    if (filterCentral) doc.text(`Central: ${filterCentral}`, filterFinca ? 80 : 14, 28);

    const startY = filterFinca || filterCentral ? 35 : 28;
    const totalCantidad = ingresos.reduce((sum, item) => sum + item.cantidad, 0);

    if (isNucleo) {
      const headers = [["Fecha", "Cantidad", "Finca", "Central", "Costo Cosecha", "Ingreso"]];
      const data = ingresos.map((item) => [
        formatDateDDMMYY(item.fecha),
        formatNumber(item.cantidad),
        item.finca,
        item.central,
        formatNumber(item.costoCosecha),
        formatNumber(item.ingresoTotal),
      ]);
      autoTable(doc, {
        head: headers,
        body: data,
        startY,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
      });
    } else {
      const headers = [["Fecha", "Finca", "Central", "Cantidad", "Grado Orig.", "Grado Ajust.", "Ingreso Azucar", "Ingreso Melaza", "Comp. Flete", "Costo Cosecha", "Total"]];
      const data = ingresos.map((item) => [
        formatDateDDMMYY(item.fecha),
        item.finca,
        item.central,
        formatNumber(item.cantidad),
        item.gradoOriginal != null ? formatNumber(item.gradoOriginal) : "-",
        formatNumber(item.gradoAjustado),
        formatNumber(item.ingresoAzucar),
        formatNumber(item.ingresoMelaza),
        formatNumber(item.ingresoFlete),
        formatNumber(item.costoCosecha),
        formatNumber(item.ingresoTotal),
      ]);
      autoTable(doc, {
        head: headers,
        body: data,
        startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Cantidad: ${formatNumber(totalCantidad)}`, 14, finalY);
    doc.text(`Total Ingresos: ${formatNumber(totalIngresos)}`, 14, finalY + 7);

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES").replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "-");
    const fincaPart = filterFinca || "todas";
    const centralPart = filterCentral || "todas";
    const fileName = `${fincaPart}-${centralPart}-${dateStr}-${timeStr}-ingresos.pdf`;
    savePdfMobile(doc, fileName);
  };

  const downloadEstadoCuentaPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(16);
    doc.text("Estado de Cuenta", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 22);
    if (filterFinca) doc.text(`Finca: ${filterFinca}`, 14, 28);
    if (filterCentral) doc.text(`Central: ${filterCentral}`, filterFinca ? 80 : 14, 28);

    const startY = filterFinca || filterCentral ? 35 : 28;

    const headers = [["Fecha", "Tipo", "Descripción", "Finca", "Central", "Monto", "Saldo"]];
    const data = estadoCuentaConsolidado.map((item) => [
      formatDateDDMMYY(item.fecha),
      item.tipo === "ingreso" ? "Ingreso" : "Pago",
      item.descripcion,
      item.finca,
      item.central,
      `${item.tipo === "ingreso" ? "+" : "-"}${formatNumber(item.monto)}`,
      formatNumber(item.saldoAcumulado),
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const pageHeight = doc.internal.pageSize.height;

    const checkPageOverflow = (neededSpace: number) => {
      if (finalY + neededSpace > pageHeight - 20) {
        doc.addPage();
        finalY = 20;
      }
    };

    checkPageOverflow(20);
    doc.setFontSize(12);
    doc.text(`Total Cantidad: ${formatNumber(totalCantidadEstado)}`, 14, finalY);
    finalY += 7;

    if (filterFinca === "Nucleo" && Object.keys(ingresosPorFinca).length > 0) {
      const entriesCount = Object.keys(ingresosPorFinca).length;
      checkPageOverflow(20 + entriesCount * 5);
      doc.setFontSize(11);
      doc.text("Ingresos por Finca:", 14, finalY);
      finalY += 6;
      doc.setFontSize(10);
      Object.entries(ingresosPorFinca)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([finca, monto]) => {
          doc.text(`${finca}: ${formatNumber(monto)}`, 20, finalY);
          finalY += 5;
        });
      doc.setFontSize(11);
      doc.text(`Total Ingresos: ${formatNumber(totalIngresosEstado)}`, 14, finalY);
      finalY += 8;
    }

    checkPageOverflow(15);
    doc.setFontSize(12);
    doc.text(`Saldo Final: ${formatNumber(saldoFinal)}`, 14, finalY);

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES").replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "-");
    const fincaPart = filterFinca || "todas";
    const centralPart = filterCentral || "todas";
    const fileName = `${fincaPart}-${centralPart}-${dateStr}-${timeStr}-estado-cuenta.pdf`;
    savePdfMobile(doc, fileName);
  };

  const generateIngresosPDFDirect = () => {
    const items = calcularIngresos();
    if (items.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    const isNucleo = filterFinca === "Nucleo";
    
    doc.setFontSize(16);
    doc.text("Ingresos por Arrimes", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 22);
    if (filterFinca) doc.text(`Finca: ${filterFinca}`, 14, 28);
    if (filterCentral) doc.text(`Central: ${filterCentral}`, filterFinca ? 80 : 14, 28);

    const startY = filterFinca || filterCentral ? 35 : 28;
    const totalCantidad = items.reduce((sum, item) => sum + item.cantidad, 0);
    const totalIngresosCalc = items.reduce((sum, item) => sum + item.ingresoTotal, 0);

    if (isNucleo) {
      const headers = [["Fecha", "Cantidad", "Finca", "Central", "Costo Cosecha", "Ingreso"]];
      const data = items.map((item) => [
        formatDateDDMMYY(item.fecha),
        formatNumber(item.cantidad),
        item.finca,
        item.central,
        formatNumber(item.costoCosecha),
        formatNumber(item.ingresoTotal),
      ]);
      autoTable(doc, {
        head: headers,
        body: data,
        startY,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
      });
    } else {
      const headers = [["Fecha", "Finca", "Central", "Cantidad", "Grado Orig.", "Grado Ajust.", "Ingreso Azucar", "Ingreso Melaza", "Comp. Flete", "Costo Cosecha", "Total"]];
      const data = items.map((item) => [
        formatDateDDMMYY(item.fecha),
        item.finca,
        item.central,
        formatNumber(item.cantidad),
        item.gradoOriginal != null ? formatNumber(item.gradoOriginal) : "-",
        formatNumber(item.gradoAjustado),
        formatNumber(item.ingresoAzucar),
        formatNumber(item.ingresoMelaza),
        formatNumber(item.ingresoFlete),
        formatNumber(item.costoCosecha),
        formatNumber(item.ingresoTotal),
      ]);
      autoTable(doc, {
        head: headers,
        body: data,
        startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Cantidad: ${formatNumber(totalCantidad)}`, 14, finalY);
    doc.text(`Total Ingresos: ${formatNumber(totalIngresosCalc)}`, 14, finalY + 7);

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES").replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "-");
    const fincaPart = filterFinca || "todas";
    const centralPart = filterCentral || "todas";
    const fileName = `${fincaPart}-${centralPart}-${dateStr}-${timeStr}-ingresos.pdf`;
    savePdfMobile(doc, fileName);
  };

  const generateEstadoCuentaPDFDirect = () => {
    const ingresosItems = calcularIngresos();
    
    const filteredPagos = pagos.filter((p) => {
      if (filterFinca && filterFinca !== "Nucleo" && p.finca !== filterFinca) return false;
      if (filterCentral && p.central !== filterCentral) return false;
      return true;
    });

    const allItems: { fecha: string; tipo: "ingreso" | "pago"; descripcion: string; finca: string; central: string; monto: number; cantidad: number }[] = [];

    for (const ingreso of ingresosItems) {
      allItems.push({
        fecha: ingreso.fecha,
        tipo: "ingreso",
        descripcion: `Arrime: ${formatNumber(ingreso.cantidad)} tc @ grado ${formatNumber(ingreso.gradoAjustado)}`,
        finca: ingreso.finca,
        central: ingreso.central,
        monto: ingreso.ingresoTotal,
        cantidad: ingreso.cantidad,
      });
    }

    for (const pago of filteredPagos) {
      allItems.push({
        fecha: pago.fecha,
        tipo: "pago",
        descripcion: pago.comentario || "Pago",
        finca: pago.finca,
        central: pago.central,
        monto: pago.monto,
        cantidad: 0,
      });
    }

    if (allItems.length === 0) return;

    allItems.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    let saldoAcumuladoCalc = 0;
    const consolidado: EstadoCuentaConsolidadoItem[] = allItems.map((item) => {
      if (item.tipo === "ingreso") {
        saldoAcumuladoCalc += item.monto;
      } else {
        saldoAcumuladoCalc -= item.monto;
      }
      return {
        ...item,
        saldoAcumulado: saldoAcumuladoCalc,
      };
    });

    const totalCantidadCalc = consolidado
      .filter(item => item.tipo === "ingreso")
      .reduce((sum, item) => sum + item.cantidad, 0);

    const ingresosPorFincaCalc = consolidado
      .filter(item => item.tipo === "ingreso")
      .reduce((acc, item) => {
        acc[item.finca] = (acc[item.finca] || 0) + item.monto;
        return acc;
      }, {} as Record<string, number>);

    const totalIngresosCalc = Object.values(ingresosPorFincaCalc).reduce((sum, val) => sum + val, 0);
    const saldoFinalCalc = consolidado.length > 0 ? consolidado[consolidado.length - 1].saldoAcumulado : 0;

    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(16);
    doc.text("Estado de Cuenta", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 22);
    if (filterFinca) doc.text(`Finca: ${filterFinca}`, 14, 28);
    if (filterCentral) doc.text(`Central: ${filterCentral}`, filterFinca ? 80 : 14, 28);

    const startY = filterFinca || filterCentral ? 35 : 28;

    const headers = [["Fecha", "Tipo", "Descripción", "Finca", "Central", "Monto", "Saldo"]];
    const data = consolidado.map((item) => [
      formatDateDDMMYY(item.fecha),
      item.tipo === "ingreso" ? "Ingreso" : "Pago",
      item.descripcion,
      item.finca,
      item.central,
      `${item.tipo === "ingreso" ? "+" : "-"}${formatNumber(item.monto)}`,
      formatNumber(item.saldoAcumulado),
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const pageHeight = doc.internal.pageSize.height;

    const checkPageOverflow = (neededSpace: number) => {
      if (finalY + neededSpace > pageHeight - 20) {
        doc.addPage();
        finalY = 20;
      }
    };

    checkPageOverflow(20);
    doc.setFontSize(12);
    doc.text(`Total Cantidad: ${formatNumber(totalCantidadCalc)}`, 14, finalY);
    finalY += 7;

    if (filterFinca === "Nucleo" && Object.keys(ingresosPorFincaCalc).length > 0) {
      const entriesCount = Object.keys(ingresosPorFincaCalc).length;
      checkPageOverflow(20 + entriesCount * 5);
      doc.setFontSize(11);
      doc.text("Ingresos por Finca:", 14, finalY);
      finalY += 6;
      doc.setFontSize(10);
      Object.entries(ingresosPorFincaCalc)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([finca, monto]) => {
          doc.text(`${finca}: ${formatNumber(monto)}`, 20, finalY);
          finalY += 5;
        });
      doc.setFontSize(11);
      doc.text(`Total Ingresos: ${formatNumber(totalIngresosCalc)}`, 14, finalY);
      finalY += 8;
    }

    checkPageOverflow(15);
    doc.setFontSize(12);
    doc.text(`Saldo Final: ${formatNumber(saldoFinalCalc)}`, 14, finalY);

    const now = new Date();
    const dateStr = now.toLocaleDateString("es-ES").replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "-");
    const fincaPart = filterFinca || "todas";
    const centralPart = filterCentral || "todas";
    const fileName = `${fincaPart}-${centralPart}-${dateStr}-${timeStr}-estado-cuenta.pdf`;
    savePdfMobile(doc, fileName);
  };

  const clearFilter = (filter: "finca" | "central") => {
    if (filter === "finca") {
      setFilterFinca("");
    } else {
      setFilterCentral("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back-to-modules"
          title="Volver a módulos"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Link href="/guia">
          <Button variant="ghost" size="icon" data-testid="button-help-finanza" title="Guía de uso">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </Link>
        <InstallButton />
        <ThemeToggle />
        <ConnectionStatus isOnline={true} pendingCount={0} isSyncing={false} onSync={() => {}} />
      </Header>
      <main className="container px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <h1
          className="text-3xl font-bold text-foreground mb-6"
          data-testid="text-finanza-title"
        >
          Finanza
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Finca:</span>
                  <Select value={filterFinca} onValueChange={setFilterFinca}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-finca">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      {fincaNames.map((finca) => (
                        <SelectItem key={finca} value={finca}>
                          {finca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterFinca && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => clearFilter("finca")}
                      data-testid="button-clear-filter-finca"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Central:</span>
                  <Select value={filterCentral} onValueChange={setFilterCentral}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-central">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrales.map((central) => (
                        <SelectItem key={central.id} value={central.nombre}>
                          {central.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterCentral && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => clearFilter("central")}
                      data-testid="button-clear-filter-central"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Comandos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={generateIngresosDialog}
                  data-testid="button-generar-ingresos"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Ingresos
                </Button>

                <Button
                  onClick={generateEstadoCuenta}
                  data-testid="button-estado-cuenta"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Estado de Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fincas</CardTitle>
            </CardHeader>
            <CardContent>
              <FincasGrid />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <PagosGrid filterFinca={filterFinca} filterCentral={filterCentral} />
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={ingresosDialogOpen} onOpenChange={setIngresosDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle>Ingresos por Arrimes</DialogTitle>
            {ingresos.length > 0 && (
              <Button
                size="icon"
                variant="outline"
                onClick={downloadIngresosPDF}
                data-testid="button-download-ingresos-pdf"
                title="Descargar PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </DialogHeader>
          {ingresos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay registros que coincidan con los filtros seleccionados o
              no hay configuración de fincas asociada.
            </div>
          ) : filterFinca === "Nucleo" ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table className="resizable-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Finca</TableHead>
                      <TableHead>Central</TableHead>
                      <TableHead className="text-right">Costo Cosecha</TableHead>
                      <TableHead className="text-right">Ingreso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingresos.map((item, index) => (
                      <TableRow key={index} data-testid={`row-ingreso-${index}`}>
                        <TableCell>{formatDateDDMMYY(item.fecha)}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.cantidad)}
                        </TableCell>
                        <TableCell className="font-medium">{item.finca}</TableCell>
                        <TableCell>{item.central}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.costoCosecha)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(item.ingresoTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6">
                <div className="text-lg font-bold" data-testid="text-total-cantidad-ingresos">
                  Total Cantidad: {formatNumber(totalCantidadIngresos)}
                </div>
                <div className="text-lg font-bold" data-testid="text-total-ingresos">
                  Total Ingresos: {formatNumber(totalIngresos)}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table className="resizable-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Finca</TableHead>
                      <TableHead>Central</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Grado Orig.</TableHead>
                      <TableHead className="text-right">Grado Ajust.</TableHead>
                      <TableHead className="text-right">Ingreso Azucar</TableHead>
                      <TableHead className="text-right">Ingreso Melaza</TableHead>
                      <TableHead className="text-right">Comp. Flete</TableHead>
                      <TableHead className="text-right">Costo Cosecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingresos.map((item, index) => (
                      <TableRow key={index} data-testid={`row-ingreso-${index}`}>
                        <TableCell>{formatDateDDMMYY(item.fecha)}</TableCell>
                        <TableCell className="font-medium">{item.finca}</TableCell>
                        <TableCell>{item.central}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.cantidad)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.gradoOriginal != null ? formatNumber(item.gradoOriginal) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.gradoAjustado)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.ingresoAzucar)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.ingresoMelaza)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.ingresoFlete)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.costoCosecha)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(item.ingresoTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6">
                <div className="text-lg font-bold" data-testid="text-total-cantidad-ingresos">
                  Total Cantidad: {formatNumber(totalCantidadIngresos)}
                </div>
                <div className="text-lg font-bold" data-testid="text-total-ingresos">
                  Total Ingresos: {formatNumber(totalIngresos)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={estadoCuentaOpen} onOpenChange={setEstadoCuentaOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle>Estado de Cuenta</DialogTitle>
            {estadoCuentaConsolidado.length > 0 && (
              <Button
                size="icon"
                variant="outline"
                onClick={downloadEstadoCuentaPDF}
                data-testid="button-download-estado-cuenta-pdf"
                title="Descargar PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </DialogHeader>
          {estadoCuentaConsolidado.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay movimientos que mostrar.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table className="resizable-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Finca</TableHead>
                      <TableHead>Central</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadoCuentaConsolidado.map((item, index) => (
                      <TableRow key={index} data-testid={`row-estado-${index}`}>
                        <TableCell>{formatDateDDMMYY(item.fecha)}</TableCell>
                        <TableCell>
                          <span className={item.tipo === "ingreso" ? "text-green-600" : "text-red-600"}>
                            {item.tipo === "ingreso" ? "Ingreso" : "Pago"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.descripcion}</TableCell>
                        <TableCell className="font-medium">{item.finca}</TableCell>
                        <TableCell>{item.central}</TableCell>
                        <TableCell className={`text-right ${item.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                          {item.tipo === "ingreso" ? "+" : "-"}{formatNumber(item.monto)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(item.saldoAcumulado)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-start">
                <div className="text-lg font-bold" data-testid="text-total-cantidad-estado">
                  Total Cantidad: {formatNumber(totalCantidadEstado)}
                </div>
              </div>
              {filterFinca === "Nucleo" && Object.keys(ingresosPorFinca).length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Ingresos por Finca</h4>
                  <div className="space-y-1">
                    {Object.entries(ingresosPorFinca)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([finca, monto]) => (
                        <div key={finca} className="flex justify-between text-sm">
                          <span>{finca}</span>
                          <span className="font-medium text-green-600">{formatNumber(monto)}</span>
                        </div>
                      ))}
                    <div className="flex justify-between pt-2 border-t mt-2 font-bold">
                      <span>Total Ingresos</span>
                      <span className="text-green-600">{formatNumber(totalIngresosEstado)}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <div className={`text-lg font-bold ${saldoFinal >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-saldo-final">
                  Saldo Final: {formatNumber(saldoFinal)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
