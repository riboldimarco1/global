import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useMyPop } from "@/components/MyPop";
import { useGridPreferences } from "@/contexts/GridPreferencesContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";
import { formatDateForDisplay } from "@/lib/dateUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface PagoSemanalProveedoresProps {
  filtroDeUnidad: string;
}

interface PagoRow {
  id: string;
  nombre: string;
  cedRif: string;
  cuenta: string;
  correo: string;
  descripcion: string;
  fechaFactura: string;
  nroFactura: string;
  montoDolares: number;
  montoBs: number;
  abonoDolares: number;
  abonoBs: number;
  deudaDolares: number;
}

interface ColDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  align: "left" | "center" | "right";
}

const PAGO_TABLE_ID = "pago-semanal-proveedores";

const columns: ColDef[] = [
  { key: "nombre", label: "nombre", defaultWidth: 160, minWidth: 80, align: "left" },
  { key: "cedRif", label: "cédula / rif", defaultWidth: 120, minWidth: 60, align: "left" },
  { key: "cuenta", label: "nro cuenta", defaultWidth: 160, minWidth: 80, align: "left" },
  { key: "descripcion", label: "descripción", defaultWidth: 180, minWidth: 80, align: "left" },
  { key: "fechaFactura", label: "fecha factura", defaultWidth: 100, minWidth: 60, align: "center" },
  { key: "nroFactura", label: "nro factura", defaultWidth: 100, minWidth: 60, align: "center" },
  { key: "montoDolares", label: "monto $", defaultWidth: 100, minWidth: 60, align: "right" },
  { key: "montoBs", label: "monto bs", defaultWidth: 110, minWidth: 60, align: "right" },
  { key: "abonoDolares", label: "abono $", defaultWidth: 100, minWidth: 60, align: "right" },
  { key: "abonoBs", label: "abono bs", defaultWidth: 110, minWidth: 60, align: "right" },
  { key: "deudaDolares", label: "deuda $", defaultWidth: 100, minWidth: 60, align: "right" },
];

function formatDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

