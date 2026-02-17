import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import jsPDF from "jspdf";

interface CentralRow {
  central: string;
  finca: string;
  total_neto: number;
  transporte_propio: number;
  particular: number;
}

interface FincaRow {
  central: string;
  finca: string;
  total_neto: number;
  total_azucar: number;
  grado: number;
}

interface ReporteArrimeProps {
  reportType: "semanal_central" | "semanal_finca";
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#a855f7"];

const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReporteArrime({ reportType }: ReporteArrimeProps) {
  const { showPop } = useMyPop();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: constanteParams = [] } = useQuery<any[]>({
    queryKey: ["/api/parametros?tipo=constante"],
  });

  const zafraStartDate = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
    const param = constanteParams.find((p: any) => {
      const n = normalize(p.nombre || "");
      return n === "fehainicio zafra" || n === "fechainicio zafra" || n === "fecha inicio zafra" || n === "fehainiciozafra" || n === "fechainiciozafra";
    });
    if (!param) return null;
    const val = (param.descripcion || "").trim();
    if (!val) return null;
    const parts = val.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;
    return d;
  }, [constanteParams]);

  const zafraStartISO = useMemo(() => {
    if (!zafraStartDate) return "";
    return `${zafraStartDate.getFullYear()}-${String(zafraStartDate.getMonth() + 1).padStart(2, "0")}-${String(zafraStartDate.getDate()).padStart(2, "0")}`;
  }, [zafraStartDate]);

  const weekOptions = useMemo(() => {
    if (!zafraStartDate) return [];
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const weeks: { value: string; label: string; startISO: string; endISO: string }[] = [];
    let weekStart = new Date(zafraStartDate);
    let weekNum = 1;
    while (weekStart <= now) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startISO = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
      const endISO = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
      const startLabel = `${String(weekStart.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")}/${String(weekStart.getFullYear() % 100).padStart(2, "0")}`;
      const endLabel = `${String(weekEnd.getDate()).padStart(2, "0")}/${String(weekEnd.getMonth() + 1).padStart(2, "0")}/${String(weekEnd.getFullYear() % 100).padStart(2, "0")}`;
      weeks.push({
        value: String(weekNum),
        label: `Semana ${weekNum} (${startLabel}-${endLabel})`,
        startISO,
        endISO,
      });
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }
    return weeks;
  }, [zafraStartDate]);

  const currentWeek = weekOptions.find(w => w.value === selectedWeek);
  const weekStart = currentWeek?.startISO || "";
  const weekEnd = currentWeek?.endISO || "";

  const endpoint = reportType === "semanal_central"
    ? `/api/arrime/reporte/semanal-central`
    : `/api/arrime/reporte/semanal-finca`;

  const queryParams = weekStart && weekEnd && zafraStartISO
    ? `?weekStart=${weekStart}&weekEnd=${weekEnd}&zafraStart=${zafraStartISO}`
    : "";

  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: [endpoint, weekStart, weekEnd, zafraStartISO],
    queryFn: async () => {
      if (!queryParams) return { semanal: [], zafra: [] };
      const res = await fetch(`${endpoint}${queryParams}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      return res.json();
    },
    enabled: !!weekStart && !!weekEnd && !!zafraStartISO,
  });

  const semanalData: any[] = reportData?.semanal || [];
  const zafraData: any[] = reportData?.zafra || [];

  const centralGrouped = useMemo(() => {
    const group = (rows: any[]) => {
      const map: Record<string, any[]> = {};
      for (const r of rows) {
        if (!map[r.central]) map[r.central] = [];
        map[r.central].push(r);
      }
      return map;
    };
    return { semanal: group(semanalData), zafra: group(zafraData) };
  }, [semanalData, zafraData]);

  const centrales = useMemo(() => {
    const all = new Set<string>();
    semanalData.forEach(r => all.add(r.central));
    zafraData.forEach(r => all.add(r.central));
    return Array.from(all).sort();
  }, [semanalData, zafraData]);

  const chartDataCentral: any[] = reportType === "semanal_central"
    ? (reportData?.chartCentralSemanal || []).map((s: any) => {
        const z = (reportData?.chartCentralZafra || []).find((zr: any) => zr.name === s.name);
        return { name: s.name, semanal_total: s.neto, zafra_total: z?.neto || 0 };
      })
    : [];

  const chartDataFinca: any[] = reportType === "semanal_finca"
    ? (reportData?.chartFincaSemanal || [])
    : [];

  const pieData: any[] = reportType === "semanal_central"
    ? (reportData?.pieSemanal || []).filter((p: any) => p.value > 0)
    : [];

  const generatePdf = () => {
    if (semanalData.length === 0) {
      showPop({ title: "Sin datos", message: "No hay datos para generar el PDF" });
      return;
    }
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const weekLabel = currentWeek?.label || "Todas";
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(reportType === "semanal_central" ? "RESUMEN SEMANAL POR CENTRAL" : "RESUMEN SEMANAL POR FINCA - GRADO Y TONELADAS", pageW / 2, 12, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(weekLabel, pageW / 2, 18, { align: "center" });

      let y = 25;
      const lh = 5;
      const leftM = 10;

      if (reportType === "semanal_central") {
        const cols = [
          { label: "Central / Finca", x: leftM, w: 55, align: "left" as const },
          { label: "Total Sem.", x: 70, w: 28, align: "right" as const },
          { label: "Trans.Pro.", x: 100, w: 28, align: "right" as const },
          { label: "Particular", x: 130, w: 28, align: "right" as const },
          { label: "Total Zafra", x: 165, w: 28, align: "right" as const },
          { label: "Trans.Pro.Z", x: 195, w: 28, align: "right" as const },
          { label: "Particular Z", x: 225, w: 28, align: "right" as const },
        ];

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        cols.forEach(c => {
          if (c.align === "right") doc.text(c.label, c.x + c.w, y, { align: "right" });
          else doc.text(c.label, c.x, y);
        });
        y += 2;
        doc.line(leftM, y, pageW - leftM, y);
        y += lh;

        const serverCentralTotalsSem: any[] = reportData?.chartCentralSemanal || [];
        const serverCentralTotalsZaf: any[] = reportData?.chartCentralZafra || [];
        const serverGrandSem = reportData?.grandTotalSemanal || { neto: 0, propio: 0, part: 0 };
        const serverGrandZaf = reportData?.grandTotalZafra || { neto: 0, propio: 0, part: 0 };

        for (const central of centrales) {
          if (y > 190) { doc.addPage(); y = 15; }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(central.toUpperCase(), leftM, y);
          y += lh;

          const semRows = centralGrouped.semanal[central] || [];
          const zafRows = centralGrouped.zafra[central] || [];
          const zafMap: Record<string, any> = {};
          zafRows.forEach(r => { zafMap[r.finca] = r; });

          const allFincas = new Set<string>();
          semRows.forEach(r => allFincas.add(r.finca));
          zafRows.forEach(r => allFincas.add(r.finca));
          const fincas = Array.from(allFincas).sort();

          for (const finca of fincas) {
            if (y > 190) { doc.addPage(); y = 15; }
            const sem = semRows.find(r => r.finca === finca);
            const zaf = zafMap[finca];
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(finca || "", leftM + 3, y);
            if (sem) {
              doc.text(fmt(sem.total_neto), cols[1].x + cols[1].w, y, { align: "right" });
              doc.text(fmt(sem.transporte_propio), cols[2].x + cols[2].w, y, { align: "right" });
              doc.text(fmt(sem.particular), cols[3].x + cols[3].w, y, { align: "right" });
            }
            if (zaf) {
              doc.text(fmt(zaf.total_neto), cols[4].x + cols[4].w, y, { align: "right" });
              doc.text(fmt(zaf.transporte_propio), cols[5].x + cols[5].w, y, { align: "right" });
              doc.text(fmt(zaf.particular), cols[6].x + cols[6].w, y, { align: "right" });
            }
            y += lh;
          }

          if (y > 190) { doc.addPage(); y = 15; }
          const ctSem = serverCentralTotalsSem.find((ct: any) => ct.name === central) || { neto: 0, propio: 0, part: 0 };
          const ctZaf = serverCentralTotalsZaf.find((ct: any) => ct.name === central) || { neto: 0, propio: 0, part: 0 };
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text(`Total x Central:`, leftM + 3, y);
          doc.text(fmt(ctSem.neto), cols[1].x + cols[1].w, y, { align: "right" });
          doc.text(fmt(ctSem.propio), cols[2].x + cols[2].w, y, { align: "right" });
          doc.text(fmt(ctSem.part), cols[3].x + cols[3].w, y, { align: "right" });
          doc.text(fmt(ctZaf.neto), cols[4].x + cols[4].w, y, { align: "right" });
          doc.text(fmt(ctZaf.propio), cols[5].x + cols[5].w, y, { align: "right" });
          doc.text(fmt(ctZaf.part), cols[6].x + cols[6].w, y, { align: "right" });
          y += 2;
          doc.line(leftM, y, pageW - leftM, y);
          y += lh;
        }

        if (y > 190) { doc.addPage(); y = 15; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("TOTAL GENERAL", leftM, y);
        doc.text(fmt(serverGrandSem.neto), cols[1].x + cols[1].w, y, { align: "right" });
        doc.text(fmt(serverGrandSem.propio), cols[2].x + cols[2].w, y, { align: "right" });
        doc.text(fmt(serverGrandSem.part), cols[3].x + cols[3].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.neto), cols[4].x + cols[4].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.propio), cols[5].x + cols[5].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.part), cols[6].x + cols[6].w, y, { align: "right" });
      } else {
        const cols = [
          { label: "Central / Finca", x: leftM, w: 55, align: "left" as const },
          { label: "Ton. Sem.", x: 70, w: 25, align: "right" as const },
          { label: "Azúcar Sem.", x: 97, w: 25, align: "right" as const },
          { label: "Grado Sem.", x: 124, w: 22, align: "right" as const },
          { label: "Ton. Zafra", x: 152, w: 25, align: "right" as const },
          { label: "Azúcar Zafra", x: 179, w: 25, align: "right" as const },
          { label: "Grado Zafra", x: 206, w: 22, align: "right" as const },
        ];

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        cols.forEach(c => {
          if (c.align === "right") doc.text(c.label, c.x + c.w, y, { align: "right" });
          else doc.text(c.label, c.x, y);
        });
        y += 2;
        doc.line(leftM, y, pageW - leftM, y);
        y += lh;

        const serverCentralTotalsSem: any[] = reportData?.centralTotalsSemanal || [];
        const serverCentralTotalsZaf: any[] = reportData?.centralTotalsZafra || [];
        const serverGrandSem = reportData?.grandTotalSemanal || { neto: 0, azucar: 0, grado: 0 };
        const serverGrandZaf = reportData?.grandTotalZafra || { neto: 0, azucar: 0, grado: 0 };

        for (const central of centrales) {
          if (y > 190) { doc.addPage(); y = 15; }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(central.toUpperCase(), leftM, y);
          y += lh;

          const semRows = (centralGrouped.semanal[central] || []) as FincaRow[];
          const zafRows = (centralGrouped.zafra[central] || []) as FincaRow[];
          const zafMap: Record<string, FincaRow> = {};
          zafRows.forEach(r => { zafMap[r.finca] = r; });

          const allFincas = new Set<string>();
          semRows.forEach(r => allFincas.add(r.finca));
          zafRows.forEach(r => allFincas.add(r.finca));
          const fincas = Array.from(allFincas).sort();

          for (const finca of fincas) {
            if (y > 190) { doc.addPage(); y = 15; }
            const sem = semRows.find(r => r.finca === finca);
            const zaf = zafMap[finca];
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(finca || "", leftM + 3, y);
            if (sem) {
              doc.text(fmt(sem.total_neto), cols[1].x + cols[1].w, y, { align: "right" });
              doc.text(fmt(sem.total_azucar), cols[2].x + cols[2].w, y, { align: "right" });
              doc.text(fmt(sem.grado), cols[3].x + cols[3].w, y, { align: "right" });
            }
            if (zaf) {
              doc.text(fmt(zaf.total_neto), cols[4].x + cols[4].w, y, { align: "right" });
              doc.text(fmt(zaf.total_azucar), cols[5].x + cols[5].w, y, { align: "right" });
              doc.text(fmt(zaf.grado), cols[6].x + cols[6].w, y, { align: "right" });
            }
            y += lh;
          }

          if (y > 190) { doc.addPage(); y = 15; }
          const ctSem = serverCentralTotalsSem.find((ct: any) => ct.name === central) || { neto: 0, azucar: 0, grado: 0 };
          const ctZaf = serverCentralTotalsZaf.find((ct: any) => ct.name === central) || { neto: 0, azucar: 0, grado: 0 };
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text(`Total x Central:`, leftM + 3, y);
          doc.text(fmt(ctSem.neto), cols[1].x + cols[1].w, y, { align: "right" });
          doc.text(fmt(ctSem.azucar), cols[2].x + cols[2].w, y, { align: "right" });
          doc.text(fmt(ctSem.grado), cols[3].x + cols[3].w, y, { align: "right" });
          doc.text(fmt(ctZaf.neto), cols[4].x + cols[4].w, y, { align: "right" });
          doc.text(fmt(ctZaf.azucar), cols[5].x + cols[5].w, y, { align: "right" });
          doc.text(fmt(ctZaf.grado), cols[6].x + cols[6].w, y, { align: "right" });
          y += 2;
          doc.line(leftM, y, pageW - leftM, y);
          y += lh;
        }

        if (y > 190) { doc.addPage(); y = 15; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("TOTAL GENERAL", leftM, y);
        doc.text(fmt(serverGrandSem.neto), cols[1].x + cols[1].w, y, { align: "right" });
        doc.text(fmt(serverGrandSem.azucar), cols[2].x + cols[2].w, y, { align: "right" });
        doc.text(fmt(serverGrandSem.grado), cols[3].x + cols[3].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.neto), cols[4].x + cols[4].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.azucar), cols[5].x + cols[5].w, y, { align: "right" });
        doc.text(fmt(serverGrandZaf.grado), cols[6].x + cols[6].w, y, { align: "right" });
      }

      window.open(doc.output("bloburl"), "_blank");
    } catch (err: any) {
      showPop({ title: "Error", message: err.message || "Error al generar PDF" });
    } finally {
      setPdfLoading(false);
    }
  };

  const renderCentralTable = () => {
    const grandTotalSem = reportData?.grandTotalSemanal || { neto: 0, propio: 0, part: 0 };
    const grandTotalZaf = reportData?.grandTotalZafra || { neto: 0, propio: 0, part: 0 };
    const centralTotalsSem = reportData?.chartCentralSemanal || [];
    const centralTotalsZaf = reportData?.chartCentralZafra || [];

    return (
      <div className="overflow-auto text-xs">
        <table className="w-full border-collapse" data-testid="table-reporte-central">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-2 py-1 border-b font-bold" rowSpan={2}>Central / Finca</th>
              <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={3}>Total Semanal</th>
              <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={3}>Total Zafra</th>
            </tr>
            <tr className="bg-muted/30">
              <th className="text-right px-2 py-0.5 border-b border-l font-semibold">Total</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Trans.Pro.</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Particular</th>
              <th className="text-right px-2 py-0.5 border-b border-l font-semibold">Total</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Trans.Pro.</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Particular</th>
            </tr>
          </thead>
          <tbody>
            {centrales.map((central, ci) => {
              const semRows = centralGrouped.semanal[central] || [];
              const zafRows = centralGrouped.zafra[central] || [];
              const zafMap: Record<string, any> = {};
              zafRows.forEach(r => { zafMap[r.finca] = r; });
              const allFincas = new Set<string>();
              semRows.forEach(r => allFincas.add(r.finca));
              zafRows.forEach(r => allFincas.add(r.finca));
              const fincas = Array.from(allFincas).sort();

              const cSem = centralTotalsSem.find((ct: any) => ct.name === central) || { neto: 0, propio: 0, part: 0 };
              const cZaf = centralTotalsZaf.find((ct: any) => ct.name === central) || { neto: 0, propio: 0, part: 0 };

              const rows = fincas.map(finca => {
                const sem = semRows.find(r => r.finca === finca);
                const zaf = zafMap[finca];
                return (
                  <tr key={finca} className="hover:bg-muted/20">
                    <td className="px-2 py-0.5 pl-6">{finca}</td>
                    <td className="text-right px-2 py-0.5 border-l">{sem ? fmt(sem.total_neto) : ""}</td>
                    <td className="text-right px-2 py-0.5">{sem ? fmt(sem.transporte_propio) : ""}</td>
                    <td className="text-right px-2 py-0.5">{sem ? fmt(sem.particular) : ""}</td>
                    <td className="text-right px-2 py-0.5 border-l">{zaf ? fmt(zaf.total_neto) : ""}</td>
                    <td className="text-right px-2 py-0.5">{zaf ? fmt(zaf.transporte_propio) : ""}</td>
                    <td className="text-right px-2 py-0.5">{zaf ? fmt(zaf.particular) : ""}</td>
                  </tr>
                );
              });

              return [
                <tr key={`central-${ci}`} className="bg-muted/40">
                  <td className="px-2 py-0.5 font-bold uppercase" colSpan={7}>{central}</td>
                </tr>,
                ...rows,
                <tr key={`total-${ci}`} className="bg-muted/30 font-bold border-t">
                  <td className="px-2 py-0.5 pl-6">Total x Central:</td>
                  <td className="text-right px-2 py-0.5 border-l">{fmt(cSem.neto)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cSem.propio)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cSem.part)}</td>
                  <td className="text-right px-2 py-0.5 border-l">{fmt(cZaf.neto)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cZaf.propio)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cZaf.part)}</td>
                </tr>,
              ];
            })}
            <tr className="bg-muted font-bold border-t-2 text-sm">
              <td className="px-2 py-1">TOTAL GENERAL</td>
              <td className="text-right px-2 py-1 border-l">{fmt(grandTotalSem.neto)}</td>
              <td className="text-right px-2 py-1">{fmt(grandTotalSem.propio)}</td>
              <td className="text-right px-2 py-1">{fmt(grandTotalSem.part)}</td>
              <td className="text-right px-2 py-1 border-l">{fmt(grandTotalZaf.neto)}</td>
              <td className="text-right px-2 py-1">{fmt(grandTotalZaf.propio)}</td>
              <td className="text-right px-2 py-1">{fmt(grandTotalZaf.part)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderFincaTable = () => {
    const grandSem = reportData?.grandTotalSemanal || { neto: 0, azucar: 0, grado: 0 };
    const grandZaf = reportData?.grandTotalZafra || { neto: 0, azucar: 0, grado: 0 };
    const centralTotalsSem = reportData?.centralTotalsSemanal || [];
    const centralTotalsZaf = reportData?.centralTotalsZafra || [];

    return (
      <div className="overflow-auto text-xs">
        <table className="w-full border-collapse" data-testid="table-reporte-finca">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-2 py-1 border-b font-bold" rowSpan={2}>Central / Finca</th>
              <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={3}>Total Semanal</th>
              <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={3}>Total Zafra</th>
            </tr>
            <tr className="bg-muted/30">
              <th className="text-right px-2 py-0.5 border-b border-l font-semibold">Toneladas</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Azúcar</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Grado %</th>
              <th className="text-right px-2 py-0.5 border-b border-l font-semibold">Toneladas</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Azúcar</th>
              <th className="text-right px-2 py-0.5 border-b font-semibold">Grado %</th>
            </tr>
          </thead>
          <tbody>
            {centrales.map((central, ci) => {
              const semRows = (centralGrouped.semanal[central] || []) as FincaRow[];
              const zafRows = (centralGrouped.zafra[central] || []) as FincaRow[];
              const zafMap: Record<string, FincaRow> = {};
              zafRows.forEach(r => { zafMap[r.finca] = r; });
              const allFincas = new Set<string>();
              semRows.forEach(r => allFincas.add(r.finca));
              zafRows.forEach(r => allFincas.add(r.finca));
              const fincas = Array.from(allFincas).sort();

              const cSem = centralTotalsSem.find((ct: any) => ct.name === central) || { neto: 0, azucar: 0, grado: 0 };
              const cZaf = centralTotalsZaf.find((ct: any) => ct.name === central) || { neto: 0, azucar: 0, grado: 0 };

              const rows = fincas.map(finca => {
                const sem = semRows.find(r => r.finca === finca);
                const zaf = zafMap[finca];
                return (
                  <tr key={finca} className="hover:bg-muted/20">
                    <td className="px-2 py-0.5 pl-6">{finca}</td>
                    <td className="text-right px-2 py-0.5 border-l">{sem ? fmt(sem.total_neto) : ""}</td>
                    <td className="text-right px-2 py-0.5">{sem ? fmt(sem.total_azucar) : ""}</td>
                    <td className="text-right px-2 py-0.5">{sem ? fmt(sem.grado) : ""}</td>
                    <td className="text-right px-2 py-0.5 border-l">{zaf ? fmt(zaf.total_neto) : ""}</td>
                    <td className="text-right px-2 py-0.5">{zaf ? fmt(zaf.total_azucar) : ""}</td>
                    <td className="text-right px-2 py-0.5">{zaf ? fmt(zaf.grado) : ""}</td>
                  </tr>
                );
              });

              return [
                <tr key={`central-${ci}`} className="bg-muted/40">
                  <td className="px-2 py-0.5 font-bold uppercase" colSpan={7}>{central}</td>
                </tr>,
                ...rows,
                <tr key={`total-${ci}`} className="bg-muted/30 font-bold border-t">
                  <td className="px-2 py-0.5 pl-6">Total x Central:</td>
                  <td className="text-right px-2 py-0.5 border-l">{fmt(cSem.neto)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cSem.azucar)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cSem.grado)}</td>
                  <td className="text-right px-2 py-0.5 border-l">{fmt(cZaf.neto)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cZaf.azucar)}</td>
                  <td className="text-right px-2 py-0.5">{fmt(cZaf.grado)}</td>
                </tr>,
              ];
            })}
            <tr className="bg-muted font-bold border-t-2 text-sm">
              <td className="px-2 py-1">TOTAL GENERAL</td>
              <td className="text-right px-2 py-1 border-l">{fmt(grandSem.neto)}</td>
              <td className="text-right px-2 py-1">{fmt(grandSem.azucar)}</td>
              <td className="text-right px-2 py-1">{fmt(grandSem.grado)}</td>
              <td className="text-right px-2 py-1 border-l">{fmt(grandZaf.neto)}</td>
              <td className="text-right px-2 py-1">{fmt(grandZaf.azucar)}</td>
              <td className="text-right px-2 py-1">{fmt(grandZaf.grado)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-2 p-2" data-testid="reporte-arrime-container">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold">Semana:</span>
        <Select value={selectedWeek || "none"} onValueChange={v => setSelectedWeek(v === "none" ? "" : v)}>
          <SelectTrigger className="h-7 w-[260px] text-xs" data-testid="select-reporte-semana">
            <SelectValue placeholder="Seleccione semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Seleccione semana</SelectItem>
            {weekOptions.map(w => (
              <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MyButtonStyle
          color="blue"
          onClick={generatePdf}
          loading={pdfLoading}
          disabled={!selectedWeek || semanalData.length === 0}
          data-testid="button-generar-pdf-arrime"
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Imprimir PDF
        </MyButtonStyle>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!selectedWeek && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Seleccione una semana para ver el reporte
        </div>
      )}

      {selectedWeek && semanalData.length === 0 && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No hay datos para la semana seleccionada
        </div>
      )}

      {selectedWeek && semanalData.length > 0 && (
        <div className="flex-1 overflow-auto flex flex-col gap-3 min-h-0">
          {reportType === "semanal_central" ? renderCentralTable() : renderFincaTable()}

          <div className="flex gap-2 flex-wrap min-h-[200px]">
            <div className="flex-1 min-w-[300px]">
              <h3 className="text-xs font-bold text-center mb-1">
                {reportType === "semanal_central" ? "Toneladas por Central" : "Toneladas y Grado por Finca"}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                {reportType === "semanal_central" ? (
                  <BarChart data={chartDataCentral}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="semanal_total" name="Semanal" fill="#3b82f6" />
                    <Bar dataKey="zafra_total" name="Zafra" fill="#22c55e" />
                  </BarChart>
                ) : (
                  <BarChart data={chartDataFinca}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="toneladas" name="Toneladas" fill="#3b82f6" />
                    <Bar yAxisId="right" dataKey="grado" name="Grado %" fill="#f97316" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {reportType === "semanal_central" && pieData.length > 0 && (
              <div className="min-w-[200px] w-[250px]">
                <h3 className="text-xs font-bold text-center mb-1">Transporte Semanal</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
