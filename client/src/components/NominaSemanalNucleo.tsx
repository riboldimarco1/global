import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";

interface NominaSemanalNucleoProps {
  centralFilter?: string;
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

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const NOMINA_TABLE_ID = "nomina-semanal-nucleo";

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
    { key: "sueldoDia", label: "sueldo/día", defaultWidth: 90, minWidth: 50, align: "right" },
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

export default function NominaSemanalNucleo({ centralFilter }: NominaSemanalNucleoProps) {
  const { getPrefs, saveWidths: saveServerWidths, loaded: prefsLoaded } = useGridPreferences();
  const [rows, setRows] = useState<NominaRow[]>([]);

  const prevWeek = useMemo(() => getPreviousWeekDates(), []);
  const nominaColumns = useMemo(() => buildNominaColumns(prevWeek.days), [prevWeek]);
  const weekRangeLabel = `${fmtShort(prevWeek.lunes)} al ${fmtShort(prevWeek.domingo)}`;

  const weekStartISO = useMemo(() => toISODate(prevWeek.lunes), [prevWeek]);
  const weekEndISO = useMemo(() => toISODate(prevWeek.domingo), [prevWeek]);

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
  }, [colWidths, nominaColumns]);

  const { data: personalNucleoData, isLoading: loadingPersonal } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "personaldelnucleo" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=personaldelnucleo`);
      return res.json();
    },
  });

  const { data: cargosNucleoData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "cargosnucleo" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=cargosnucleo`);
      return res.json();
    },
  });

  const { data: fincasNucleoData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "fincasnucleo" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=fincasnucleo`);
      return res.json();
    },
  });

  const { data: arrimeData, isLoading: loadingArrime } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/arrime", { weekStart: weekStartISO, weekEnd: weekEndISO, central: centralFilter }],
    queryFn: async () => {
      let url = `/api/arrime?fechaInicio=${encodeURIComponent(weekStartISO)}&fechaFin=${encodeURIComponent(weekEndISO)}&limit=10000`;
      if (centralFilter && centralFilter !== "all") {
        url += `&central=${encodeURIComponent(centralFilter)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  const cargosMap = useMemo(() => {
    const map: Record<string, number> = {};
    const list = Array.isArray(cargosNucleoData) ? cargosNucleoData : [];
    for (const c of list) {
      if (c.habilitado === false || c.habilitado === "f") continue;
      const nombre = (c.nombre || "").toString().toLowerCase().trim();
      const val = parseFloat(c.valor) || 0;
      map[nombre] = val;
    }
    return map;
  }, [cargosNucleoData]);

  const fincasMap = useMemo(() => {
    const map: Record<string, { corte: number; alce: number; arrime: number }> = {};
    const list = Array.isArray(fincasNucleoData) ? fincasNucleoData : [];
    for (const f of list) {
      if (f.habilitado === false || f.habilitado === "f") continue;
      const nombre = (f.nombre || "").toString().toLowerCase().trim();
      map[nombre] = {
        corte: parseFloat(f.costo) || 0,
        alce: parseFloat(f.precio) || 0,
        arrime: parseFloat(f.valor) || 0,
      };
    }
    return map;
  }, [fincasNucleoData]);

  const weekTotals = useMemo(() => {
    const records = Array.isArray(arrimeData) ? arrimeData : [];
    let tonCorte = 0;
    let tonAlce = 0;
    let tonArrime = 0;
    let montoCorte = 0;
    let montoAlce = 0;
    let montoArrime = 0;

    for (const rec of records) {
      const cantidad = parseFloat(rec.cantidad) || 0;
      if (cantidad <= 0) continue;
      const fincaNombre = (rec.finca || "").toString().toLowerCase().trim();
      const fincaVals = fincasMap[fincaNombre];

      const nucleoCorte = (rec.nucleocorte || "").toString().trim();
      const nucleoAlce = (rec.nucleoalce || "").toString().trim();
      const nucleoArrime = (rec.nucleoarrime || "").toString().trim();

      if (nucleoCorte) {
        tonCorte += cantidad;
        montoCorte += cantidad * (fincaVals?.corte || 0);
      }
      if (nucleoAlce) {
        tonAlce += cantidad;
        montoAlce += cantidad * (fincaVals?.alce || 0);
      }
      if (nucleoArrime) {
        tonArrime += cantidad;
        montoArrime += cantidad * (fincaVals?.arrime || 0);
      }
    }

    return {
      tonCorte, tonAlce, tonArrime,
      montoCorte, montoAlce, montoArrime,
      totalFacturado: montoCorte + montoAlce + montoArrime,
    };
  }, [arrimeData, fincasMap]);

  useEffect(() => {
    const personal = Array.isArray(personalNucleoData) ? personalNucleoData : [];
    const activePersonal = personal.filter(p => p.habilitado === true || p.habilitado === "t");
    if (activePersonal.length === 0) {
      setRows([]);
      return;
    }
    const newRows: NominaRow[] = activePersonal.map((p) => {
      const nombre = (p.nombre || "").toString().toLowerCase().trim();
      const cargo = (p.categoria || "").toString().toLowerCase().trim();
      const sueldoDia = cargosMap[cargo] || 0;
      return { ...createEmptyRow(), nombre, cargo, sueldoDia };
    });
    setRows(newRows);
  }, [personalNucleoData, cargosMap]);

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
  };

  const isLoading = loadingPersonal || loadingArrime;
  const fmt = (n: number) => n > 0 ? n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground" data-testid="loading-nomina-nucleo">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">cargando nómina semanal núcleo...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="nomina-semanal-nucleo">
      <div className="flex flex-col gap-2 p-2 border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium" data-testid="text-semana-nucleo">
            semana: <strong>{weekRangeLabel}</strong>
          </span>
          {centralFilter && centralFilter !== "all" && (
            <span className="text-xs font-medium" data-testid="text-central-nucleo">
              central: <strong>{centralFilter}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2" data-testid="panel-totales-nucleo">
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-2">
            <div className="text-[10px] text-muted-foreground font-medium uppercase">corte</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold" data-testid="text-ton-corte">{fmt(weekTotals.tonCorte)} ton</span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400" data-testid="text-monto-corte">$ {fmt(weekTotals.montoCorte)}</span>
            </div>
          </div>
          <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2">
            <div className="text-[10px] text-muted-foreground font-medium uppercase">alce</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold" data-testid="text-ton-alce">{fmt(weekTotals.tonAlce)} ton</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400" data-testid="text-monto-alce">$ {fmt(weekTotals.montoAlce)}</span>
            </div>
          </div>
          <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-2">
            <div className="text-[10px] text-muted-foreground font-medium uppercase">arrime</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold" data-testid="text-ton-arrime">{fmt(weekTotals.tonArrime)} ton</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400" data-testid="text-monto-arrime">$ {fmt(weekTotals.montoArrime)}</span>
            </div>
          </div>
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2">
            <div className="text-[10px] text-muted-foreground font-medium uppercase">total facturado</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-total-facturado">$ {fmt(weekTotals.totalFacturado)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table
          className="text-xs"
          style={{ borderCollapse: "collapse", tableLayout: "fixed" }}
          data-testid="nomina-nucleo-table"
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
                  data-testid={`th-nucleo-${col.key}`}
                >
                  {col.label}
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-border/50 hover:bg-primary/60 active:bg-primary transition-colors z-10"
                    onMouseDown={(e) => handleResizeStart(e, col.key)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              return (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  data-testid={`row-nomina-nucleo-${idx}`}
                >
                  {nominaColumns.map((col) => {
                    const w = colWidths[col.key] || col.defaultWidth;
                    if (col.key === "nombre") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5" style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span data-testid={`text-nombre-nucleo-${idx}`}>{row.nombre}</span>
                        </td>
                      );
                    }
                    if (col.key === "cargo") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5" style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span data-testid={`text-cargo-nucleo-${idx}`}>{row.cargo}</span>
                        </td>
                      );
                    }
                    if (col.key === "sueldoDia") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right" style={{ width: w }} data-testid={`text-sueldo-${idx}`}>
                          {row.sueldoDia > 0 ? row.sueldoDia.toFixed(2) : ""}
                        </td>
                      );
                    }
                    if (col.key === "total_salario") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right font-bold" style={{ width: w }} data-testid={`text-total-salario-nucleo-${idx}`}>
                        </td>
                      );
                    }
                    if (col.key === "total_salario_he") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right font-bold" style={{ width: w }} data-testid={`text-total-neto-nucleo-${idx}`}>
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
                            data-testid={`checkbox-nucleo-${col.key}-${idx}`}
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
                            data-testid={`input-nucleo-${col.key}-${idx}`}
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
                            data-testid={`input-nucleo-${col.key}-${idx}`}
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
                            data-testid={`input-nucleo-descripcion-${idx}`}
                          />
                        </td>
                      );
                    }
                    if (col.key === "deuda") {
                      return (
                        <td key={col.key} className="border border-border px-1 py-0.5 text-right text-muted-foreground" style={{ width: w }} data-testid={`text-deuda-nucleo-${idx}`}>
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