export default function PagoSemanalProveedores({ filtroDeUnidad }: PagoSemanalProveedoresProps) {
  const { showPop } = useMyPop();
  const { getPrefs, saveWidths: saveServerWidths, loaded: prefsLoaded } = useGridPreferences();
  const [rows, setRows] = useState<PagoRow[]>([]);

  useEffect(() => {
    if (filtroDeUnidad === "all") {
      showPop({ title: "Aviso", message: "Antes escoger unidad" });
    }
  }, [filtroDeUnidad]);

  const serverPrefs = getPrefs(PAGO_TABLE_ID);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    for (const col of columns) {
      const saved = serverPrefs.widths?.[col.key];
      w[col.key] = typeof saved === "number" && saved >= col.minWidth ? saved : col.defaultWidth;
    }
    return w;
  });

  useEffect(() => {
    if (!prefsLoaded) return;
    const prefs = getPrefs(PAGO_TABLE_ID);
    if (prefs.widths) {
      const w: Record<string, number> = {};
      for (const col of columns) {
        const saved = (prefs.widths as Record<string, number>)?.[col.key];
        w[col.key] = typeof saved === "number" && saved >= col.minWidth ? saved : col.defaultWidth;
      }
      setColWidths(w);
    }
  }, [prefsLoaded, getPrefs]);

  const widthsInitRef = useRef(false);
  useEffect(() => {
    if (!widthsInitRef.current) {
      widthsInitRef.current = true;
      return;
    }
    saveServerWidths(PAGO_TABLE_ID, colWidths);
  }, [colWidths, saveServerWidths]);

  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] || 100;
    resizingRef.current = { key: colKey, startX, startW };

    const col = columns.find(c => c.key === colKey);
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

  const { data: dolarData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "dolar" }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=dolar`);
      return res.json();
    },
  });

  const tasaDolar = useMemo(() => {
    const list = Array.isArray(dolarData) ? dolarData : [];
    const sorted = list
      .filter((r) => r.valor && parseFloat(r.valor) > 0)
      .sort((a, b) => {
        const fa = (a.fecha || "").toString();
        const fb = (b.fecha || "").toString();
        return fb.localeCompare(fa);
      });
    return sorted.length > 0 ? parseFloat(sorted[0].valor) || 0 : 0;
  }, [dolarData]);

  const { data: proveedoresData } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros", { tipo: "proveedores", unidad: filtroDeUnidad }],
    queryFn: async () => {
      const res = await fetch(`/api/parametros?tipo=proveedores&unidad=${encodeURIComponent(filtroDeUnidad)}`);
      return res.json();
    },
    enabled: !!filtroDeUnidad && filtroDeUnidad !== "all",
  });

  const { data: cuentasPendientes, refetch: refetchPendientes } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/administracion/cuentasporpagar-pendientes", filtroDeUnidad],
    queryFn: async () => {
      const res = await fetch(`/api/administracion/cuentasporpagar-pendientes?unidad=${encodeURIComponent(filtroDeUnidad)}`);
      return res.json();
    },
    enabled: !!filtroDeUnidad && filtroDeUnidad !== "all",
  });

  const proveedoresMap = useMemo(() => {
    const map: Record<string, { cedRif: string; cuenta: string; correo: string }> = {};
    const list = Array.isArray(proveedoresData) ? proveedoresData : [];
    for (const p of list) {
      const nombre = (p.nombre || "").toString().toLowerCase().trim();
      map[nombre] = {
        cedRif: (p.ced_rif || "").toString().trim(),
        cuenta: (p.cuenta || "").toString().trim(),
        correo: (p.correo || "").toString().trim(),
      };
    }
    return map;
  }, [proveedoresData]);

  useEffect(() => {
    const pendientes = Array.isArray(cuentasPendientes) ? cuentasPendientes : [];
    if (pendientes.length === 0) {
      setRows([]);
      return;
    }
    const newRows: PagoRow[] = pendientes.map((rec) => {
      const nombre = (rec.proveedor || "").toString().toLowerCase().trim();
      const provInfo = proveedoresMap[nombre] || { cedRif: "", cuenta: "", correo: "" };
      const montoDolares = parseFloat(rec.montodolares) || 0;
      const restaCancelar = parseFloat(rec.restacancelar) || montoDolares;
      const montoBs = parseFloat(rec.montobolivares) || 0;
      return {
        id: rec.id || "",
        nombre,
        cedRif: provInfo.cedRif,
        cuenta: provInfo.cuenta,
        correo: provInfo.correo,
        descripcion: (rec.descripcion || "").toString(),
        fechaFactura: formatDateForDisplay((rec.fechafactura || "").toString()),
        nroFactura: (rec.nrofactura || "").toString(),
        montoDolares: restaCancelar,
        montoBs,
        abonoDolares: 0,
        abonoBs: 0,
        deudaDolares: restaCancelar,
      };
    });
    setRows(newRows);
  }, [cuentasPendientes, proveedoresMap]);

  useEffect(() => {
    if (tasaDolar <= 0) return;
    setRows((prev) => {
      const hasAbono = prev.some((r) => r.abonoDolares > 0);
      if (!hasAbono) return prev;
      return prev.map((r) => ({
        ...r,
        abonoBs: parseFloat((r.abonoDolares * tasaDolar).toFixed(2)),
      }));
    });
  }, [tasaDolar]);

  const handleNumber = (idx: number, field: keyof PagoRow, value: string) => {
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setRows((prev) => {
      const newRows = [...prev];
      const row = { ...newRows[idx], [field]: num };
      if (field === "abonoDolares") {
        row.abonoBs = tasaDolar > 0 ? parseFloat((num * tasaDolar).toFixed(2)) : 0;
        row.deudaDolares = row.montoDolares - num;
      } else if (field === "abonoBs") {
        row.abonoDolares = tasaDolar > 0 ? parseFloat((num / tasaDolar).toFixed(2)) : 0;
        row.deudaDolares = row.montoDolares - row.abonoDolares;
      }
      newRows[idx] = row;
      return newRows;
    });
  };

  const handleRefresh = useCallback(() => {
    refetchPendientes();
  }, [refetchPendientes]);

  const [sending, setSending] = useState(false);

  const handleEnviarTransferencias = async () => {
    const rowsConAbono = rows.filter((r) => r.abonoDolares > 0);
    if (rowsConAbono.length === 0) {
      showPop({ title: "aviso", message: "no hay abonos para enviar a transferencias" });
      return;
    }

    const records = rowsConAbono.map((r) => ({
      proveedor: r.nombre,
      rifced: r.cedRif,
      numcuenta: r.cuenta,
      descripcion: r.descripcion,
      monto: r.abonoBs,
      montodolares: r.abonoDolares,
      deuda: r.deudaDolares,
      unidad: filtroDeUnidad,
      tipo: "proveedores",
      nrofactura: r.nroFactura,
    }));

    setSending(true);
    try {
      const resTransf = await apiRequest("POST", "/api/transferencias/batch", { records, username: getStoredUsername() });
      const dataTransf = await resTransf.json();

      queryClient.invalidateQueries({ queryKey: ["/api/transferencias"] });

      showPop({ title: "listo", message: `${dataTransf.inserted} transferencias creadas` });
      refetchPendientes();
      window.dispatchEvent(new CustomEvent("resetTransferenciasBanco", { detail: { tab: "proveedores" } }));
      window.dispatchEvent(new CustomEvent("openModule", { detail: { module: "transferencias" } }));
    } catch (err: any) {
      showPop({ title: "error", message: err.message || "error al enviar transferencias" });
    } finally {
      setSending(false);
    }
  };

  const handleNuevosPagos = () => {
    refetchPendientes();
  };

  const handleExportExcel = () => {
    const filledRows = rows.filter((r) => r.nombre.trim() !== "");
    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros para exportar" });
      return;
    }
    const headers = ["#", "Nombre", "Cédula/RIF", "Nro Cuenta", "Descripción", "Fecha Fact.", "Nro Fact.", "Monto $", "Monto Bs", "Abono $", "Abono Bs", "Deuda $"];
    let totalMontoDolares = 0, totalMontoBs = 0, totalAbonoDolares = 0, totalAbonoBs = 0, totalDeudaDolares = 0;
    const body = filledRows.map((row, i) => {
      totalMontoDolares += row.montoDolares;
      totalMontoBs += row.montoBs;
      totalAbonoDolares += row.abonoDolares;
      totalAbonoBs += row.abonoBs;
      totalDeudaDolares += row.deudaDolares;
      return [i + 1, row.nombre, row.cedRif, row.cuenta, row.descripcion, row.fechaFactura, row.nroFactura, row.montoDolares || "", row.montoBs || "", row.abonoDolares || "", row.abonoBs || "", row.deudaDolares || ""];
    });
    body.push(["", "TOTALES", "", "", "", "", "", totalMontoDolares || "", totalMontoBs || "", totalAbonoDolares || "", totalAbonoBs || "", totalDeudaDolares || ""]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pago Semanal");
    XLSX.writeFile(wb, "pago_semanal_proveedores.xlsx");
  };

  const handlePrintPago = () => {
    const filledRows = rows.filter((r) => r.nombre.trim() !== "");
    if (filledRows.length === 0) {
      showPop({ title: "aviso", message: "no hay registros para imprimir" });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(12);
    doc.text("pago semanal proveedores", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(9);
    doc.text(`unidad: ${filtroDeUnidad}`, 14, 17);
    doc.text(`fecha: ${formatDate()}`, pageWidth - 14, 17, { align: "right" });

    const head = [
      ["#", "nombre", "cédula/rif", "nro cuenta", "descripción", "fecha fact.", "nro fact.", "monto $", "monto bs", "abono $", "abono bs", "deuda $"],
    ];

    let totalMontoDolares = 0;
    let totalMontoBs = 0;
    let totalAbonoDolares = 0;
    let totalAbonoBs = 0;
    let totalDeudaDolares = 0;

    const body = filledRows.map((row, i) => {
      totalMontoDolares += row.montoDolares;
      totalMontoBs += row.montoBs;
      totalAbonoDolares += row.abonoDolares;
      totalAbonoBs += row.abonoBs;
      totalDeudaDolares += row.deudaDolares;
      return [
        String(i + 1),
        row.nombre,
        row.cedRif,
        row.cuenta,
        row.descripcion,
        row.fechaFactura,
        row.nroFactura,
        row.montoDolares > 0 ? row.montoDolares.toFixed(2) : "",
        row.montoBs > 0 ? row.montoBs.toFixed(2) : "",
        row.abonoDolares > 0 ? row.abonoDolares.toFixed(2) : "",
        row.abonoBs > 0 ? row.abonoBs.toFixed(2) : "",
        row.deudaDolares !== 0 ? row.deudaDolares.toFixed(2) : "",
      ];
    });

    body.push([
      "",
      "TOTALES",
      "",
      "",
      "",
      "",
      "",
      totalMontoDolares > 0 ? totalMontoDolares.toFixed(2) : "",
      totalMontoBs > 0 ? totalMontoBs.toFixed(2) : "",
      totalAbonoDolares > 0 ? totalAbonoDolares.toFixed(2) : "",
      totalAbonoBs > 0 ? totalAbonoBs.toFixed(2) : "",
      totalDeudaDolares !== 0 ? totalDeudaDolares.toFixed(2) : "",
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
        1: { cellWidth: 28, halign: "left" },
        2: { cellWidth: 22, halign: "left" },
        3: { cellWidth: 30, halign: "left" },
        4: { cellWidth: 32, halign: "left" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 16, halign: "center" },
        7: { cellWidth: 16, halign: "right" },
        8: { cellWidth: 20, halign: "right" },
        9: { cellWidth: 16, halign: "right" },
        10: { cellWidth: 20, halign: "right" },
        11: { cellWidth: 16, halign: "right" },
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
    showPop({ title: "listo", message: "reporte generado exitosamente" });
  };

  const totals = useMemo(() => {
    let montoDolares = 0;
    let montoBs = 0;
    let abonoDolares = 0;
    let abonoBs = 0;
    let deudaDolares = 0;
    for (const r of rows) {
      montoDolares += r.montoDolares;
      montoBs += r.montoBs;
      abonoDolares += r.abonoDolares;
      abonoBs += r.abonoBs;
      deudaDolares += r.deudaDolares;
    }
    return { montoDolares, montoBs, abonoDolares, abonoBs, deudaDolares };
  }, [rows]);

  return (
    <div className="flex flex-col h-full" data-testid="pago-semanal-proveedores">
      <div className="flex items-center gap-3 flex-wrap p-2 border-b">
        <span className="text-xs font-medium" data-testid="text-unidad-pago">
          unidad: <strong>{filtroDeUnidad}</strong>
        </span>
        <span className="text-xs font-medium" data-testid="text-registros-pago">
          registros pendientes: <strong>{rows.length}</strong>
        </span>
        <span className="text-xs font-medium" data-testid="text-tasa-dolar-pago">
          tasa dólar: <strong>{tasaDolar > 0 ? tasaDolar.toFixed(2) : "---"}</strong> bs/$
        </span>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <MyButtonStyle
            color="yellow"
            onClick={handleRefresh}
            data-testid="button-refresh-pago"
          >
            actualizar
          </MyButtonStyle>
          <MyButtonStyle
            color="blue"
            onClick={handlePrintPago}
            data-testid="button-imprimir-pago"
          >
            imprimir
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={handleExportExcel}
            data-testid="button-excel-pago"
          >
            excel
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={handleEnviarTransferencias}
            loading={sending}
            data-testid="button-enviar-transferencias"
          >
            enviar a transferencias
          </MyButtonStyle>
          <MyButtonStyle
            color="orange"
            onClick={handleNuevosPagos}
            data-testid="button-nuevos-pagos"
          >
            nuevos pagos
          </MyButtonStyle>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table
          className="text-xs"
          style={{ borderCollapse: "collapse", tableLayout: "fixed" }}
          data-testid="pago-proveedores-table"
        >
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border border-border px-1 py-1 relative select-none"
                  style={{
                    width: colWidths[col.key] || col.defaultWidth,
                    minWidth: col.minWidth,
                    textAlign: col.align,
                  }}
                  data-testid={`th-pago-${col.key}`}
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
            {rows.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                data-testid={`row-pago-${idx}`}
              >
                {columns.map((col) => {
                  const w = colWidths[col.key] || col.defaultWidth;
                  if (col.key === "nombre" || col.key === "cedRif" || col.key === "cuenta" || col.key === "descripcion" || col.key === "fechaFactura" || col.key === "nroFactura") {
                    return (
                      <td key={col.key} className="border border-border px-1 py-0.5" style={{ width: w, maxWidth: w, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span data-testid={`text-${col.key}-${idx}`}>{(row as any)[col.key]}</span>
                      </td>
                    );
                  }
                  if (col.key === "montoDolares" || col.key === "montoBs") {
                    const val = (row as any)[col.key] as number;
                    return (
                      <td key={col.key} className="border border-border px-1 py-0.5 text-right" style={{ width: w }} data-testid={`text-${col.key}-${idx}`}>
                        {val > 0 ? val.toFixed(2) : ""}
                      </td>
                    );
                  }
                  if (col.key === "abonoDolares") {
                    return (
                      <td key={col.key} className="border border-border p-0" style={{ width: w }}>
                        <input
                          type="number"
                          value={(row.abonoDolares as number) || ""}
                          onChange={(e) => handleNumber(idx, "abonoDolares", e.target.value)}
                          className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-testid={`input-abonoDolares-${idx}`}
                        />
                      </td>
                    );
                  }
                  if (col.key === "abonoBs") {
                    return (
                      <td key={col.key} className="border border-border p-0" style={{ width: w }}>
                        <input
                          type="number"
                          value={(row.abonoBs as number) || ""}
                          onChange={(e) => handleNumber(idx, "abonoBs", e.target.value)}
                          className="w-full bg-transparent text-right text-xs px-1 py-0.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-testid={`input-abonoBs-${idx}`}
                        />
                      </td>
                    );
                  }
                  if (col.key === "deudaDolares") {
                    const isAnticipo = row.deudaDolares < 0;
                    return (
                      <td
                        key={col.key}
                        className={`border border-border px-1 py-0.5 text-right font-bold ${isAnticipo ? "text-blue-800 dark:text-blue-300" : ""}`}
                        style={{ width: w }}
                        data-testid={`text-deuda-${idx}`}
                      >
                        {row.deudaDolares !== 0 ? row.deudaDolares.toFixed(2) : ""}
                      </td>
                    );
                  }
                  return null;
                })}
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-muted font-bold" data-testid="row-pago-totals">
                <td className="border border-border px-1 py-0.5" colSpan={6} style={{ textAlign: "right" }}>
                  totales
                </td>
                <td className="border border-border px-1 py-0.5 text-right" data-testid="text-total-montoDolares">
                  {totals.montoDolares > 0 ? totals.montoDolares.toFixed(2) : ""}
                </td>
                <td className="border border-border px-1 py-0.5 text-right" data-testid="text-total-montoBs">
                  {totals.montoBs > 0 ? totals.montoBs.toFixed(2) : ""}
                </td>
                <td className="border border-border px-1 py-0.5 text-right" data-testid="text-total-abonoDolares">
                  {totals.abonoDolares > 0 ? totals.abonoDolares.toFixed(2) : ""}
                </td>
                <td className="border border-border px-1 py-0.5 text-right" data-testid="text-total-abonoBs">
                  {totals.abonoBs > 0 ? totals.abonoBs.toFixed(2) : ""}
                </td>
                <td className={`border border-border px-1 py-0.5 text-right font-bold ${totals.deudaDolares < 0 ? "text-blue-800 dark:text-blue-300" : ""}`} data-testid="text-total-deudaDolares">
                  {totals.deudaDolares !== 0 ? totals.deudaDolares.toFixed(2) : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
