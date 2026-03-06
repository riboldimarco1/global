import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";
import { apiRequest } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
  premio: number;
  prestamo: number;
  descuento: number;
  descripcion: string;
  deuda: number;
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
    premio: 0,
    prestamo: 0,
    descuento: 0,
    descripcion: "",
    deuda: 0,
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

  totalSalario += (row.premio || 0);
  const subtotal = totalSalario + totalHE;
  const totalFinal = subtotal + (row.prestamo || 0) - (row.descuento || 0);

  return {
    total_salario: totalSalario,
    total_salario_he: totalFinal,
    subtotal,
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
    { key: "premio", label: "premio", defaultWidth: 90, minWidth: 60, align: "right" },
    { key: "total_salario", label: "total salario", defaultWidth: 100, minWidth: 60, align: "right" },
    { key: "prestamo", label: "préstamo", defaultWidth: 90, minWidth: 60, align: "right" },
    { key: "descuento", label: "descuento", defaultWidth: 90, minWidth: 60, align: "right" },
    { key: "descripcion", label: "descripción", defaultWidth: 150, minWidth: 80, align: "left" },
    { key: "deuda", label: "deuda", defaultWidth: 90, minWidth: 60, align: "right" },
    { key: "total_salario_he", label: "total neto", defaultWidth: 110, minWidth: 60, align: "right" },
  ];
}

