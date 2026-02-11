import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface NominaSemanalFincaProps {
  filtroDeUnidad: string;
}

interface NominaRow {
  nombre: string;
  cargo: string;
  sueldoDia: number;
  lun_asist: boolean;
  lun_he: number;
  mar_asist: boolean;
  mar_he: number;
  mie_asist: boolean;
  mie_he: number;
  jue_asist: boolean;
  jue_he: number;
  vie_asist: boolean;
  vie_he: number;
  sab_he: number;
  dom_he: number;
}

function createEmptyRow(): NominaRow {
  return {
    nombre: "",
    cargo: "",
    sueldoDia: 0,
    lun_asist: false,
    lun_he: 0,
    mar_asist: false,
    mar_he: 0,
    mie_asist: false,
    mie_he: 0,
    jue_asist: false,
    jue_he: 0,
    vie_asist: false,
    vie_he: 0,
    sab_he: 0,
    dom_he: 0,
  };
}

function formatDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

function fmtShort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

function getPreviousWeekDates(): { lunes: Date; domingo: Date; days: Date[] } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - diffToMonday);
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(prevMonday);
    d.setDate(prevMonday.getDate() + i);
    days.push(d);
  }
  return { lunes: days[0], domingo: days[6], days };
}

function calcRow(row: NominaRow, multiplicador: number) {
  const sueldoPorHora = row.sueldoDia / 8;
  let totalSalario = 0;
  let totalHE = 0;

  const days: Array<{ asist: boolean; he: number }> = [
    { asist: row.lun_asist, he: row.lun_he },
    { asist: row.mar_asist, he: row.mar_he },
    { asist: row.mie_asist, he: row.mie_he },
    { asist: row.jue_asist, he: row.jue_he },
    { asist: row.vie_asist, he: row.vie_he },
  ];

  for (const day of days) {
    if (day.asist) totalSalario += row.sueldoDia;
    if (day.he > 0) totalHE += day.he * sueldoPorHora * multiplicador;
  }

  if (row.sab_he > 0) totalHE += row.sab_he * sueldoPorHora * multiplicador;
  if (row.dom_he > 0) totalHE += row.dom_he * sueldoPorHora * multiplicador;

  return {
    total_salario: totalSalario,
    total_salario_he: totalSalario + totalHE,
  };
}

const NOMINA_TABLE_ID = "nomina-semanal-finca";

interface NominaColDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align: "left" | "center" | "right";
}

