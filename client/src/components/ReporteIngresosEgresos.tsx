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

      const pdfAnyCxcCxp = parsed.some(r => r.mes >= "2026-01");

      for (const r of parsed) {
        const totalBs = calcTotal(r);
        const totalDol = calcTotalDol(r);
        const monthShowCxcCxp = r.mes >= "2026-01";

        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        const bodyRows: string[][] = [
          ["Ventas:", fmt(r.ventasBs), "Ventas:", fmt(r.ventasDol)],
        ];
        if (monthShowCxcCxp) bodyRows.push(["Ctas x Cobrar:", fmt(r.cxcBs), "Ctas x Cobrar:", fmt(r.cxcDol)]);
        bodyRows.push(["Nómina:", fmt(-r.nominaBs), "Nómina:", fmt(-r.nominaDol)]);
        bodyRows.push(["Facturas:", fmt(-r.facturasBs), "Facturas:", fmt(-r.facturasDol)]);
        if (monthShowCxcCxp) bodyRows.push(["Ctas x Pagar:", fmt(-r.cxpBs), "Ctas x Pagar:", fmt(-r.cxpDol)]);
        bodyRows.push(["Total:", fmt(totalBs), "Total:", fmt(totalDol)]);

        const totalRowIdx = bodyRows.length - 1;

        autoTable(doc, {
          startY: yPos,
          head: [[`${mesLabel(r.mes)}`, "Bolívares", "", "Dólares"]],
          body: bodyRows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.2, lineColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { halign: "right" as const, cellWidth: 40 },
            2: { cellWidth: 40 },
            3: { halign: "right" as const, cellWidth: 40 },
          },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.row.index === totalRowIdx) {
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

      const totalBodyRows: string[][] = [
        ["Total Ventas:", fmt(totals.ventasBs), "Total Ventas:", fmt(totals.ventasDol)],
      ];
      if (pdfAnyCxcCxp) totalBodyRows.push(["Total Ctas x Cobrar:", fmt(totals.cxcBs), "Total Ctas x Cobrar:", fmt(totals.cxcDol)]);
      totalBodyRows.push(["Total Nómina:", fmt(-totals.nominaBs), "Total Nómina:", fmt(-totals.nominaDol)]);
      totalBodyRows.push(["Total Facturas:", fmt(-totals.facturasBs), "Total Facturas:", fmt(-totals.facturasDol)]);
      if (pdfAnyCxcCxp) totalBodyRows.push(["Total Ctas x Pagar:", fmt(-totals.cxpBs), "Total Ctas x Pagar:", fmt(-totals.cxpDol)]);
      totalBodyRows.push(["BALANCE FINAL:", fmt(grandTotalBs), "BALANCE FINAL:", fmt(grandTotalDol)]);

      autoTable(doc, {
        startY: yPos,
        head: [["TOTALES GENERALES", "Bolívares", "", "Dólares"]],
        body: totalBodyRows,
        styles: { fontSize: 9, fontStyle: "bold" },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", lineWidth: 0.2, lineColor: [0, 0, 0] },
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

  const balanceBsColor = grandTotalBs >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300";
  const balanceDolColor = grandTotalDol >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300";
  const anyCxcCxp = parsed.some(r => r.mes >= "2026-01");

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

      <div className="flex-1 overflow-auto p-3 space-y-2" data-testid="table-ingresos-egresos">
        {parsed.map((r, idx) => {
          const totalBs = calcTotal(r);
          const totalDol = calcTotalDol(r);
          return (
            <MonthCard key={r.mes} r={r} totalBs={totalBs} totalDol={totalDol} even={idx % 2 === 0} showCxcCxp={r.mes >= "2026-01"} />
          );
        })}

        <div className="rounded-lg border-2 border-slate-400 dark:border-slate-500 overflow-hidden mt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-700 dark:bg-slate-600">
                <th className="px-3 py-1.5 text-left text-white font-bold text-sm tracking-wide" style={{ width: "50%" }}>TOTALES GENERALES</th>
                <th className="px-3 py-1.5 text-right text-slate-300 font-normal text-[10px]" style={{ width: "25%" }}>Bolívares</th>
                <th className="px-3 py-1.5 text-right text-slate-300 font-normal text-[10px]" style={{ width: "25%" }}>Dólares</th>
              </tr>
            </thead>
            <tbody>
              <TotalRow label="Ventas" bs={fmt(totals.ventasBs)} dol={fmt(totals.ventasDol)} type="ingreso" />
              {anyCxcCxp && <TotalRow label="Ctas x Cobrar" bs={fmt(totals.cxcBs)} dol={fmt(totals.cxcDol)} type="ingreso" />}
              <TotalRow label="Nómina" bs={fmt(-totals.nominaBs)} dol={fmt(-totals.nominaDol)} type="egreso" />
              <TotalRow label="Facturas" bs={fmt(-totals.facturasBs)} dol={fmt(-totals.facturasDol)} type="egreso" />
              {anyCxcCxp && <TotalRow label="Ctas x Pagar" bs={fmt(-totals.cxpBs)} dol={fmt(-totals.cxpDol)} type="egreso" />}
              <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                <td className="px-3 py-2 font-bold text-sm text-slate-800 dark:text-slate-200">BALANCE FINAL</td>
                <td className={`px-3 py-2 text-right tabular-nums font-bold text-sm ${balanceBsColor}`}>{fmt(grandTotalBs)}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-bold text-sm ${balanceDolColor}`}>{fmt(grandTotalDol)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConceptRow({ label, bs, dol, type }: { label: string; bs: string; dol: string; type: "ingreso" | "egreso" }) {
  const colorClass = type === "ingreso"
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-red-700 dark:text-red-400";
  const icon = type === "ingreso" ? "+" : "−";
  return (
    <tr>
      <td className="px-3 py-0.5 text-xs text-slate-600 dark:text-slate-400">
        <span className={`inline-block w-3 text-center font-bold ${colorClass}`}>{icon}</span>
        {" "}{label}
      </td>
      <td className={`px-3 py-0.5 text-xs text-right tabular-nums ${colorClass}`}>{bs}</td>
      <td className={`px-3 py-0.5 text-xs text-right tabular-nums ${colorClass}`}>{dol}</td>
    </tr>
  );
}

function TotalRow({ label, bs, dol, type }: { label: string; bs: string; dol: string; type: "ingreso" | "egreso" }) {
  const colorClass = type === "ingreso"
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-red-700 dark:text-red-300";
  const icon = type === "ingreso" ? "+" : "−";
  return (
    <tr>
      <td className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span className={`inline-block w-3 text-center font-bold ${colorClass}`}>{icon}</span>
        {" "}{label}
      </td>
      <td className={`px-3 py-1 text-xs text-right tabular-nums font-semibold ${colorClass}`}>{bs}</td>
      <td className={`px-3 py-1 text-xs text-right tabular-nums font-semibold ${colorClass}`}>{dol}</td>
    </tr>
  );
}

function MonthCard({ r, totalBs, totalDol, even, showCxcCxp }: {
  r: { mes: string; ventasBs: number; ventasDol: number; cxcBs: number; cxcDol: number; nominaBs: number; nominaDol: number; facturasBs: number; facturasDol: number; cxpBs: number; cxpDol: number };
  totalBs: number;
  totalDol: number;
  even: boolean;
  showCxcCxp: boolean;
}) {
  const totalBsColor = totalBs >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300";
  const totalDolColor = totalDol >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300";
  const bgClass = even ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-900/60";

  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${bgClass}`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-600 dark:bg-slate-700">
            <th className="px-3 py-1 text-left text-white font-bold text-xs tracking-wide" style={{ width: "50%" }}>{mesLabel(r.mes)}</th>
            <th className="px-3 py-1 text-right text-slate-300 font-normal text-[10px]" style={{ width: "25%" }}>Bolívares</th>
            <th className="px-3 py-1 text-right text-slate-300 font-normal text-[10px]" style={{ width: "25%" }}>Dólares</th>
          </tr>
        </thead>
        <tbody>
          <ConceptRow label="Ventas" bs={fmt(r.ventasBs)} dol={fmt(r.ventasDol)} type="ingreso" />
          {showCxcCxp && <ConceptRow label="Ctas x Cobrar" bs={fmt(r.cxcBs)} dol={fmt(r.cxcDol)} type="ingreso" />}
          <ConceptRow label="Nómina" bs={fmt(-r.nominaBs)} dol={fmt(-r.nominaDol)} type="egreso" />
          <ConceptRow label="Facturas" bs={fmt(-r.facturasBs)} dol={fmt(-r.facturasDol)} type="egreso" />
          {showCxcCxp && <ConceptRow label="Ctas x Pagar" bs={fmt(-r.cxpBs)} dol={fmt(-r.cxpDol)} type="egreso" />}
          <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60">
            <td className="px-3 py-1 font-bold text-xs text-slate-700 dark:text-slate-300">Total</td>
            <td className={`px-3 py-1 text-right tabular-nums font-bold ${totalBsColor}`}>{fmt(totalBs)}</td>
            <td className={`px-3 py-1 text-right tabular-nums font-bold ${totalDolColor}`}>{fmt(totalDol)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}