export default function NominaSemanalFinca({ filtroDeUnidad }: NominaSemanalFincaProps) {
  const { showPop } = useMyPop();
  const queryClient = useQueryClient();
  const { getPrefs, saveWidths: saveServerWidths, loaded: prefsLoaded } = useGridPreferences();
  const [rows, setRows] = useState<NominaRow[]>([]);
  const deudaTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (filtroDeUnidad === "all") {
      showPop({ title: "Aviso", message: "Antes escoger unidad" });
    }
  }, [filtroDeUnidad]);

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
    queryKey: ["/api/parametros", { tipo: "cargo" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=cargo`);
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

  const personalInfoMap = useMemo(() => {
    const map: Record<string, { cedRif: string; cuenta: string }> = {};
    const list = Array.isArray(personalData) ? personalData : [];
    for (const p of list) {
      const nombre = (p.nombre || "").toString().toLowerCase().trim();
      map[nombre] = {
        cedRif: (p.ced_rif || "").toString().trim(),
        cuenta: (p.cuenta || "").toString().trim(),
      };
    }
    return map;
  }, [personalData]);

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

  const fetchDeuda = useCallback(async (nombre: string, unidad: string): Promise<number> => {
    if (!nombre.trim() || !unidad.trim()) return 0;
    try {
      const res = await fetch(`/api/administracion/deuda?nombre=${encodeURIComponent(nombre.toLowerCase().trim())}&unidad=${encodeURIComponent(unidad.toLowerCase().trim())}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return parseFloat(data.deuda) || 0;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    const personal = (Array.isArray(personalData) ? personalData : []).filter(
      (p) => p.habilitado === true || p.habilitado === "true"
    );
    if (personal.length === 0) {
      setRows([]);
      return;
    }
    const newRows: NominaRow[] = personal.map((p) => {
      const nombre = (p.nombre || "").toString().toLowerCase().trim();
      const cargo = (p.cargo || "").toString().toLowerCase().trim();
      const sueldoDia = cargosMap[cargo] || 0;
      return { ...createEmptyRow(), nombre, cargo, sueldoDia };
    });
    setRows(newRows);

    const loadDeudas = async () => {
      const updated = await Promise.all(
        newRows.map(async (r) => {
          const deuda = await fetchDeuda(r.nombre, filtroDeUnidad);
          return { ...r, deuda };
        })
      );
      setRows(updated);
    };
    loadDeudas();
  }, [personalData, cargosMap, filtroDeUnidad, fetchDeuda]);

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

  const handleText = (idx: number, field: keyof NominaRow, value: string) => {
    const normalized = value.toLowerCase();
    setRows((prev) => {
      const newRows = [...prev];
      newRows[idx] = { ...newRows[idx], [field]: normalized };
      return newRows;
    });
    if (field === "nombre") {
      if (deudaTimers.current[idx]) clearTimeout(deudaTimers.current[idx]);
      deudaTimers.current[idx] = setTimeout(() => {
        fetchDeuda(normalized, filtroDeUnidad).then((deuda) => {
          setRows((prev) => {
            const newRows = [...prev];
            if (newRows[idx] && newRows[idx].nombre === normalized) {
              newRows[idx] = { ...newRows[idx], deuda };
            }
            return newRows;
          });
        });
      }, 400);
    }
  };

  const handleNuevaNomina = useCallback(async () => {
    const resetRows = rows.map((r) => ({
      ...createEmptyRow(),
      nombre: r.nombre,
      cargo: r.cargo,
      sueldoDia: r.sueldoDia,
    }));
    const withDeudas = await Promise.all(
      resetRows.map(async (r) => {
        const deuda = await fetchDeuda(r.nombre, filtroDeUnidad);
        return { ...r, deuda };
      })
    );
    setRows(withDeudas);
    queryClient.invalidateQueries({ queryKey: ["/api/parametros", { tipo: "personal", unidad: filtroDeUnidad }] });
    queryClient.invalidateQueries({ queryKey: ["/api/parametros", { tipo: "cargo" }] });
  }, [rows, queryClient, filtroDeUnidad, fetchDeuda]);

  const handleEnviarTransferencias = useCallback(async () => {
    const filledRows = rows
      .map((r) => {
        const calc = calcRow(r, multiplicador);
        return { nombre: r.nombre.trim(), total: calc.total_salario_he, subtotal: calc.subtotal, prestamo: r.prestamo || 0, descuento: r.descuento || 0 };
      })
      .filter((r) => r.nombre !== "" && r.total > 0);

    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros con sueldo para enviar" });
      return;
    }

    try {
      const tasaRes = await fetch("/api/parametros?tipo=dolar");
      if (!tasaRes.ok) throw new Error("error al obtener la tasa del dólar");
      const tasaData = await tasaRes.json();
      const tasaList = (Array.isArray(tasaData) ? tasaData : tasaData.data || []) as Record<string, any>[];
      const dolarRecords = tasaList
        .filter((r) => r.valor && parseFloat(r.valor) > 0 && r.fecha)
        .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      const tasaDolar = dolarRecords.length > 0 ? parseFloat(dolarRecords[0].valor) || 0 : 0;

      if (tasaDolar <= 0) {
        showPop({ title: "error", message: "no se encontró la tasa del dólar en parámetros" });
        return;
      }

      const fecha = formatDate();
      const descripcion = `nomina ${weekRangeLabel}`;

      const maxRes = await fetch("/api/transferencias/max-numero");
      const maxData = await maxRes.json();
      const comprobante = String((parseInt(maxData.maxNumero) || 0) + 1);

      const records = filledRows.map((r) => {
        const montoBs = (r.subtotal * tasaDolar).toFixed(2);
        const prestamoBs = (r.prestamo * tasaDolar).toFixed(2);
        const descuentoBs = (r.descuento * tasaDolar).toFixed(2);
        const restaBs = (r.total * tasaDolar).toFixed(2);
        const info = personalInfoMap[r.nombre.toLowerCase()] || { cedRif: "", cuenta: "" };
        return {
          fecha,
          comprobante,
          personal: r.nombre.toLowerCase(),
          rifced: info.cedRif.toLowerCase(),
          numcuenta: info.cuenta.toLowerCase(),
          monto: montoBs,
          prestamo: prestamoBs,
          descuento: descuentoBs,
          resta: restaBs,
          descripcion,
          unidad: filtroDeUnidad.toLowerCase(),
          tipo: "nomina",
          _username: getStoredUsername(),
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
      window.dispatchEvent(new CustomEvent("resetTransferenciasBanco", { detail: { tab: "nomina" } }));
      window.dispatchEvent(new CustomEvent("openModule", { detail: { module: "transferencias" } }));
    } catch (err: any) {
      showPop({
        title: "error",
        message: `error al enviar a transferencias: ${err.message || err}`,
      });
    }
  }, [rows, multiplicador, weekRangeLabel, filtroDeUnidad, showPop, queryClient, personalInfoMap]);

  const handleExportExcel = () => {
    const filledRows = rows.filter((r) => r.nombre.trim() !== "");
    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros para exportar" });
      return;
    }
    const d = (i: number) => fmtShort(prevWeek.days[i]);
    const headers = ["#", "Nombre", "Cargo", `Lun ${d(0)}`, "H.E", `Mar ${d(1)}`, "H.E", `Mié ${d(2)}`, "H.E", `Jue ${d(3)}`, "H.E", `Vie ${d(4)}`, "H.E", `Sáb ${d(5)} H.E`, `Dom ${d(6)} H.E`, "Premio", "Salario", "Préstamo", "Descuento", "Descripción", "Deuda", "Total Neto"];
    let grandTotalSalario = 0, grandTotalHE = 0, grandTotalPremio = 0, grandTotalPrestamo = 0, grandTotalDescuento = 0, grandTotalDeuda = 0;
    const body = filledRows.map((row, i) => {
      const calc = calcRow(row, multiplicador);
      grandTotalSalario += calc.total_salario;
      grandTotalHE += calc.total_salario_he;
      grandTotalPremio += row.premio || 0;
      grandTotalPrestamo += row.prestamo || 0;
      grandTotalDescuento += row.descuento || 0;
      grandTotalDeuda += row.deuda || 0;
      return [i + 1, row.nombre, row.cargo, row.lun_asist ? "x" : "", row.lun_he || "", row.mar_asist ? "x" : "", row.mar_he || "", row.mie_asist ? "x" : "", row.mie_he || "", row.jue_asist ? "x" : "", row.jue_he || "", row.vie_asist ? "x" : "", row.vie_he || "", row.sab_he || "", row.dom_he || "", row.premio || "", calc.total_salario || "", row.prestamo || "", row.descuento || "", row.descripcion || "", row.deuda || "", calc.total_salario_he || ""];
    });
    body.push(["", "", "TOTALES", "", "", "", "", "", "", "", "", "", "", "", "", grandTotalPremio || "", grandTotalSalario || "", grandTotalPrestamo || "", grandTotalDescuento || "", "", grandTotalDeuda || "", grandTotalHE || ""]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nómina Semanal");
    XLSX.writeFile(wb, "nomina_semanal_finca.xlsx");
  };

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
      ["#", "nombre", "cargo", `lun ${d(0)}`, "h.e", `mar ${d(1)}`, "h.e", `mié ${d(2)}`, "h.e", `jue ${d(3)}`, "h.e", `vie ${d(4)}`, "h.e", `sáb ${d(5)} h.e`, `dom ${d(6)} h.e`, "premio", "salario", "préstamo", "descuento", "descripción", "deuda", "total neto"],
    ];

    let grandTotalSalario = 0;
    let grandTotalHE = 0;

    let grandTotalPremio = 0;
    let grandTotalPrestamo = 0;
    let grandTotalDescuento = 0;
    let grandTotalDeuda = 0;

    const body = filledRows.map((row, i) => {
      const calc = calcRow(row, multiplicador);
      grandTotalSalario += calc.total_salario;
      grandTotalHE += calc.total_salario_he;
      grandTotalPremio += row.premio || 0;
      grandTotalPrestamo += row.prestamo || 0;
      grandTotalDescuento += row.descuento || 0;
      grandTotalDeuda += row.deuda || 0;
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
        row.premio > 0 ? row.premio.toFixed(2) : "",
        calc.total_salario > 0 ? calc.total_salario.toFixed(2) : "",
        row.prestamo > 0 ? row.prestamo.toFixed(2) : "",
        row.descuento > 0 ? row.descuento.toFixed(2) : "",
        row.descripcion || "",
        row.deuda > 0 ? row.deuda.toFixed(2) : "",
        calc.total_salario_he > 0 ? calc.total_salario_he.toFixed(2) : "",
      ];
    });

    body.push([
      "", "", "totales", "", "", "", "", "", "", "", "", "", "", "", "",
      grandTotalPremio > 0 ? grandTotalPremio.toFixed(2) : "",
      grandTotalSalario > 0 ? grandTotalSalario.toFixed(2) : "",
      grandTotalPrestamo > 0 ? grandTotalPrestamo.toFixed(2) : "",
      grandTotalDescuento > 0 ? grandTotalDescuento.toFixed(2) : "",
      "",
      grandTotalDeuda > 0 ? grandTotalDeuda.toFixed(2) : "",
      grandTotalHE > 0 ? grandTotalHE.toFixed(2) : "",
    ]);

    autoTable(doc, {
      startY: 21,
      head,
      body,
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 1, halign: "center" },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6, lineWidth: 0.2, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 6, halign: "center" },
        1: { cellWidth: 26, halign: "left" },
        2: { cellWidth: 16, halign: "left" },
        3: { cellWidth: 8 },
        4: { cellWidth: 8 },
        5: { cellWidth: 8 },
        6: { cellWidth: 8 },
        7: { cellWidth: 8 },
        8: { cellWidth: 8 },
        9: { cellWidth: 8 },
        10: { cellWidth: 8 },
        11: { cellWidth: 8 },
        12: { cellWidth: 8 },
        13: { cellWidth: 10 },
        14: { cellWidth: 10 },
        15: { cellWidth: 12, halign: "right" },
        16: { cellWidth: 14, halign: "right" },
        17: { cellWidth: 12, halign: "right" },
        18: { cellWidth: 12, halign: "right" },
        19: { cellWidth: 18, halign: "left" },
        20: { cellWidth: 12, halign: "right" },
        21: { cellWidth: 14, halign: "right" },
      },
      didParseCell: (data: any) => {
        if (data.row.index === body.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pdfUrl = doc.output("bloburl");
    window.open(pdfUrl, "_blank");
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
            onClick={handleExportExcel}
            data-testid="button-excel-nomina"
          >
            excel
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
                    if (col.key === "premio" || col.key === "prestamo" || col.key === "descuento") {
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
                    if (col.key === "descripcion") {
                      return (
                        <td key={col.key} className="border border-border p-0" style={{ width: w, maxWidth: w }}>
                          <input
                            type="text"
                            value={row.descripcion}
                            onChange={(e) => handleText(idx, "descripcion", e.target.value)}
                            className="w-full bg-transparent text-left text-xs px-1 py-0.5 outline-none"
                            data-testid={`input-descripcion-${idx}`}
                          />
                        </td>
                      );
                    }
                    if (col.key === "deuda") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right text-muted-foreground" style={{ width: w }} data-testid={`text-deuda-${idx}`}>
                          {row.deuda > 0 ? row.deuda.toFixed(2) : ""}
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