function buildNominaColumns(weekDays: Date[]): NominaColDef[] {
  const d = (i: number) => fmtShort(weekDays[i]);
  return [
    { key: "nombre", label: "nombre", defaultWidth: 160, minWidth: 80, align: "left" },
    { key: "cargo", label: "cargo", defaultWidth: 120, minWidth: 60, align: "left" },
    { key: "lun_asist", label: `lun ${d(0)} asist`, defaultWidth: 90, minWidth: 50, align: "center" },
    { key: "lun_he", label: `lun ${d(0)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "mar_asist", label: `mar ${d(1)} asist`, defaultWidth: 90, minWidth: 50, align: "center" },
    { key: "mar_he", label: `mar ${d(1)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "mie_asist", label: `mié ${d(2)} asist`, defaultWidth: 90, minWidth: 50, align: "center" },
    { key: "mie_he", label: `mié ${d(2)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "jue_asist", label: `jue ${d(3)} asist`, defaultWidth: 90, minWidth: 50, align: "center" },
    { key: "jue_he", label: `jue ${d(3)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "vie_asist", label: `vie ${d(4)} asist`, defaultWidth: 90, minWidth: 50, align: "center" },
    { key: "vie_he", label: `vie ${d(4)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "sab_he", label: `sáb ${d(5)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "dom_he", label: `dom ${d(6)} h.e`, defaultWidth: 80, minWidth: 50, align: "center" },
    { key: "total_salario", label: "total salario", defaultWidth: 100, minWidth: 60, align: "right" },
    { key: "total_salario_he", label: "total sal + h.e", defaultWidth: 110, minWidth: 60, align: "right" },
  ];
}

export default function NominaSemanalFinca({ filtroDeUnidad }: NominaSemanalFincaProps) {
  const { showPop } = useMyPop();
  const queryClient = useQueryClient();
  const { getPrefs, saveWidths: saveServerWidths, loaded: prefsLoaded } = useGridPreferences();
  const [rows, setRows] = useState<NominaRow[]>([]);

  const prevWeek = useMemo(() => getPreviousWeekDates(), []);
  const nominaColumns = useMemo(() => buildNominaColumns(prevWeek.days), [prevWeek]);
  const weekRangeLabel = `${fmtShort(prevWeek.lunes)} al ${fmtShort(prevWeek.domingo)}`;

  const serverPrefs = getPrefs(NOMINA_TABLE_ID);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    for (const col of nominaColumns) {
      const saved = serverPrefs.widths?.[col.key];
      w[col.key] = typeof saved === "number" && saved >= col.minWidth ? saved : col.defaultWidth;
    }
    return w;
  });

  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = getPrefs(NOMINA_TABLE_ID);
    if (prefs.widths) {
      const w: Record<string, number> = {};
      for (const col of nominaColumns) {
        const saved = (prefs.widths as Record<string, number>)?.[col.key];
        w[col.key] = typeof saved === "number" && saved >= col.minWidth ? saved : col.defaultWidth;
      }
      setColWidths(w);
    }
  }, [prefsLoaded, getPrefs, nominaColumns]);

  const widthsInitRef = useRef(false);
  useEffect(() => {
    if (!widthsInitRef.current) {
      widthsInitRef.current = true;
      return;
    }
    saveServerWidths(NOMINA_TABLE_ID, colWidths);
  }, [colWidths, saveServerWidths]);

  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] || 100;
    resizingRef.current = { key: colKey, startX, startW };

    const col = nominaColumns.find(c => c.key === colKey);
    const minW = col?.minWidth || 30;

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(minW, resizingRef.current.startW + diff);
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [colWidths]);

  const { data: personalData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "personal", unidad: filtroDeUnidad }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=personal&unidad=${encodeURIComponent(filtroDeUnidad)}`);
      return res.json();
    },
    enabled: !!filtroDeUnidad && filtroDeUnidad !== "all",
  });

  const { data: cargosData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "cargos finca" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=cargos%20finca`);
      return res.json();
    },
  });

  const { data: constantesData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "constantes" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=constantes`);
      return res.json();
    },
  });

  const cargosMap = useMemo(() => {
    const map: Record<string, number> = {};
    const list = Array.isArray(cargosData) ? cargosData : [];
    for (const c of list) {
      const nombre = (c.nombre || "").toString().toLowerCase().trim();
      const val = parseFloat(c.valor) || parseFloat(c.descripcion) || 0;
      map[nombre] = val;
    }
    return map;
  }, [cargosData]);

  const multiplicador = useMemo(() => {
    const list = Array.isArray(constantesData) ? constantesData : [];
    const rec = list.find(
      (r: Record<string, any>) =>
        (r.nombre || "").toString().toLowerCase().trim() === "multiplicador horas extra"
    );
    if (rec) {
      const val = parseFloat(rec.valor) || parseFloat(rec.descripcion) || 0;
      return val > 0 ? val : 1.5;
    }
    return 1.5;
  }, [constantesData]);

  useEffect(() => {
    const personal = Array.isArray(personalData) ? personalData : [];
    if (personal.length === 0) {
      setRows([]);
      return;
    }
    const newRows: NominaRow[] = personal.map((p) => {
      const nombre = (p.nombre || "").toString().toLowerCase().trim();
      const cargo = (p.categoria || "").toString().toLowerCase().trim();
      const sueldoDia = cargosMap[cargo] || 0;
      return { ...createEmptyRow(), nombre, cargo, sueldoDia };
    });
    setRows(newRows);
  }, [personalData, cargosMap]);

  const handleCheckbox = (idx: number, field: keyof NominaRow) => {
    setRows((prev) => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: !newRows[idx][field] };
      return newRows;
    });
  };

  const handleNumber = (idx: number, field: keyof NominaRow, value: string) => {
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setRows((prev) => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: num };
      return newRows;
    });
  };

  const handleNuevaNomina = useCallback(() => {
    setRows((prev) => prev.map((r) => ({
      ...createEmptyRow(),
      nombre: r.nombre,
      cargo: r.cargo,
      sueldoDia: r.sueldoDia,
    })));
    queryClient.invalidateQueries({ queryKey: ["/api/parametros", { tipo: "personal", unidad: filtroDeUnidad }] });
    queryClient.invalidateQueries({ queryKey: ["/api/parametros", { tipo: "cargos finca" }] });
  }, [queryClient, filtroDeUnidad]);

  const handleEnviarTransferencias = useCallback(() => {
    const filledRows = rows
      .map((r) => {
        const calc = calcRow(r, multiplicador);
        return { nombre: r.nombre.trim(), total: calc.total_salario_he };
      })
      .filter((r) => r.nombre !== "" && r.total > 0);

    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros con sueldo para enviar" });
      return;
    }

    showPop({
      title: "confirmar",
      message: `¿enviar ${filledRows.length} registro(s) a transferencias?\n\nsemana: ${weekRangeLabel}\nunidad: ${filtroDeUnidad}`,
      confirmText: "enviar",
      onConfirm: async () => {
        try {
          const tasaRes = await fetch("/api/parametros?tipo=dolar");
          if (!tasaRes.ok) throw new Error("error al obtener la tasa del dólar");
          const tasaData = await tasaRes.json();
          const tasaList = (Array.isArray(tasaData) ? tasaData : tasaData.data || []) as Record<string, any>[];
          const dolarRecords = tasaList
            .filter((r) => (r.nombre || "").toLowerCase() === "dolar" && r.valor && r.fecha)
            .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
          const tasaDolar = dolarRecords.length > 0 ? parseFloat(dolarRecords[0].valor) || 0 : 0;

          if (tasaDolar <= 0) {
            showPop({ title: "error", message: "no se encontró la tasa del dólar en parámetros" });
            return;
          }

          const fecha = formatDate();
          const descripcion = `nomina ${weekRangeLabel}`;
          const records = filledRows.map((r) => {
            const montoBs = (r.total * tasaDolar).toFixed(2);
            return {
              fecha,
              personal: r.nombre.toLowerCase(),
              monto: montoBs,
              resta: montoBs,
              descripcion,
              unidad: filtroDeUnidad.toLowerCase(),
            };
          });

          for (const rec of records) {
            await apiRequest("POST", "/api/transferencias", rec);
          }

          queryClient.invalidateQueries({ queryKey: ["/api/transferencias"] });
          showPop({
            title: "éxito",
            message: `se enviaron ${records.length} registro(s) a transferencias\ntasa del dólar: ${tasaDolar}`,
          });
        } catch (err: any) {
          showPop({
            title: "error",
            message: `error al enviar a transferencias: ${err.message || err}`,
          });
        }
      },
    });
  }, [rows, multiplicador, weekRangeLabel, filtroDeUnidad, showPop, queryClient]);

  const handlePrintNomina = () => {
    const filledRows = rows.filter((r) => r.nombre.trim() !== "");
    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros para imprimir" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(12);
    doc.text("nómina semanal finca", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(9);
    doc.text(`unidad: ${filtroDeUnidad}`, 14, 17);
    doc.text(`semana: ${weekRangeLabel}`, pageWidth / 2, 17, { align: "center" });
    doc.text(`fecha: ${formatDate()}`, pageWidth - 14, 17, { align: "right" });

    const d = (i: number) => fmtShort(prevWeek.days[i]);
    const head = [
      ["#", "nombre", "cargo", `lun ${d(0)}`, "h.e", `mar ${d(1)}`, "h.e", `mié ${d(2)}`, "h.e", `jue ${d(3)}`, "h.e", `vie ${d(4)}`, "h.e", `sáb ${d(5)} h.e`, `dom ${d(6)} h.e`, "salario", "sal+h.e"],
    ];

    let grandTotalSalario = 0;
    let grandTotalHE = 0;

    const body = filledRows.map((row, i) => {
      const calc = calcRow(row, multiplicador);
      grandTotalSalario += calc.total_salario;
      grandTotalHE += calc.total_salario_he;
      return [
        String(i + 1),
        row.nombre,
        row.cargo,
        row.lun_asist ? "x" : "",
        row.lun_he > 0 ? String(row.lun_he) : "",
        row.mar_asist ? "x" : "",
        row.mar_he > 0 ? String(row.mar_he) : "",
        row.mie_asist ? "x" : "",
        row.mie_he > 0 ? String(row.mie_he) : "",
        row.jue_asist ? "x" : "",
        row.jue_he > 0 ? String(row.jue_he) : "",
        row.vie_asist ? "x" : "",
        row.vie_he > 0 ? String(row.vie_he) : "",
        row.sab_he > 0 ? String(row.sab_he) : "",
        row.dom_he > 0 ? String(row.dom_he) : "",
        calc.total_salario > 0 ? calc.total_salario.toFixed(2) : "",
        calc.total_salario_he > 0 ? calc.total_salario_he.toFixed(2) : "",
      ];
    });

    body.push([
      "", "", "totales", "", "", "", "", "", "", "", "", "", "", "", "",
      grandTotalSalario > 0 ? grandTotalSalario.toFixed(2) : "",
      grandTotalHE > 0 ? grandTotalHE.toFixed(2) : "",
    ]);

    autoTable(doc, {
      startY: 21,
      head,
      body,
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1, halign: "center" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold", fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 38, halign: "left" },
        2: { cellWidth: 25, halign: "left" },
        3: { cellWidth: 10 },
        4: { cellWidth: 10 },
        5: { cellWidth: 10 },
        6: { cellWidth: 10 },
        7: { cellWidth: 10 },
        8: { cellWidth: 10 },
        9: { cellWidth: 10 },
        10: { cellWidth: 10 },
        11: { cellWidth: 10 },
        12: { cellWidth: 10 },
        13: { cellWidth: 13 },
        14: { cellWidth: 13 },
        15: { cellWidth: 20, halign: "right" },
        16: { cellWidth: 22, halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.row.index === body.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`nomina_semanal_finca_${filtroDeUnidad}_${formatDate().replace(/\//g, "-")}.pdf`);
    showPop({ title: "listo", message: "nómina generada exitosamente" });
  };

  return (
    <div className="flex flex-col h-full" data-testid="nomina-semanal-finca">
      <div className="flex items-center gap-3 flex-wrap p-2 border-b">
        <span className="text-xs font-medium" data-testid="text-unidad">
          unidad: <strong>{filtroDeUnidad}</strong>
        </span>
        <span className="text-xs font-medium" data-testid="text-semana">
          semana: <strong>{weekRangeLabel}</strong>
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <MyButtonStyle
            color="yellow"
            onClick={handleNuevaNomina}
            data-testid="button-nueva-nomina"
          >
            nueva nómina
          </MyButtonStyle>
          <MyButtonStyle
            color="blue"
            onClick={handlePrintNomina}
            data-testid="button-imprimir-nomina"
          >
            imprimir nómina
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={handleEnviarTransferencias}
            data-testid="button-enviar-transferencias"
          >
            enviar a transferencias
          </MyButtonStyle>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table
          className="text-xs"
          style={{ borderCollapse: "collapse", tableLayout: "fixed" }}
          data-testid="nomina-table"
        >
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {nominaColumns.map((col) => (
                <th
                  key={col.key}
                  className="border border-border px-1 py-1 relative select-none"
                  style={{
                    width: colWidths[col.key] || col.defaultWidth,
                    minWidth: col.minWidth,
                    textAlign: col.align,
                  }}
                  data-testid={`th-${col.key}`}
                >
                  {col.label}
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-border/50 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                    onMouseDown={(e) => handleResizeStart(e, col.key)}
                    data-testid={`resize-handle-${col.key}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const calc = calcRow(row, multiplicador);
              return (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  data-testid={`row-nomina-${idx}`}
                >
                  {nominaColumns.map((col) => {
                    const w = colWidths[col.key] || col.defaultWidth;
                    if (col.key === "nombre") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5" style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span data-testid={`text-nombre-${idx}`}>{row.nombre}</span>
                        </td>
                      );
                    }
                    if (col.key === "cargo") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5" style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span data-testid={`text-cargo-${idx}`}>{row.cargo}</span>
                        </td>
                      );
                    }
                    if (col.key === "total_salario") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right font-bold" style={{ width: w }} data-testid={`text-total-salario-${idx}`}>
                          {calc.total_salario > 0 ? calc.total_salario.toFixed(2) : ""}
                        </td>
                      );
                    }
                    if (col.key === "total_salario_he") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right font-bold" style={{ width: w }} data-testid={`text-total-salario-he-${idx}`}>
                          {calc.total_salario_he > 0 ? calc.total_salario_he.toFixed(2) : ""}
                        </td>
                      );
                    }
                    if (col.key.endsWith("_asist")) {
                      const field = col.key as keyof NominaRow;
                      return (
                        <td key={col.key} className="border border-border text-center" style={{ width: w }}>
                          <input
                            type="checkbox"
                            checked={!!row[field]}
                            onChange={() => handleCheckbox(idx, field)}
                            data-testid={`checkbox-${col.key}-${idx}`}
                          />
                        </td>
                      );
                    }
                    if (col.key.endsWith("_he")) {
                      const field = col.key as keyof NominaRow;
                      return (
                        <td key={col.key} className="border border-border p-0" style={{ width: w }}>
                          <input
                            type="number"
                            value={(row[field] as number) || ""}
                            onChange={(e) => handleNumber(idx, field, e.target.value)}
                            className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            data-testid={`input-${col.key}-${idx}`}
                          />
                        </td>
                      );
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
