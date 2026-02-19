import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import jsPDF from "jspdf";

const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const NUM_COLS = 8;

export default function ReporteArrime() {
  const { showPop } = useMyPop();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [filterCentral, setFilterCentral] = useState<string>("all");
  const [filterFinca, setFilterFinca] = useState<string>("all");
  const [filterNucleocorte, setFilterNucleocorte] = useState<string>("all");
  const [filterNucleotransporte, setFilterNucleotransporte] = useState<string>("all");
  const [filterProveedor, setFilterProveedor] = useState<string>("all");
  const [filterPlaca, setFilterPlaca] = useState<string>("all");

  const { data: constanteParams = [] } = useQuery<any[]>({
    queryKey: ["/api/parametros?tipo=constante"],
  });

  const buildDistinctUrl = (field: string, extraFilters?: Record<string, string>) => {
    const params = new URLSearchParams({ ...(extraFilters || {}) });
    const qs = params.toString();
    return `/api/arrime/distinct/${field}${qs ? `?${qs}` : ""}`;
  };

  const { data: distinctCentral = [] } = useQuery<string[]>({
    queryKey: ["/api/arrime/distinct/central"],
  });

  const centralFilter = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterCentral !== "all") p.central = filterCentral;
    return p;
  }, [filterCentral]);

  const { data: distinctNucleocorte = [] } = useQuery<string[]>({
    queryKey: ["/api/arrime/distinct/nucleocorte", centralFilter],
    queryFn: async () => {
      const res = await fetch(buildDistinctUrl("nucleocorte", centralFilter));
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const { data: distinctNucleotransporte = [] } = useQuery<string[]>({
    queryKey: ["/api/arrime/distinct/nucleotransporte", centralFilter],
    queryFn: async () => {
      const res = await fetch(buildDistinctUrl("nucleotransporte", centralFilter));
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const cascadeForDownstream = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterCentral !== "all") p.central = filterCentral;
    if (filterNucleocorte !== "all") p.nucleocorte = filterNucleocorte;
    if (filterNucleotransporte !== "all") p.nucleotransporte = filterNucleotransporte;
    return p;
  }, [filterCentral, filterNucleocorte, filterNucleotransporte]);

  const { data: distinctFinca = [] } = useQuery<string[]>({
    queryKey: ["/api/arrime/distinct/finca", cascadeForDownstream],
    queryFn: async () => {
      const res = await fetch(buildDistinctUrl("finca", cascadeForDownstream));
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const cascadeForPlacaProv = useMemo(() => {
    const p: Record<string, string> = { ...cascadeForDownstream };
    if (filterFinca !== "all") p.finca = filterFinca;
    return p;
  }, [cascadeForDownstream, filterFinca]);

  const { data: distinctProveedor = [] } = useQuery<string[]>({
    queryKey: ["/api/arrime/distinct/proveedor", cascadeForPlacaProv],
    queryFn: async () => {
      const res = await fetch(buildDistinctUrl("proveedor", cascadeForPlacaProv));
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });

  const cascadeForPlaca = useMemo(() => {
    const p: Record<string, string> = { ...cascadeForPlacaProv };
    if (filterProveedor !== "all") p.proveedor = filterProveedor;
    return p;
  }, [cascadeForPlacaProv, filterProveedor]);

  const { data: distinctPlacaRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/arrime/distinct/placa", cascadeForPlaca],
    queryFn: async () => {
      const res = await fetch(buildDistinctUrl("placa", cascadeForPlaca));
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
  });
  const distinctPlaca = useMemo(() => distinctPlacaRaw.map((p: any) => typeof p === "string" ? p : (p.val || "")), [distinctPlacaRaw]);

  const distinctOptions = useMemo(() => ({
    central: distinctCentral,
    finca: distinctFinca,
    nucleocorte: distinctNucleocorte,
    nucleotransporte: distinctNucleotransporte,
    proveedor: distinctProveedor,
    placa: distinctPlaca,
  }), [distinctCentral, distinctFinca, distinctNucleocorte, distinctNucleotransporte, distinctProveedor, distinctPlaca]);

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
    const weeks: { value: string; label: string; startISO: string; endISO: string; startDisplay: string; endDisplay: string }[] = [];
    let ws = new Date(zafraStartDate);
    let weekNum = 1;
    while (ws <= now) {
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const startISO = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
      const endISO = `${we.getFullYear()}-${String(we.getMonth() + 1).padStart(2, "0")}-${String(we.getDate()).padStart(2, "0")}`;
      const startDisplay = `${String(ws.getDate()).padStart(2, "0")}/${String(ws.getMonth() + 1).padStart(2, "0")}/${String(ws.getFullYear() % 100).padStart(2, "0")}`;
      const endDisplay = `${String(we.getDate()).padStart(2, "0")}/${String(we.getMonth() + 1).padStart(2, "0")}/${String(we.getFullYear() % 100).padStart(2, "0")}`;
      weeks.push({ value: String(weekNum), label: `Semana ${weekNum} (${startDisplay}-${endDisplay})`, startISO, endISO, startDisplay, endDisplay });
      ws = new Date(ws);
      ws.setDate(ws.getDate() + 7);
      weekNum++;
    }
    return weeks;
  }, [zafraStartDate]);

  const isAllWeeks = selectedWeek === "todas";
  const currentWeek = isAllWeeks ? null : weekOptions.find(w => w.value === selectedWeek);
  const weekStart = currentWeek?.startISO || "";
  const weekEnd = currentWeek?.endISO || "";

  const activeFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filterCentral !== "all") f.central = filterCentral;
    if (filterFinca !== "all") f.finca = filterFinca;
    if (filterNucleocorte !== "all") f.nucleocorte = filterNucleocorte;
    if (filterNucleotransporte !== "all") f.nucleotransporte = filterNucleotransporte;
    if (filterProveedor !== "all") f.proveedor = filterProveedor;
    if (filterPlaca !== "all") f.placa = filterPlaca;
    return f;
  }, [filterCentral, filterFinca, filterNucleocorte, filterNucleotransporte, filterProveedor, filterPlaca]);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  const clearFilters = () => {
    setFilterCentral("all");
    setFilterFinca("all");
    setFilterNucleocorte("all");
    setFilterNucleotransporte("all");
    setFilterProveedor("all");
    setFilterPlaca("all");
  };

  const handleCentralChange = (v: string) => {
    setFilterCentral(v);
    setFilterNucleocorte("all");
    setFilterNucleotransporte("all");
    setFilterFinca("all");
    setFilterProveedor("all");
    setFilterPlaca("all");
  };

  const handleNucleocorteChange = (v: string) => {
    setFilterNucleocorte(v);
    setFilterFinca("all");
    setFilterProveedor("all");
    setFilterPlaca("all");
  };

  const handleNucleotransporteChange = (v: string) => {
    setFilterNucleotransporte(v);
    setFilterFinca("all");
    setFilterProveedor("all");
    setFilterPlaca("all");
  };

  const handleFincaChange = (v: string) => {
    setFilterFinca(v);
    setFilterProveedor("all");
    setFilterPlaca("all");
  };

  const handleProveedorChange = (v: string) => {
    setFilterProveedor(v);
    setFilterPlaca("all");
  };

  const queryParams = useMemo(() => {
    if (!zafraStartISO) return "";
    if (!isAllWeeks && (!weekStart || !weekEnd)) return "";
    const params = new URLSearchParams({ zafraStart: zafraStartISO });
    if (isAllWeeks) {
      params.set("mode", "todas");
    } else {
      params.set("weekStart", weekStart);
      params.set("weekEnd", weekEnd);
    }
    for (const [k, v] of Object.entries(activeFilters)) params.set(k, v);
    return `?${params.toString()}`;
  }, [weekStart, weekEnd, zafraStartISO, activeFilters, isAllWeeks]);

  const canQuery = !!zafraStartISO && (isAllWeeks || (!!weekStart && !!weekEnd));

  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ["/api/arrime/reporte/semanal", selectedWeek, zafraStartISO, activeFilters],
    queryFn: async () => {
      if (!queryParams) return null;
      const res = await fetch(`/api/arrime/reporte/semanal${queryParams}`);
      if (!res.ok) throw new Error("Error al cargar datos");
      return res.json();
    },
    enabled: canQuery && !!selectedWeek,
  });

  const isModeAll = reportData?.mode === "todas";
  const singleRows: any[] = !isModeAll ? (reportData?.rows || []) : [];
  const singleGrandTotal = !isModeAll ? (reportData?.grandTotal || null) : null;
  const allWeeksData: any[] = isModeAll ? (reportData?.weeks || []) : [];
  const hasData = isModeAll ? allWeeksData.length > 0 : singleRows.length > 0;

  const reportTitle = currentWeek
    ? `Validación de Caña Semana del ${currentWeek.startDisplay} hasta ${currentWeek.endDisplay}`
    : isAllWeeks
    ? "Validación de Caña - Todas las Semanas"
    : "Validación de Caña";

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (activeFilters.central) labels.push(`Central: ${activeFilters.central}`);
    if (activeFilters.finca) labels.push(`Finca: ${activeFilters.finca}`);
    if (activeFilters.nucleocorte) labels.push(`N.Corte: ${activeFilters.nucleocorte}`);
    if (activeFilters.nucleotransporte) labels.push(`N.Transporte: ${activeFilters.nucleotransporte}`);
    if (activeFilters.proveedor) labels.push(`Proveedor: ${activeFilters.proveedor}`);
    if (activeFilters.placa) labels.push(`Placa: ${activeFilters.placa}`);
    return labels;
  }, [activeFilters]);

  const renderDataRows = (rows: any[], grandTotal: any) => (
    <>
      {rows.map((row: any, idx: number) => {
        if (row.type === "central_header") {
          return (
            <tr key={`ch-${idx}`} className="bg-muted/40">
              <td className="px-1 py-0.5 font-bold uppercase" colSpan={NUM_COLS + 1}>{row.central}</td>
            </tr>
          );
        }
        if (row.type === "finca") {
          return (
            <tr key={`f-${idx}`} className="hover:bg-muted/20">
              <td className="px-1 py-0.5 pl-4">{row.finca}</td>
              <td className="text-right px-1 py-0.5 border-l">{fmt(row.sem_neto)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_propio)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_particular)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_grado)}</td>
              <td className="text-right px-1 py-0.5 border-l">{fmt(row.zaf_neto)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_propio)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_particular)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_grado)}</td>
            </tr>
          );
        }
        if (row.type === "central_total") {
          return (
            <tr key={`ct-${idx}`} className="bg-muted/30 font-bold border-t">
              <td className="px-1 py-0.5 pl-4">Total Central:</td>
              <td className="text-right px-1 py-0.5 border-l">{fmt(row.sem_neto)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_propio)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_particular)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.sem_grado)}</td>
              <td className="text-right px-1 py-0.5 border-l">{fmt(row.zaf_neto)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_propio)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_particular)}</td>
              <td className="text-right px-1 py-0.5">{fmt(row.zaf_grado)}</td>
            </tr>
          );
        }
        return null;
      })}
      {grandTotal && (
        <tr className="bg-muted font-bold border-t-2 text-xs">
          <td className="px-1 py-1">TOTAL GENERAL</td>
          <td className="text-right px-1 py-1 border-l">{fmt(grandTotal.sem_neto)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.sem_propio)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.sem_particular)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.sem_grado)}</td>
          <td className="text-right px-1 py-1 border-l">{fmt(grandTotal.zaf_neto)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.zaf_propio)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.zaf_particular)}</td>
          <td className="text-right px-1 py-1">{fmt(grandTotal.zaf_grado)}</td>
        </tr>
      )}
    </>
  );

  const renderTableHeader = () => (
    <thead>
      <tr className="bg-muted/50">
        <th className="text-left px-1 py-0.5 border-b font-bold" rowSpan={2}>Central / Finca</th>
        <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={4}>Semanal</th>
        <th className="text-center px-1 py-0.5 border-b font-bold border-l" colSpan={4}>Zafra</th>
      </tr>
      <tr className="bg-muted/30">
        <th className="text-right px-1 py-0.5 border-b border-l font-semibold">Neto</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Propio</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Partic.</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Grado%</th>
        <th className="text-right px-1 py-0.5 border-b border-l font-semibold">Neto</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Propio</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Partic.</th>
        <th className="text-right px-1 py-0.5 border-b font-semibold">Grado%</th>
      </tr>
    </thead>
  );

  const pdfPrintRows = (doc: jsPDF, rows: any[], grandTotal: any, cols: any[], leftM: number, pageH: number, lh: number) => {
    let y = (doc as any).__currentY || 25;

    const printNumericRow = (row: any, label: string, isBold: boolean) => {
      if (y > pageH - 15) { doc.addPage(); y = 12; }
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(6.5);
      doc.text(label, leftM + (isBold ? 0 : 2), y);
      doc.text(fmt(row.sem_neto), cols[1].x + cols[1].w, y, { align: "right" });
      doc.text(fmt(row.sem_propio), cols[2].x + cols[2].w, y, { align: "right" });
      doc.text(fmt(row.sem_particular), cols[3].x + cols[3].w, y, { align: "right" });
      doc.text(fmt(row.sem_grado), cols[4].x + cols[4].w, y, { align: "right" });
      doc.text(fmt(row.zaf_neto), cols[5].x + cols[5].w, y, { align: "right" });
      doc.text(fmt(row.zaf_propio), cols[6].x + cols[6].w, y, { align: "right" });
      doc.text(fmt(row.zaf_particular), cols[7].x + cols[7].w, y, { align: "right" });
      doc.text(fmt(row.zaf_grado), cols[8].x + cols[8].w, y, { align: "right" });
      y += lh;
    };

    for (const row of rows) {
      if (row.type === "central_header") {
        if (y > pageH - 15) { doc.addPage(); y = 12; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text((row.central || "").toUpperCase(), leftM, y);
        y += lh;
      } else if (row.type === "finca") {
        printNumericRow(row, (row.finca || "").substring(0, 30), false);
      } else if (row.type === "central_total") {
        printNumericRow(row, "Total Central:", true);
        const pageW = doc.internal.pageSize.getWidth();
        doc.line(leftM, y - 2, pageW - leftM, y - 2);
      }
    }

    if (grandTotal) {
      if (y > pageH - 15) { doc.addPage(); y = 12; }
      printNumericRow(grandTotal, "TOTAL GENERAL", true);
    }

    (doc as any).__currentY = y;
  };

  const generatePdf = () => {
    if (!hasData) {
      showPop({ title: "Sin datos", message: "No hay datos para generar el PDF" });
      return;
    }
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const leftM = 5;
      const lh = 4;

      const cols = [
        { label: "Central / Finca", x: leftM, w: 42, align: "left" as const },
        { label: "Neto S.", x: 49, w: 20, align: "right" as const },
        { label: "Propio", x: 71, w: 20, align: "right" as const },
        { label: "Partic.", x: 93, w: 20, align: "right" as const },
        { label: "Grado%", x: 115, w: 16, align: "right" as const },
        { label: "Neto Z.", x: 134, w: 20, align: "right" as const },
        { label: "Propio Z.", x: 156, w: 20, align: "right" as const },
        { label: "Partic.Z.", x: 178, w: 20, align: "right" as const },
        { label: "Grado%Z.", x: 200, w: 16, align: "right" as const },
      ];

      const printHeader = (title: string) => {
        let y = 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), pageW / 2, y, { align: "center" });
        y += 5;

        if (activeFilterLabels.length > 0) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(`Filtros: ${activeFilterLabels.join(" | ")}`, pageW / 2, y, { align: "center" });
          y += 4;
        } else {
          y += 2;
        }

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        cols.forEach(c => {
          if (c.align === "right") doc.text(c.label, c.x + c.w, y, { align: "right" });
          else doc.text(c.label, c.x, y);
        });
        y += 2;
        doc.line(leftM, y, pageW - leftM, y);
        y += lh;
        return y;
      };

      if (isModeAll) {
        let firstPage = true;
        for (const weekData of allWeeksData) {
          if (!firstPage) doc.addPage();
          firstPage = false;
          const title = `Validación de Caña Semana del ${weekData.startDisplay} hasta ${weekData.endDisplay}`;
          const y = printHeader(title);
          (doc as any).__currentY = y;
          pdfPrintRows(doc, weekData.rows, weekData.grandTotal, cols, leftM, pageH, lh);
        }
      } else {
        const y = printHeader(reportTitle);
        (doc as any).__currentY = y;
        pdfPrintRows(doc, singleRows, singleGrandTotal, cols, leftM, pageH, lh);
      }

      window.open(doc.output("bloburl"), "_blank");
    } catch (err: any) {
      showPop({ title: "Error", message: err.message || "Error al generar PDF" });
    } finally {
      setPdfLoading(false);
    }
  };

  const renderFilterSelect = (label: string, value: string, onChange: (v: string) => void, options: string[], testId: string) => (
    <div className="flex items-center gap-1" data-testid={`filter-${testId}-container`}>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-6 text-[10px] w-[120px]" data-testid={`select-filter-${testId}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map(o => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-1 p-2" data-testid="reporte-arrime-container">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold">Semana:</span>
        <Select value={selectedWeek || "none"} onValueChange={v => setSelectedWeek(v === "none" ? "" : v)}>
          <SelectTrigger className="h-7 w-[280px] text-xs" data-testid="select-reporte-semana">
            <SelectValue placeholder="Seleccione semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Seleccione semana</SelectItem>
            <SelectItem value="todas">Todas las semanas</SelectItem>
            {weekOptions.map(w => (
              <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MyButtonStyle
          color="blue"
          onClick={generatePdf}
          loading={pdfLoading}
          disabled={!selectedWeek || !hasData}
          data-testid="button-generar-pdf-arrime"
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          Imprimir PDF
        </MyButtonStyle>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex items-center gap-2 flex-wrap border-t pt-1">
        {renderFilterSelect("Central", filterCentral, handleCentralChange, distinctOptions.central, "reporte-central")}
        {renderFilterSelect("N.Corte", filterNucleocorte, handleNucleocorteChange, distinctOptions.nucleocorte, "reporte-nucleocorte")}
        {renderFilterSelect("N.Transporte", filterNucleotransporte, handleNucleotransporteChange, distinctOptions.nucleotransporte, "reporte-nucleotransporte")}
        {renderFilterSelect("Finca", filterFinca, handleFincaChange, distinctOptions.finca, "reporte-finca")}
        {renderFilterSelect("Proveedor", filterProveedor, handleProveedorChange, distinctOptions.proveedor, "reporte-proveedor")}
        {renderFilterSelect("Placa", filterPlaca, setFilterPlaca, distinctOptions.placa, "reporte-placa")}
        {hasActiveFilters && (
          <MyButtonStyle color="red" onClick={clearFilters} data-testid="button-quitar-filtros">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Quitar filtros
          </MyButtonStyle>
        )}
      </div>

      {selectedWeek && (
        <div className="text-center text-sm font-bold py-1">
          {reportTitle}
          {activeFilterLabels.length > 0 && (
            <div className="text-[10px] font-normal text-muted-foreground mt-0.5">
              {activeFilterLabels.join(" | ")}
            </div>
          )}
        </div>
      )}

      {!selectedWeek && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Seleccione una semana para ver el reporte
        </div>
      )}

      {selectedWeek && !hasData && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No hay datos para la selección
        </div>
      )}

      {selectedWeek && hasData && !isModeAll && (
        <div className="flex-1 overflow-auto min-h-0">
          <div className="overflow-auto text-xs">
            <table className="w-full border-collapse" data-testid="table-reporte-arrime">
              {renderTableHeader()}
              <tbody>
                {renderDataRows(singleRows, singleGrandTotal)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedWeek && hasData && isModeAll && (
        <div className="flex-1 overflow-auto min-h-0 space-y-3">
          {allWeeksData.map((weekData: any) => (
            <div key={weekData.weekNum}>
              <div className="text-xs font-bold bg-muted/60 px-2 py-1 rounded">
                Validación de Caña Semana del {weekData.startDisplay} hasta {weekData.endDisplay}
              </div>
              <div className="overflow-auto text-xs">
                <table className="w-full border-collapse" data-testid={`table-reporte-arrime-week-${weekData.weekNum}`}>
                  {renderTableHeader()}
                  <tbody>
                    {renderDataRows(weekData.rows, weekData.grandTotal)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
