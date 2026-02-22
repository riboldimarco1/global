import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface MonthRow {
  mes: string;
  ventas_bs: string;
  ventas_dol: string;
  cxc_bs: string;
  cxc_dol: string;
  nomina_bs: string;
  nomina_dol: string;
  facturas_bs: string;
  facturas_dol: string;
  cxp_bs: string;
  cxp_dol: string;
}

interface Props {
  unidad: string;
  fechaInicio: string;
  fechaFin: string;
  fechaInicioDisplay?: string;
  fechaFinDisplay?: string;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

function mesLabel(mes: string): string {
  const parts = mes.split("-");
  if (parts.length === 2) {
    const monthName = MONTH_NAMES[parts[1]] || parts[1];
    return `${monthName} ${parts[0]}`;
  }
  return mes;
}

export default function ReporteIngresosEgresos({ unidad, fechaInicio, fechaFin, fechaInicioDisplay, fechaFinDisplay }: Props) {
  const { showPop } = useMyPop();
  const [pdfLoading, setPdfLoading] = useState(false);

  const params = new URLSearchParams();
  if (unidad && unidad !== "all") params.set("unidad", unidad);
  if (fechaInicio) params.set("fechaInicio", fechaInicio);
  if (fechaFin) params.set("fechaFin", fechaFin);
  const qs = params.toString();

  const { data: rows = [], isLoading } = useQuery<MonthRow[]>({
    queryKey: [`/api/administracion/ingresos-egresos${qs ? `?${qs}` : ""}`],
  });

  const parsed = useMemo(() => {
    return rows.map((r) => ({
      mes: r.mes,
      ventasBs: parseFloat(r.ventas_bs) || 0,
      ventasDol: parseFloat(r.ventas_dol) || 0,
      cxcBs: parseFloat(r.cxc_bs) || 0,
      cxcDol: parseFloat(r.cxc_dol) || 0,
      nominaBs: parseFloat(r.nomina_bs) || 0,
      nominaDol: parseFloat(r.nomina_dol) || 0,
      facturasBs: parseFloat(r.facturas_bs) || 0,
      facturasDol: parseFloat(r.facturas_dol) || 0,
      cxpBs: parseFloat(r.cxp_bs) || 0,
      cxpDol: parseFloat(r.cxp_dol) || 0,
    }));
  }, [rows]);

  const totals = useMemo(() => {
    return parsed.reduce(
      (acc, r) => ({
        ventasBs: acc.ventasBs + r.ventasBs,
        ventasDol: acc.ventasDol + r.ventasDol,
        cxcBs: acc.cxcBs + r.cxcBs,
        cxcDol: acc.cxcDol + r.cxcDol,
        nominaBs: acc.nominaBs + r.nominaBs,
        nominaDol: acc.nominaDol + r.nominaDol,
        facturasBs: acc.facturasBs + r.facturasBs,
        facturasDol: acc.facturasDol + r.facturasDol,
        cxpBs: acc.cxpBs + r.cxpBs,
        cxpDol: acc.cxpDol + r.cxpDol,
      }),
      { ventasBs: 0, ventasDol: 0, cxcBs: 0, cxcDol: 0, nominaBs: 0, nominaDol: 0, facturasBs: 0, facturasDol: 0, cxpBs: 0, cxpDol: 0 }
    );
  }, [parsed]);

  const calcTotal = (r: { ventasBs: number; cxcBs: number; nominaBs: number; facturasBs: number; cxpBs: number }) =>
    r.ventasBs + r.cxcBs - r.nominaBs - r.facturasBs - r.cxpBs;
  const calcTotalDol = (r: { ventasDol: number; cxcDol: number; nominaDol: number; facturasDol: number; cxpDol: number }) =>
    r.ventasDol + r.cxcDol - r.nominaDol - r.facturasDol - r.cxpDol;

  const handleGeneratePdf = () => {
    if (parsed.length === 0) {
      showPop({ title: "Sin datos", message: "No hay registros para generar el PDF" });
      return;
    }
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const unidadLabel = unidad && unidad !== "all" ? unidad : "Todas";

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Ingresos / Egresos", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Unidad: ${unidadLabel}`, 80, 15);
      doc.text(`De: ${fechaInicioDisplay || fechaInicio}`, pageWidth - 60, 10);
      doc.text(`Hasta: ${fechaFinDisplay || fechaFin}`, pageWidth - 60, 16);

      let yPos = 28;

      for (const r of parsed) {
        const totalBs = calcTotal(r);
        const totalDol = calcTotalDol(r);

        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        autoTable(doc, {
          startY: yPos,
          head: [[`${mesLabel(r.mes)}`, "Bolívares", "", "Dólares"]],
          body: [
            ["Ventas:", fmt(r.ventasBs), "Ventas:", fmt(r.ventasDol)],
            ["Ctas x Cobrar:", fmt(r.cxcBs), "Ctas x Cobrar:", fmt(r.cxcDol)],
            ["Nómina:", fmt(-r.nominaBs), "Nómina:", fmt(-r.nominaDol)],
            ["Facturas:", fmt(-r.facturasBs), "Facturas:", fmt(-r.facturasDol)],
            ["Ctas x Pagar:", fmt(-r.cxpBs), "Ctas x Pagar:", fmt(-r.cxpDol)],
            ["Total:", fmt(totalBs), "Total:", fmt(totalDol)],
          ],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { halign: "right" as const, cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { halign: "right" as const, cellWidth: 40 },
          },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.row.index === 5) {
              data.cell.styles.fontStyle = "bold";
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      if (yPos > 210) {
        doc.addPage();
        yPos = 20;
      }

      const grandTotalBs = calcTotal(totals);
      const grandTotalDol = calcTotalDol(totals);

      autoTable(doc, {
        startY: yPos,
        head: [["TOTALES GENERALES", "Bolívares", "", "Dólares"]],
        body: [
          ["Total Ventas:", fmt(totals.ventasBs), "Total Ventas:", fmt(totals.ventasDol)],
          ["Total Ctas x Cobrar:", fmt(totals.cxcBs), "Total Ctas x Cobrar:", fmt(totals.cxcDol)],
          ["Total Nómina:", fmt(-totals.nominaBs), "Total Nómina:", fmt(-totals.nominaDol)],
          ["Total Facturas:", fmt(-totals.facturasBs), "Total Facturas:", fmt(-totals.facturasDol)],
          ["Total Ctas x Pagar:", fmt(-totals.cxpBs), "Total Ctas x Pagar:", fmt(-totals.cxpDol)],
          ["BALANCE FINAL:", fmt(grandTotalBs), "BALANCE FINAL:", fmt(grandTotalDol)],
        ],
        styles: { fontSize: 9, fontStyle: "bold" },
        headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { halign: "right" as const, cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { halign: "right" as const, cellWidth: 40 },
        },
      });

      window.open(doc.output("bloburl"), "_blank");
    } catch (error: any) {
      showPop({ title: "Error", message: error.message || "Error al generar PDF" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
      </div>
    );
  }

  if (parsed.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No hay datos para el período seleccionado
      </div>
    );
  }

  const grandTotalBs = calcTotal(totals);
  const grandTotalDol = calcTotalDol(totals);

  return (
    <div className="flex flex-col h-full min-h-0" data-testid="reporte-ingresos-egresos">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <div className="text-xs">
          <span className="font-bold">Unidad:</span> {unidad && unidad !== "all" ? unidad : "Todas"}
          <span className="ml-3 font-bold">Período:</span> {fechaInicioDisplay || fechaInicio} — {fechaFinDisplay || fechaFin}
        </div>
        <MyButtonStyle color="green" loading={pdfLoading} onClick={handleGeneratePdf} data-testid="button-generar-pdf-ie">
          <FileText className="h-3.5 w-3.5 mr-1" />
          Generar PDF
        </MyButtonStyle>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <table className="w-full text-xs border-collapse" data-testid="table-ingresos-egresos">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-blue-700 px-2 py-1 text-left">Mes</th>
              <th className="border border-blue-700 px-2 py-1 text-left">Concepto</th>
              <th className="border border-blue-700 px-2 py-1 text-right">Bolívares</th>
              <th className="border border-blue-700 px-2 py-1 text-right">Dólares</th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((r, idx) => {
              const totalBs = calcTotal(r);
              const totalDol = calcTotalDol(r);
              return (
                <MonthBlock key={r.mes} r={r} totalBs={totalBs} totalDol={totalDol} showMonth isLast={idx === parsed.length - 1} />
              );
            })}
            <tr className="bg-green-700 text-white font-bold">
              <td className="border border-green-800 px-2 py-1" rowSpan={6}>TOTALES</td>
              <td className="border border-green-800 px-2 py-1">Ventas</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(totals.ventasBs)}</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(totals.ventasDol)}</td>
            </tr>
            <tr className="bg-green-700 text-white font-bold">
              <td className="border border-green-800 px-2 py-1">Ctas x Cobrar</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(totals.cxcBs)}</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(totals.cxcDol)}</td>
            </tr>
            <tr className="bg-green-700 text-white font-bold">
              <td className="border border-green-800 px-2 py-1">Nómina</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.nominaBs)}</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.nominaDol)}</td>
            </tr>
            <tr className="bg-green-700 text-white font-bold">
              <td className="border border-green-800 px-2 py-1">Facturas</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.facturasBs)}</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.facturasDol)}</td>
            </tr>
            <tr className="bg-green-700 text-white font-bold">
              <td className="border border-green-800 px-2 py-1">Ctas x Pagar</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.cxpBs)}</td>
              <td className="border border-green-800 px-2 py-1 text-right">{fmt(-totals.cxpDol)}</td>
            </tr>
            <tr className="bg-green-800 text-white font-bold text-sm">
              <td className="border border-green-900 px-2 py-1.5">BALANCE FINAL</td>
              <td className="border border-green-900 px-2 py-1.5 text-right">{fmt(grandTotalBs)}</td>
              <td className="border border-green-900 px-2 py-1.5 text-right">{fmt(grandTotalDol)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthBlock({ r, totalBs, totalDol, showMonth, isLast }: {
  r: { mes: string; ventasBs: number; ventasDol: number; cxcBs: number; cxcDol: number; nominaBs: number; nominaDol: number; facturasBs: number; facturasDol: number; cxpBs: number; cxpDol: number };
  totalBs: number;
  totalDol: number;
  showMonth: boolean;
  isLast: boolean;
}) {
  return (
    <>
      <tr className="bg-blue-50 dark:bg-blue-950/30">
        <td className="border px-2 py-0.5 font-bold text-blue-800 dark:text-blue-300" rowSpan={6}>{mesLabel(r.mes)}</td>
        <td className="border px-2 py-0.5">Ventas</td>
        <td className="border px-2 py-0.5 text-right text-green-700 dark:text-green-400">{fmt(r.ventasBs)}</td>
        <td className="border px-2 py-0.5 text-right text-green-700 dark:text-green-400">{fmt(r.ventasDol)}</td>
      </tr>
      <tr className="bg-blue-50 dark:bg-blue-950/30">
        <td className="border px-2 py-0.5">Ctas x Cobrar</td>
        <td className="border px-2 py-0.5 text-right text-green-700 dark:text-green-400">{fmt(r.cxcBs)}</td>
        <td className="border px-2 py-0.5 text-right text-green-700 dark:text-green-400">{fmt(r.cxcDol)}</td>
      </tr>
      <tr className="bg-blue-50 dark:bg-blue-950/30">
        <td className="border px-2 py-0.5">Nómina</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.nominaBs)}</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.nominaDol)}</td>
      </tr>
      <tr className="bg-blue-50 dark:bg-blue-950/30">
        <td className="border px-2 py-0.5">Facturas</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.facturasBs)}</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.facturasDol)}</td>
      </tr>
      <tr className="bg-blue-50 dark:bg-blue-950/30">
        <td className="border px-2 py-0.5">Ctas x Pagar</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.cxpBs)}</td>
        <td className="border px-2 py-0.5 text-right text-red-700 dark:text-red-400">{fmt(-r.cxpDol)}</td>
      </tr>
      <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
        <td className="border px-2 py-0.5">Total</td>
        <td className={`border px-2 py-0.5 text-right ${totalBs >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{fmt(totalBs)}</td>
        <td className={`border px-2 py-0.5 text-right ${totalDol >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{fmt(totalDol)}</td>
      </tr>
    </>
  );
}