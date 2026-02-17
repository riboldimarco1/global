import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function toNum(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === "") return "";
  const n = toNum(num);
  if (n === 0 && num !== 0 && num !== "0") return "";
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const datePart = dateStr.split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const day = parts[2].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[0].slice(-2);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

function sortByDate(data: any[]): any[] {
  return [...data].sort((a, b) => {
    const dateA = a.fecha ? a.fecha.split(" ")[0] : "";
    const dateB = b.fecha ? b.fecha.split(" ")[0] : "";
    return dateA.localeCompare(dateB);
  });
}

const tableStyles = {
  headStyles: { fillColor: [220, 220, 220] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const },
  footStyles: { fillColor: [200, 200, 200] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: "bold" as const },
  showFoot: "lastPage" as const,
  didParseCell: (data: any) => {
    if (data.section === "foot" && data.column.index > 0) {
      const content = data.cell.raw;
      if (content && content !== "") {
        data.cell.styles.halign = "right";
      }
    }
  },
};

interface ReportConfig {
  title: string;
  fechaInicial: string;
  fechaFinal: string;
  unidad?: string;
  banco?: string;
}

export interface PdfResult {
  blob: Blob;
  filename: string;
}

function createHeader(doc: jsPDF, title: string, config: ReportConfig, startY: number = 15): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, startY, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${formatDate(config.fechaInicial)} al ${formatDate(config.fechaFinal)}`, pageWidth / 2, startY + 7, { align: "center" });
  
  let y = startY + 14;
  if (config.unidad && config.unidad !== "all") {
    doc.text(`Unidad: ${config.unidad}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }
  if (config.banco && config.banco !== "all") {
    doc.text(`Banco: ${config.banco}`, pageWidth / 2, y, { align: "center" });
    y += 6;
  }
  return y;
}

// ============ GASTOS Y FACTURAS ============

export function generateGastosCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "GASTOS Y FACTURAS - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
      row.proveedor || "",
      row.insumo || "",
      row.actividad || "",
      row.comprobante || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto Bs", "Monto $", "Proveedor", "Insumo", "Actividad", "Comprobante"]],
    body: tableRows,
    foot: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 65 },
      2: { halign: "right", cellWidth: 25 },
      3: { halign: "right", cellWidth: 22 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
      6: { cellWidth: 30 },
      7: { cellWidth: 22 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `gastos_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateGastosResumidoPorActividad(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "GASTOS Y FACTURAS - POR ACTIVIDAD", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.actividad || "(Sin actividad)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([actividad, t]) => [actividad, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `gastos_actividad_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateGastosResumidoPorProveedor(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "GASTOS Y FACTURAS - POR PROVEEDOR", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.proveedor || "(Sin proveedor)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([proveedor, t]) => [proveedor, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Proveedor", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `gastos_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateGastosResumidoPorInsumo(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "GASTOS Y FACTURAS - POR INSUMO", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.insumo || "(Sin insumo)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([insumo, t]) => [insumo, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Insumo", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `gastos_insumo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ NOMINA ============

export function generateNominaCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "NÓMINA - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
      row.personal || "",
      row.actividad || "",
      row.comprobante || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto Bs", "Monto $", "Personal", "Actividad", "Comprobante"]],
    body: tableRows,
    foot: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `nomina_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateNominaResumidoPorPersonal(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "NÓMINA - POR PERSONAL", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.personal || "(Sin personal)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([personal, t]) => [personal, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Personal", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `nomina_personal_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateNominaResumidoPorActividad(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "NÓMINA - POR ACTIVIDAD", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.actividad || "(Sin actividad)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([actividad, t]) => [actividad, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `nomina_actividad_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ VENTAS ============

export function generateVentasCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "VENTAS - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
      row.producto || "",
      row.cliente || "",
      row.comprobante || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto Bs", "Monto $", "Producto", "Cliente", "Comprobante"]],
    body: tableRows,
    foot: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `ventas_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateVentasResumidoPorProducto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "VENTAS - POR PRODUCTO", config);
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of data) {
    const key = row.producto || "(Sin producto)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([producto, t]) => [producto, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `ventas_producto_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ BANCOS ============

export function generateBancosCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "BANCOS - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalDebito = 0;
  let totalCredito = 0;
  
  for (const row of sortedData) {
    const debito = toNum(row.debito);
    const credito = toNum(row.credito);
    totalDebito += debito;
    totalCredito += credito;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      row.banco || "",
      formatNumber(debito),
      formatNumber(credito),
      formatNumber(row.saldo),
      row.comprobante || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Banco", "Débito", "Crédito", "Saldo", "Comprobante"]],
    body: tableRows,
    foot: [["TOTAL", "", "", formatNumber(totalDebito), formatNumber(totalCredito), "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `bancos_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateBancosSaldos(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "BANCOS - SALDOS POR CUENTA", config);
  
  const grouped: Record<string, { debito: number; credito: number }> = {};
  
  for (const row of data) {
    const key = row.banco || "(Sin banco)";
    if (!grouped[key]) grouped[key] = { debito: 0, credito: 0 };
    grouped[key].debito += toNum(row.debito);
    grouped[key].credito += toNum(row.credito);
  }
  
  const tableData = Object.entries(grouped).map(([banco, t]) => [
    banco,
    formatNumber(t.debito),
    formatNumber(t.credito),
    formatNumber(t.credito - t.debito),
  ]);
  
  autoTable(doc, {
    startY,
    head: [["Banco", "Total Débitos", "Total Créditos", "Saldo Neto"]],
    body: tableData,
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `bancos_saldos_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ ALMACEN ============

export function generateAlmacenCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ALMACÉN - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  
  for (const row of sortedData) {
    tableRows.push([
      formatDate(row.fecha),
      row.producto || "",
      row.descripcion || "",
      formatNumber(row.entrada),
      formatNumber(row.salida),
      formatNumber(row.existencia),
      row.unidaddemedida || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Producto", "Descripción", "Entrada", "Salida", "Existencia", "Unidad"]],
    body: tableRows,
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `almacen_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateAlmacenExistencia(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ALMACÉN - EXISTENCIAS", config);
  
  const grouped: Record<string, { entrada: number; salida: number; existencia: number; unidad: string }> = {};
  
  for (const row of data) {
    const key = row.producto || "(Sin producto)";
    if (!grouped[key]) grouped[key] = { entrada: 0, salida: 0, existencia: 0, unidad: row.unidaddemedida || "" };
    grouped[key].entrada += toNum(row.entrada);
    grouped[key].salida += toNum(row.salida);
    grouped[key].existencia = toNum(row.existencia);
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([producto, t]) => [producto, formatNumber(t.entrada), formatNumber(t.salida), formatNumber(t.existencia), t.unidad]);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Total Entradas", "Total Salidas", "Existencia", "Unidad"]],
    body: tableData,
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `almacen_existencia_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ COSECHA ============

export function generateCosechaOrdenadoPorLote(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "COSECHA - POR LOTE", config);
  
  const sortedData = [...data].sort((a, b) => (a.lote || "").localeCompare(b.lote || ""));
  const tableRows: string[][] = [];
  let totalKilos = 0;
  let totalViajes = 0;
  
  for (const row of sortedData) {
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    totalKilos += kilos;
    totalViajes += viajes;
    
    tableRows.push([
      formatDate(row.fecha),
      row.lote || "",
      row.tablon || "",
      row.destino || "",
      formatNumber(kilos),
      viajes.toString(),
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Lote", "Tablón", "Destino", "Kilos", "Viajes"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cosecha_lote_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCosechaResumidoPorLote(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "COSECHA - RESUMEN POR LOTE", config);
  
  const grouped: Record<string, { kilos: number; viajes: number }> = {};
  let totalKilos = 0;
  let totalViajes = 0;
  
  for (const row of data) {
    const key = row.lote || "(Sin lote)";
    if (!grouped[key]) grouped[key] = { kilos: 0, viajes: 0 };
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    grouped[key].kilos += kilos;
    grouped[key].viajes += viajes;
    totalKilos += kilos;
    totalViajes += viajes;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].kilos - a[1].kilos)
    .map(([lote, t]) => [lote, formatNumber(t.kilos), t.viajes.toString()]);
  
  autoTable(doc, {
    startY,
    head: [["Lote", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cosecha_res_lote_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCosechaOrdenadoPorDestino(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "COSECHA - POR DESTINO", config);
  
  const sortedData = [...data].sort((a, b) => (a.destino || "").localeCompare(b.destino || ""));
  const tableRows: string[][] = [];
  let totalKilos = 0;
  let totalViajes = 0;
  
  for (const row of sortedData) {
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    totalKilos += kilos;
    totalViajes += viajes;
    
    tableRows.push([
      formatDate(row.fecha),
      row.destino || "",
      row.lote || "",
      row.tablon || "",
      formatNumber(kilos),
      viajes.toString(),
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Destino", "Lote", "Tablón", "Kilos", "Viajes"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cosecha_destino_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCosechaResumidoPorDestino(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "COSECHA - RESUMEN POR DESTINO", config);
  
  const grouped: Record<string, { kilos: number; viajes: number }> = {};
  let totalKilos = 0;
  let totalViajes = 0;
  
  for (const row of data) {
    const key = row.destino || "(Sin destino)";
    if (!grouped[key]) grouped[key] = { kilos: 0, viajes: 0 };
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    grouped[key].kilos += kilos;
    grouped[key].viajes += viajes;
    totalKilos += kilos;
    totalViajes += viajes;
  }
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].kilos - a[1].kilos)
    .map(([destino, t]) => [destino, formatNumber(t.kilos), t.viajes.toString()]);
  
  autoTable(doc, {
    startY,
    head: [["Destino", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cosecha_res_destino_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ CUENTAS POR PAGAR/COBRAR ============

export function generateCxpCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "CUENTAS POR PAGAR - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
      row.proveedor || "",
      row.actividad || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto Bs", "Monto $", "Proveedor", "Actividad"]],
    body: tableRows,
    foot: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cxp_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCxcCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "CUENTAS POR COBRAR - COMPLETO", config);
  
  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;
  
  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    
    tableRows.push([
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
      row.cliente || "",
      row.producto || "",
    ]);
  }
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto Bs", "Monto $", "Cliente", "Producto"]],
    body: tableRows,
    foot: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });
  
  return { blob: doc.output("blob"), filename: `cxc_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCxcOrdenadoPorCliente(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "CUENTAS POR COBRAR - ORDENADO POR CLIENTE", config);

  const sorted = [...data].sort((a, b) => (a.cliente || "").localeCompare(b.cliente || ""));
  const tableRows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sorted) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;

    tableRows.push([
      row.cliente || "",
      formatDate(row.fecha),
      row.descripcion || "",
      formatNumber(monto),
      formatNumber(montoDolares),
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Cliente", "Fecha", "Descripción", "Monto Bs", "Monto $"]],
    body: tableRows,
    foot: [["TOTAL", "", "", formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 8 },
    ...tableStyles,
  });

  return { blob: doc.output("blob"), filename: `cxc_ord_cliente_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateCxcResumidoPorCliente(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "CUENTAS POR COBRAR - RESUMIDO POR CLIENTE", config);

  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of data) {
    const key = row.cliente || "(Sin cliente)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    grouped[key].monto += monto;
    grouped[key].montodolares += montoDol;
    grouped[key].count += 1;
    totalMonto += monto;
    totalDolares += montoDol;
  }

  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([cliente, t]) => [cliente, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares)]);

  autoTable(doc, {
    startY,
    head: [["Cliente", "Registros", "Monto Bs", "Monto $"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    ...tableStyles,
  });

  return { blob: doc.output("blob"), filename: `cxc_res_cliente_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ ADMINISTRACION - INGRESOS/EGRESOS ============

function getMonthYear(dateStr: string): string {
  if (!dateStr) return "Sin fecha";
  const datePart = dateStr.split(" ")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${monthNames[monthIndex]} ${parts[0]}`;
  }
  return dateStr;
}

function getMonthName(monthKey: string): string {
  const monthNames: Record<string, string> = {
    "Ene": "Enero", "Feb": "Febrero", "Mar": "Marzo", "Abr": "Abril",
    "May": "Mayo", "Jun": "Junio", "Jul": "Julio", "Ago": "Agosto",
    "Sep": "Septiembre", "Oct": "Octubre", "Nov": "Noviembre", "Dic": "Diciembre"
  };
  const [m] = monthKey.split(" ");
  return monthNames[m] || monthKey;
}

interface MonthlyTotals {
  facturasBs: number;
  facturasDol: number;
  nominaBs: number;
  nominaDol: number;
  ventasBs: number;
  ventasDol: number;
}

export function generateAdminIngresosUnidad(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const unidad = config.unidad && config.unidad !== "all" ? config.unidad : "Todas";
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Egresos / Ingresos", 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`para: ${unidad}`, 80, 15);
  doc.text(`de: ${formatDate(config.fechaInicial)}`, pageWidth - 60, 10);
  doc.text(`hasta: ${formatDate(config.fechaFinal)}`, pageWidth - 60, 16);
  
  const monthlyData: Record<string, MonthlyTotals> = {};
  
  for (const row of data) {
    const monthKey = getMonthYear(row.fecha);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
    }
    const tipo = (row.tipo || "").toLowerCase();
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    
    if (tipo === "facturas" || tipo === "cuentasporpagar") {
      monthlyData[monthKey].facturasBs += monto;
      monthlyData[monthKey].facturasDol += montoDol;
    } else if (tipo === "nomina") {
      monthlyData[monthKey].nominaBs += monto;
      monthlyData[monthKey].nominaDol += montoDol;
    } else if (tipo === "ventas" || tipo === "cuentasporcobrar") {
      monthlyData[monthKey].ventasBs += monto;
      monthlyData[monthKey].ventasDol += montoDol;
    }
  }
  
  const monthOrder = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const [mA, yA] = a.split(" ");
    const [mB, yB] = b.split(" ");
    if (yA !== yB) return parseInt(yA) - parseInt(yB);
    return monthOrder.indexOf(mA) - monthOrder.indexOf(mB);
  });
  
  let yPos = 28;
  const totals = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
  
  for (const monthKey of sortedMonths) {
    const d = monthlyData[monthKey];
    totals.facturasBs += d.facturasBs;
    totals.facturasDol += d.facturasDol;
    totals.nominaBs += d.nominaBs;
    totals.nominaDol += d.nominaDol;
    totals.ventasBs += d.ventasBs;
    totals.ventasDol += d.ventasDol;
    
    const factNomBs = d.facturasBs + d.nominaBs;
    const factNomDol = d.facturasDol + d.nominaDol;
    const balanceBs = d.ventasBs - factNomBs;
    const balanceDol = d.ventasDol - factNomDol;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [[`Subtotales para el mes: ${getMonthName(monthKey)}`, "Bolívares", "", "Dólares"]],
      body: [
        ["Facturas:", formatNumber(-d.facturasBs), "Facturas:", formatNumber(-d.facturasDol)],
        ["Nómina:", formatNumber(-d.nominaBs), "Nómina:", formatNumber(-d.nominaDol)],
        ["Subtotal Egresos:", formatNumber(-factNomBs), "Subtotal Egresos:", formatNumber(-factNomDol)],
        ["Ventas:", formatNumber(d.ventasBs), "Ventas:", formatNumber(d.ventasDol)],
        ["Balance:", formatNumber(balanceBs), "Balance:", formatNumber(balanceDol)],
      ],
      styles: { fontSize: 9 },
      ...tableStyles,
      columnStyles: {
        0: { cellWidth: 45 },
        1: { halign: "right", cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { halign: "right", cellWidth: 45 },
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }
  
  const totalFactNomBs = totals.facturasBs + totals.nominaBs;
  const totalFactNomDol = totals.facturasDol + totals.nominaDol;
  const totalBalanceBs = totals.ventasBs - totalFactNomBs;
  const totalBalanceDol = totals.ventasDol - totalFactNomDol;
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [["TOTALES GENERALES", "Bolívares", "", "Dólares"]],
    body: [
      ["Total Facturas:", formatNumber(-totals.facturasBs), "Total Facturas:", formatNumber(-totals.facturasDol)],
      ["Total Nómina:", formatNumber(-totals.nominaBs), "Total Nómina:", formatNumber(-totals.nominaDol)],
      ["Total Egresos:", formatNumber(-totalFactNomBs), "Total Egresos:", formatNumber(-totalFactNomDol)],
      ["Total Ventas:", formatNumber(totals.ventasBs), "Total Ventas:", formatNumber(totals.ventasDol)],
      ["BALANCE FINAL:", formatNumber(totalBalanceBs), "BALANCE FINAL:", formatNumber(totalBalanceDol)],
    ],
    styles: { fontSize: 9, fontStyle: "bold" },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 45 },
      1: { halign: "right", cellWidth: 45 },
      2: { cellWidth: 45 },
      3: { halign: "right", cellWidth: 45 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `admin_ingresos_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateAdminIngresosTodasUnidades(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Egresos / Ingresos - Todas las Unidades", pageWidth / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${formatDate(config.fechaInicial)} al ${formatDate(config.fechaFinal)}`, pageWidth / 2, 22, { align: "center" });
  
  const unidadData: Record<string, { facturasBs: number; facturasDol: number; nominaBs: number; nominaDol: number; ventasBs: number; ventasDol: number }> = {};
  
  for (const row of data) {
    const unidad = row.unidad || "(Sin unidad)";
    if (!unidadData[unidad]) {
      unidadData[unidad] = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
    }
    const tipo = (row.tipo || "").toLowerCase();
    const monto = toNum(row.monto);
    const montoDol = toNum(row.montodolares);
    
    if (tipo === "facturas" || tipo === "cuentasporpagar") {
      unidadData[unidad].facturasBs += monto;
      unidadData[unidad].facturasDol += montoDol;
    } else if (tipo === "nomina") {
      unidadData[unidad].nominaBs += monto;
      unidadData[unidad].nominaDol += montoDol;
    } else if (tipo === "ventas" || tipo === "cuentasporcobrar") {
      unidadData[unidad].ventasBs += monto;
      unidadData[unidad].ventasDol += montoDol;
    }
  }
  
  const tableData = Object.entries(unidadData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([unidad, d]) => {
      const egresosBs = d.facturasBs + d.nominaBs;
      const egresosDol = d.facturasDol + d.nominaDol;
      const balanceBs = d.ventasBs - egresosBs;
      const balanceDol = d.ventasDol - egresosDol;
      return [
        unidad,
        formatNumber(d.facturasBs),
        formatNumber(d.nominaBs),
        formatNumber(d.ventasBs),
        formatNumber(balanceBs),
        formatNumber(d.facturasDol),
        formatNumber(d.nominaDol),
        formatNumber(d.ventasDol),
        formatNumber(balanceDol),
      ];
    });
  
  const totals = Object.values(unidadData).reduce(
    (acc, d) => ({
      facturasBs: acc.facturasBs + d.facturasBs,
      nominaBs: acc.nominaBs + d.nominaBs,
      ventasBs: acc.ventasBs + d.ventasBs,
      facturasDol: acc.facturasDol + d.facturasDol,
      nominaDol: acc.nominaDol + d.nominaDol,
      ventasDol: acc.ventasDol + d.ventasDol,
    }),
    { facturasBs: 0, nominaBs: 0, ventasBs: 0, facturasDol: 0, nominaDol: 0, ventasDol: 0 }
  );
  const totalEgresosBs = totals.facturasBs + totals.nominaBs;
  const totalEgresosDol = totals.facturasDol + totals.nominaDol;
  
  autoTable(doc, {
    startY: 30,
    head: [["Unidad", "Facturas Bs", "Nómina Bs", "Ventas Bs", "Balance Bs", "Facturas $", "Nómina $", "Ventas $", "Balance $"]],
    body: tableData,
    foot: [[
      "TOTALES",
      formatNumber(totals.facturasBs),
      formatNumber(totals.nominaBs),
      formatNumber(totals.ventasBs),
      formatNumber(totals.ventasBs - totalEgresosBs),
      formatNumber(totals.facturasDol),
      formatNumber(totals.nominaDol),
      formatNumber(totals.ventasDol),
      formatNumber(totals.ventasDol - totalEgresosDol),
    ]],
    styles: { fontSize: 8 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 35 },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 28 },
      6: { halign: "right", cellWidth: 28 },
      7: { halign: "right", cellWidth: 28 },
      8: { halign: "right", cellWidth: 28 },
    },
  });
  
  return { blob: doc.output("blob"), filename: `admin_todas_unidades_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// Alias for backwards compatibility
export const generateAdminIngresosTodas = generateAdminIngresosTodasUnidades;

// ============ LISTA DE TRANSFERENCIAS ============

export interface ListaTransferenciasConfig {
  banco: string;
}

export function generateListaTransferencias(data: any[], config: ListaTransferenciasConfig): PdfResult {
  const doc = new jsPDF({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const today = new Date();
  const fechaHoy = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
  // Encabezado compacto
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Transferencias en", 10, 12);
  doc.setFont("helvetica", "normal");
  doc.text(config.banco, 48, 12);
  
  doc.setFontSize(9);
  doc.text("del dia", pageWidth - 40, 12);
  doc.text(fechaHoy, pageWidth - 22, 12);
  
  // Línea separadora
  doc.setLineWidth(0.3);
  doc.line(10, 15, pageWidth - 10, 15);
  
  // Ordenar por fecha
  const sortedData = sortByDate(data);
  
  // Preparar datos de la tabla
  const tableRows: string[][] = [];
  
  for (const row of sortedData) {
    // Extraer solo la fecha sin hora
    let fecha = row.fecha || "";
    if (fecha.includes(" ")) {
      fecha = fecha.split(" ")[0];
    }
    // Formatear si es ISO
    if (fecha.includes("-")) {
      fecha = formatDate(fecha);
    }
    
    const numero = row.comprobante || "";
    const monto = formatNumber(toNum(row.monto));
    const descuento = formatNumber(toNum(row.descuento));
    const resta = formatNumber(toNum(row.resta));
    const nombre = row.personal || row.proveedor || "";
    const descripcion = row.descripcion || "";
    
    tableRows.push([
      fecha,
      numero,
      monto,
      descuento,
      resta,
      nombre,
      descripcion
    ]);
  }
  
  autoTable(doc, {
    startY: 18,
    head: [["Fecha", "Num", "Monto", "Desc", "Resta", "Personal", "Descripcion"]],
    body: tableRows,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0], 
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontSize: 6
    },
    bodyStyles: {
      lineWidth: 0.05,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 16 },  // Fecha
      1: { cellWidth: 12 },  // Numero
      2: { cellWidth: 18, halign: "right" },  // Monto
      3: { cellWidth: 16, halign: "right" },  // Descuento
      4: { cellWidth: 18, halign: "right" },  // Resta
      5: { cellWidth: 32 },  // Beneficiario
      6: { cellWidth: "auto" },  // Descripcion
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    tableLineWidth: 0,
    margin: { left: 8, right: 8 },
  });
  
  const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;
  const bancoSlug = config.banco.replace(/\s+/g, "_").toLowerCase();
  
  return { blob: doc.output("blob"), filename: `lista_${bancoSlug}_${dateStr}.pdf` };
}

// ============ RECIBOS DE TRANSFERENCIAS ============

export interface RecibosConfig {
  titulo?: string;
}

export function generateRecibosTransferencias(data: any[], config: RecibosConfig = {}): PdfResult {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const today = new Date();
  const fechaHoy = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  
  const reciboHeight = 125;
  const recibosPerPage = Math.floor((pageHeight - 20) / reciboHeight);
  let currentY = 10;
  let reciboCount = 0;
  
  for (const row of data) {
    if (reciboCount > 0 && reciboCount % recibosPerPage === 0) {
      doc.addPage();
      currentY = 10;
    }
    
    const banco = row.banco || "";
    const fecha = row.fecha || "";
    const numero = row.comprobante || "";
    const destinatario = row.personal || row.proveedor || "";
    const rifced = row.rifced || "";
    const monto = toNum(row.monto);
    const resta = toNum(row.resta) || monto;
    const descripcion = row.descripcion || "";
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(10, currentY, pageWidth - 20, reciboHeight - 5);
    
    // Fecha de hoy (arriba derecha)
    doc.setFontSize(10);
    doc.text(fechaHoy, pageWidth - 15, currentY + 10, { align: "right" });
    
    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO de TRANSFERENCIA", pageWidth / 2, currentY + 18, { align: "center" });
    
    // Línea de Banco, Fecha, Numero
    let lineY = currentY + 30;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Banco", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(banco, 32, lineY);
    
    doc.setFont("helvetica", "bold");
    doc.text("Fecha", 100, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(fecha, 117, lineY);
    
    doc.setFont("helvetica", "bold");
    doc.text("Numero", 150, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(numero, 172, lineY);
    
    // Destinatario
    lineY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Destinatario", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(destinatario, 48, lineY);
    
    // Cedula o Rif
    lineY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Cedula o Rif:", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(rifced, 48, lineY);
    
    // Línea separadora
    lineY += 4;
    doc.line(15, lineY, pageWidth - 15, lineY);
    
    // Monto por ventas o servicios
    lineY += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Monto por ventas o servicios", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(formatNumber(monto), pageWidth - 15, lineY, { align: "right" });
    
    // Descuento
    const descuento = toNum(row.descuento);
    lineY += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Descuento", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(formatNumber(descuento), pageWidth - 15, lineY, { align: "right" });
    
    // Resta a cancelar
    lineY += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Resta a cancelar", 15, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(formatNumber(resta), pageWidth - 15, lineY, { align: "right" });
    
    // Descripcion
    lineY += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Descripcion", 15, lineY);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(descripcion, pageWidth - 70);
    doc.text(descLines.slice(0, 2).join(" "), 48, lineY);
    
    // Línea separadora
    lineY += 6;
    doc.line(15, lineY, pageWidth - 15, lineY);
    
    // Recibí conforme
    lineY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Recibi conforme:", 15, lineY);
    doc.line(55, lineY, pageWidth - 15, lineY);
    
    currentY += reciboHeight;
    reciboCount++;
  }
  
  const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;
  
  return { blob: doc.output("blob"), filename: `recibos_${dateStr}.pdf` };
}

// ============ ARRIME ============

export function generateArrimeCompleto(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ARRIME - COMPLETO", config);

  const sortedData = sortByDate(data);
  const tableRows: string[][] = [];
  let totalPeso = 0;
  let totalMonto = 0;

  for (const row of sortedData) {
    const peso = toNum(row.neto);
    const monto = toNum(row.monto);
    totalPeso += peso;
    totalMonto += monto;

    tableRows.push([
      formatDate(row.fecha),
      row.ruta || "",
      row.boleto || "",
      row.placa || "",
      row.chofer || "",
      row.proveedor || "",
      formatNumber(peso),
      formatNumber(monto),
      formatNumber(row.grado),
      row.finca || "",
      row.nucleocorte || "",
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Fecha", "Ruta", "Boleto", "Placa", "Chofer", "Proveedor", "Peso", "Monto", "Grado", "Finca", "Nucleo"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", "", "", formatNumber(totalPeso), formatNumber(totalMonto), "", "", ""]],
    styles: { fontSize: 7 },
    ...tableStyles,
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_completo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeOrdenadoPorProveedor(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ARRIME - ORDENADO POR PROVEEDOR", config);

  const sortedData = [...data].sort((a, b) => {
    const provA = (a.proveedor || "").localeCompare(b.proveedor || "");
    if (provA !== 0) return provA;
    const dateA = a.fecha ? a.fecha.split(" ")[0] : "";
    const dateB = b.fecha ? b.fecha.split(" ")[0] : "";
    return dateA.localeCompare(dateB);
  });

  const tableRows: string[][] = [];
  let totalPeso = 0;
  let totalMonto = 0;

  for (const row of sortedData) {
    const peso = toNum(row.neto);
    const monto = toNum(row.monto);
    totalPeso += peso;
    totalMonto += monto;

    tableRows.push([
      formatDate(row.fecha),
      row.ruta || "",
      row.boleto || "",
      row.placa || "",
      row.chofer || "",
      row.proveedor || "",
      formatNumber(peso),
      formatNumber(monto),
      formatNumber(row.grado),
      row.finca || "",
      row.nucleocorte || "",
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Fecha", "Ruta", "Boleto", "Placa", "Chofer", "Proveedor", "Peso", "Monto", "Grado", "Finca", "Nucleo"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", "", "", formatNumber(totalPeso), formatNumber(totalMonto), "", "", ""]],
    styles: { fontSize: 7 },
    ...tableStyles,
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_ord_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeResumidoPorProveedor(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ARRIME - RESUMEN POR PROVEEDOR", config);

  const grouped: Record<string, { count: number; peso: number; monto: number }> = {};
  let totalPeso = 0;
  let totalMonto = 0;

  for (const row of data) {
    const key = row.proveedor || "(Sin proveedor)";
    if (!grouped[key]) grouped[key] = { count: 0, peso: 0, monto: 0 };
    const peso = toNum(row.neto);
    const monto = toNum(row.monto);
    grouped[key].count += 1;
    grouped[key].peso += peso;
    grouped[key].monto += monto;
    totalPeso += peso;
    totalMonto += monto;
  }

  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].peso - a[1].peso)
    .map(([proveedor, t]) => [proveedor, t.count.toString(), formatNumber(t.peso), formatNumber(t.monto)]);

  autoTable(doc, {
    startY,
    head: [["Proveedor", "Viajes", "Total Peso", "Total Monto"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalPeso), formatNumber(totalMonto)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_res_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimePorProveedorSeparado(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });

  const grouped: Record<string, any[]> = {};
  for (const row of data) {
    const key = row.proveedor || "(Sin proveedor)";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const proveedores = Object.keys(grouped).sort();
  let first = true;

  for (const proveedor of proveedores) {
    if (!first) doc.addPage();
    first = false;

    const startY = createHeader(doc, `ARRIME - PROVEEDOR: ${proveedor}`, config);
    const rows = sortByDate(grouped[proveedor]);
    const tableRows: string[][] = [];
    let totalPeso = 0;
    let totalMonto = 0;

    for (const row of rows) {
      const peso = toNum(row.neto);
      const monto = toNum(row.monto);
      totalPeso += peso;
      totalMonto += monto;

      tableRows.push([
        formatDate(row.fecha),
        row.boleto || "",
        row.placa || "",
        row.chofer || "",
        formatNumber(peso),
        formatNumber(monto),
        formatNumber(row.grado),
      ]);
    }

    autoTable(doc, {
      startY,
      head: [["Fecha", "Boleto", "Placa", "Chofer", "Peso", "Monto", "Grado"]],
      body: tableRows,
      foot: [["TOTAL", "", "", "", formatNumber(totalPeso), formatNumber(totalMonto), ""]],
      styles: { fontSize: 8 },
      ...tableStyles,
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
    });
  }

  return { blob: doc.output("blob"), filename: `arrime_sep_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeOrdenadoPorChofer(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ARRIME - ORDENADO POR CHOFER", config);

  const sortedData = [...data].sort((a, b) => {
    const chA = (a.chofer || "").localeCompare(b.chofer || "");
    if (chA !== 0) return chA;
    const dateA = a.fecha ? a.fecha.split(" ")[0] : "";
    const dateB = b.fecha ? b.fecha.split(" ")[0] : "";
    return dateA.localeCompare(dateB);
  });

  const tableRows: string[][] = [];
  let totalPeso = 0;
  let totalMonto = 0;

  for (const row of sortedData) {
    const peso = toNum(row.neto);
    const monto = toNum(row.monto);
    totalPeso += peso;
    totalMonto += monto;

    tableRows.push([
      formatDate(row.fecha),
      row.ruta || "",
      row.boleto || "",
      row.placa || "",
      row.chofer || "",
      row.proveedor || "",
      formatNumber(peso),
      formatNumber(monto),
      formatNumber(row.grado),
      row.finca || "",
      row.nucleocorte || "",
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Fecha", "Ruta", "Boleto", "Placa", "Chofer", "Proveedor", "Peso", "Monto", "Grado", "Finca", "Nucleo"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", "", "", formatNumber(totalPeso), formatNumber(totalMonto), "", "", ""]],
    styles: { fontSize: 7 },
    ...tableStyles,
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_ord_chofer_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeResumidoPorChofer(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ARRIME - RESUMEN POR CHOFER", config);

  const grouped: Record<string, { count: number; peso: number; montochofer: number }> = {};
  let totalPeso = 0;
  let totalMontoChofer = 0;

  for (const row of data) {
    const key = row.chofer || "(Sin chofer)";
    if (!grouped[key]) grouped[key] = { count: 0, peso: 0, montochofer: 0 };
    const peso = toNum(row.neto);
    const montochofer = toNum(row.montochofer);
    grouped[key].count += 1;
    grouped[key].peso += peso;
    grouped[key].montochofer += montochofer;
    totalPeso += peso;
    totalMontoChofer += montochofer;
  }

  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].peso - a[1].peso)
    .map(([chofer, t]) => [chofer, t.count.toString(), formatNumber(t.peso), formatNumber(t.montochofer)]);

  autoTable(doc, {
    startY,
    head: [["Chofer", "Viajes", "Total Peso", "Total Monto Chofer"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalPeso), formatNumber(totalMontoChofer)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_res_chofer_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimePorChoferSeparado(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });

  const grouped: Record<string, any[]> = {};
  for (const row of data) {
    const key = row.chofer || "(Sin chofer)";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const choferes = Object.keys(grouped).sort();
  let first = true;

  for (const chofer of choferes) {
    if (!first) doc.addPage();
    first = false;

    const startY = createHeader(doc, `ARRIME - CHOFER: ${chofer}`, config);
    const rows = sortByDate(grouped[chofer]);
    const tableRows: string[][] = [];
    let totalPeso = 0;
    let totalMontoChofer = 0;

    for (const row of rows) {
      const peso = toNum(row.neto);
      const montochofer = toNum(row.montochofer);
      totalPeso += peso;
      totalMontoChofer += montochofer;

      tableRows.push([
        formatDate(row.fecha),
        row.boleto || "",
        row.placa || "",
        row.proveedor || "",
        formatNumber(peso),
        formatNumber(montochofer),
      ]);
    }

    autoTable(doc, {
      startY,
      head: [["Fecha", "Boleto", "Placa", "Proveedor", "Peso", "Monto Chofer"]],
      body: tableRows,
      foot: [["TOTAL", "", "", "", formatNumber(totalPeso), formatNumber(totalMontoChofer)]],
      styles: { fontSize: 8 },
      ...tableStyles,
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });
  }

  return { blob: doc.output("blob"), filename: `arrime_sep_chofer_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeGradoFinca(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ARRIME - GRADO POR FINCA", config);

  const grouped: Record<string, { count: number; peso: number; gradoSum: number; azucar: number }> = {};
  let totalPeso = 0;
  let totalAzucar = 0;

  for (const row of data) {
    const key = row.finca || "(Sin finca)";
    if (!grouped[key]) grouped[key] = { count: 0, peso: 0, gradoSum: 0, azucar: 0 };
    const peso = toNum(row.neto);
    const grado = toNum(row.grado);
    const azucar = toNum(row.azucar);
    grouped[key].count += 1;
    grouped[key].peso += peso;
    grouped[key].gradoSum += grado;
    grouped[key].azucar += azucar;
    totalPeso += peso;
    totalAzucar += azucar;
  }

  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].peso - a[1].peso)
    .map(([finca, t]) => [
      finca,
      t.count.toString(),
      formatNumber(t.peso),
      formatNumber(t.count > 0 ? t.gradoSum / t.count : 0),
      formatNumber(t.azucar),
    ]);

  autoTable(doc, {
    startY,
    head: [["Finca", "Viajes", "Total Peso", "Promedio Grado", "Total Azucar"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalPeso), "", formatNumber(totalAzucar)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_grado_finca_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimePlacasNucleoDetallado(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ARRIME - PLACAS/NUCLEO DETALLADO", config);

  const sortedData = [...data].sort((a, b) => {
    const nA = (a.nucleocorte || "").localeCompare(b.nucleocorte || "");
    if (nA !== 0) return nA;
    return (a.placa || "").localeCompare(b.placa || "");
  });

  const tableRows: string[][] = [];
  let totalPeso = 0;
  let totalMonto = 0;

  for (const row of sortedData) {
    const peso = toNum(row.neto);
    const monto = toNum(row.monto);
    totalPeso += peso;
    totalMonto += monto;

    tableRows.push([
      row.nucleocorte || "",
      row.placa || "",
      row.chofer || "",
      row.proveedor || "",
      formatDate(row.fecha),
      formatNumber(peso),
      formatNumber(monto),
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Nucleo", "Placa", "Chofer", "Proveedor", "Fecha", "Peso", "Monto"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", "", formatNumber(totalPeso), formatNumber(totalMonto)]],
    styles: { fontSize: 8 },
    ...tableStyles,
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_placas_nucleo_det_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimePlacasNucleoResumido(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ARRIME - PLACAS/NUCLEO RESUMIDO", config);

  const grouped: Record<string, Record<string, { count: number; peso: number }>> = {};
  let totalPeso = 0;
  let totalViajes = 0;

  for (const row of data) {
    const nucleo = row.nucleocorte || "(Sin nucleo)";
    const placa = row.placa || "(Sin placa)";
    if (!grouped[nucleo]) grouped[nucleo] = {};
    if (!grouped[nucleo][placa]) grouped[nucleo][placa] = { count: 0, peso: 0 };
    const peso = toNum(row.neto);
    grouped[nucleo][placa].count += 1;
    grouped[nucleo][placa].peso += peso;
    totalPeso += peso;
    totalViajes += 1;
  }

  const tableRows: string[][] = [];
  const nucleos = Object.keys(grouped).sort();
  for (const nucleo of nucleos) {
    const placas = Object.keys(grouped[nucleo]).sort();
    for (const placa of placas) {
      const t = grouped[nucleo][placa];
      tableRows.push([nucleo, placa, t.count.toString(), formatNumber(t.peso)]);
    }
  }

  autoTable(doc, {
    startY,
    head: [["Nucleo", "Placa", "Viajes", "Total Peso"]],
    body: tableRows,
    foot: [["TOTAL", "", totalViajes.toString(), formatNumber(totalPeso)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_placas_nucleo_res_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeEstadisticas(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let pageNum = 1;

  const drawPageHeader = (y: number): number => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("estadistica", margin + 2, y + 6);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getFullYear()).slice(-2)}`;
    doc.text(dateStr, margin + 2, y + 14);

    y += 18;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const headers = [
      { label: "Finca", x: margin + 2 },
      { label: "Cantidad", x: margin + 70 },
      { label: "Brix", x: margin + 110 },
      { label: "Pol", x: margin + 140 },
      { label: "Torta", x: margin + 168 },
      { label: "Grado", x: margin + 200 },
    ];
    for (const h of headers) {
      doc.text(h.label, h.x, y);
    }
    y += 5;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 1;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    return y;
  };

  const drawPageFooter = () => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Page ${pageNum}`, margin + 2, pageHeight - 8);
  };

  const sortedData = [...data].sort((a, b) => {
    const fA = (a.finca || "").toLowerCase();
    const fB = (b.finca || "").toLowerCase();
    return fA.localeCompare(fB);
  });

  const groups: Record<string, any[]> = {};
  for (const row of sortedData) {
    const finca = (row.finca || "").trim();
    if (!groups[finca]) groups[finca] = [];
    groups[finca].push(row);
  }

  const fincas = Object.keys(groups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  let y = drawPageHeader(15);
  let grandTotalNeto = 0;
  let grandTotalAzucar = 0;
  let grandTotalBrix = 0;
  let grandTotalPol = 0;
  let grandTotalTorta = 0;
  let grandCount = 0;

  const colX = {
    finca: margin + 2,
    cantidad: margin + 100,
    brix: margin + 120,
    pol: margin + 150,
    torta: margin + 178,
    grado: margin + 210,
  };

  for (const finca of fincas) {
    const rows = groups[finca];
    let sumNeto = 0;
    let sumAzucar = 0;
    let sumBrix = 0;
    let sumPol = 0;
    let sumTorta = 0;
    const count = rows.length;

    for (const row of rows) {
      sumNeto += toNum(row.neto);
      sumAzucar += toNum(row.azucar);
      sumBrix += toNum(row.brix);
      sumPol += toNum(row.pol);
      sumTorta += toNum(row.torta);
    }

    const avgBrix = count > 0 ? sumBrix / count : 0;
    const avgPol = count > 0 ? sumPol / count : 0;
    const avgTorta = count > 0 ? sumTorta / count : 0;
    const grado = sumNeto > 0 ? (sumAzucar / sumNeto) * 100 : 0;

    grandTotalNeto += sumNeto;
    grandTotalAzucar += sumAzucar;
    grandTotalBrix += sumBrix;
    grandTotalPol += sumPol;
    grandTotalTorta += sumTorta;
    grandCount += count;

    if (y > pageHeight - 25) {
      drawPageFooter();
      doc.addPage();
      pageNum++;
      y = drawPageHeader(15);
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(finca || "(sin finca)", colX.finca, y);
    doc.text(formatNumber(sumNeto), colX.cantidad, y, { align: "right" });
    doc.text(formatNumber(avgBrix), colX.brix, y, { align: "right" });
    doc.text(formatNumber(avgPol), colX.pol, y, { align: "right" });
    doc.text(formatNumber(avgTorta), colX.torta, y, { align: "right" });
    doc.text(formatNumber(grado), colX.grado, y, { align: "right" });

    y += 6;
  }

  if (y > pageHeight - 30) {
    drawPageFooter();
    doc.addPage();
    pageNum++;
    y = drawPageHeader(15);
  }

  y += 2;
  doc.setLineWidth(0.3);
  doc.line(margin + 68, y, pageWidth - margin, y);
  y += 5;

  const grandAvgBrix = grandCount > 0 ? grandTotalBrix / grandCount : 0;
  const grandAvgPol = grandCount > 0 ? grandTotalPol / grandCount : 0;
  const grandAvgTorta = grandCount > 0 ? grandTotalTorta / grandCount : 0;
  const grandGrado = grandTotalNeto > 0 ? (grandTotalAzucar / grandTotalNeto) * 100 : 0;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", colX.finca, y);
  doc.text(formatNumber(grandTotalNeto), colX.cantidad, y, { align: "right" });
  doc.text(formatNumber(grandAvgBrix), colX.brix, y, { align: "right" });
  doc.text(formatNumber(grandAvgPol), colX.pol, y, { align: "right" });
  doc.text(formatNumber(grandAvgTorta), colX.torta, y, { align: "right" });
  doc.text(formatNumber(grandGrado), colX.grado, y, { align: "right" });

  drawPageFooter();

  return { blob: doc.output("blob"), filename: `arrime_estadisticas_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeToneladasNucleo(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createHeader(doc, "ARRIME - TONELADAS POR NUCLEO", config);

  const sortedData = [...data].sort((a, b) => {
    const nA = (a.nucleocorte || "").localeCompare(b.nucleocorte || "");
    if (nA !== 0) return nA;
    const dateA = a.fecha ? a.fecha.split(" ")[0] : "";
    const dateB = b.fecha ? b.fecha.split(" ")[0] : "";
    return dateA.localeCompare(dateB);
  });

  const tableRows: string[][] = [];
  let totalPeso = 0;

  for (const row of sortedData) {
    const peso = toNum(row.neto);
    totalPeso += peso;

    tableRows.push([
      row.nucleocorte || "",
      formatDate(row.fecha),
      row.placa || "",
      row.chofer || "",
      formatNumber(peso),
    ]);
  }

  autoTable(doc, {
    startY,
    head: [["Nucleo", "Fecha", "Placa", "Chofer", "Peso"]],
    body: tableRows,
    foot: [["TOTAL", "", "", "", formatNumber(totalPeso)]],
    styles: { fontSize: 8 },
    ...tableStyles,
    columnStyles: {
      4: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_ton_nucleo_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

export function generateArrimeToneladasNucleoResumido(data: any[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createHeader(doc, "ARRIME - TONELADAS POR NUCLEO RESUMIDO", config);

  const grouped: Record<string, { count: number; peso: number }> = {};
  let totalPeso = 0;

  for (const row of data) {
    const key = row.nucleocorte || "(Sin nucleo)";
    if (!grouped[key]) grouped[key] = { count: 0, peso: 0 };
    const peso = toNum(row.neto);
    grouped[key].count += 1;
    grouped[key].peso += peso;
    totalPeso += peso;
  }

  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].peso - a[1].peso)
    .map(([nucleo, t]) => [
      nucleo,
      t.count.toString(),
      formatNumber(t.peso),
      formatNumber(t.count > 0 ? t.peso / t.count : 0),
    ]);

  autoTable(doc, {
    startY,
    head: [["Nucleo", "Viajes", "Total Peso", "Promedio Peso"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(totalPeso), formatNumber(data.length > 0 ? totalPeso / data.length : 0)]],
    styles: { fontSize: 10 },
    ...tableStyles,
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  return { blob: doc.output("blob"), filename: `arrime_ton_nucleo_res_${config.fechaInicial}_${config.fechaFinal}.pdf` };
}

// ============ IMPRESIÓN DE TRANSFERENCIAS ============

export interface ImpresionTransferenciasConfig {
  unidad?: string;
  banco?: string;
}

export function generateImpresionTransferencias(data: any[], config: ImpresionTransferenciasConfig = {}): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const today = new Date();
  const fechaHoy = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TRANSFERENCIAS", pageWidth / 2, 12, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let headerY = 18;
  if (config.unidad && config.unidad !== "all") {
    doc.text(`Unidad: ${config.unidad}`, pageWidth / 2, headerY, { align: "center" });
    headerY += 5;
  }
  if (config.banco && config.banco !== "all") {
    doc.text(`Banco: ${config.banco}`, pageWidth / 2, headerY, { align: "center" });
    headerY += 5;
  }
  doc.text(`Fecha: ${fechaHoy}`, pageWidth / 2, headerY, { align: "center" });
  headerY += 4;

  const sorted = [...data].sort((a, b) => {
    const nameA = (a.personal || a.proveedor || "").toLowerCase();
    const nameB = (b.personal || b.proveedor || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const tableRows: string[][] = [];
  let totalMonto = 0, totalPrestamo = 0, totalDescuento = 0, totalResta = 0, totalDeuda = 0;

  for (const row of sorted) {
    let fecha = row.fecha || "";
    if (fecha.includes(" ")) fecha = fecha.split(" ")[0];
    if (fecha.includes("-")) fecha = formatDate(fecha);

    const monto = toNum(row.monto);
    const prestamo = toNum(row.prestamo);
    const descuento = toNum(row.descuento);
    const resta = toNum(row.resta);
    const deuda = toNum(row.deuda);
    totalMonto += monto;
    totalPrestamo += prestamo;
    totalDescuento += descuento;
    totalResta += resta;

    const nombre = row.personal || row.proveedor || "";

    tableRows.push([
      fecha,
      row.comprobante || "",
      nombre,
      formatNumber(monto),
      formatNumber(prestamo),
      formatNumber(descuento),
      formatNumber(resta),
      deuda > 0 ? formatNumber(deuda) : "",
      row.banco || "",
      row.descripcion || "",
    ]);
  }

  autoTable(doc, {
    startY: headerY + 2,
    head: [["Fecha", "Comp", "Personal", "Monto", "Préstamo", "Descuento", "Resta", "Deuda", "Banco", "Descripción"]],
    body: tableRows,
    foot: [["", "", "TOTALES", formatNumber(totalMonto), formatNumber(totalPrestamo), formatNumber(totalDescuento), formatNumber(totalResta), "", "", ""]],
    styles: { fontSize: 6, cellPadding: 1 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 12 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 25 },
      9: { cellWidth: "auto" },
    },
    margin: { left: 8, right: 8 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || headerY + 40;

  const bancoMap: Record<string, { monto: number; prestamo: number; descuento: number; resta: number; count: number }> = {};
  for (const row of sorted) {
    const banco = row.banco || "(sin banco)";
    if (!bancoMap[banco]) bancoMap[banco] = { monto: 0, prestamo: 0, descuento: 0, resta: 0, count: 0 };
    bancoMap[banco].monto += toNum(row.monto);
    bancoMap[banco].prestamo += toNum(row.prestamo);
    bancoMap[banco].descuento += toNum(row.descuento);
    bancoMap[banco].resta += toNum(row.resta);
    bancoMap[banco].count++;
  }

  const resumenRows: string[][] = [];
  let rTotalMonto = 0, rTotalPrestamo = 0, rTotalDescuento = 0, rTotalResta = 0;
  for (const [banco, vals] of Object.entries(bancoMap).sort((a, b) => a[0].localeCompare(b[0]))) {
    resumenRows.push([
      banco,
      String(vals.count),
      formatNumber(vals.monto),
      formatNumber(vals.prestamo),
      formatNumber(vals.descuento),
      formatNumber(vals.resta),
    ]);
    rTotalMonto += vals.monto;
    rTotalPrestamo += vals.prestamo;
    rTotalDescuento += vals.descuento;
    rTotalResta += vals.resta;
  }

  let resumenStartY = finalY + 10;
  if (resumenStartY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    resumenStartY = 15;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN POR BANCO", pageWidth / 2, resumenStartY, { align: "center" });

  autoTable(doc, {
    startY: resumenStartY + 4,
    head: [["Banco", "Cant", "Monto", "Préstamo", "Descuento", "Resta"]],
    body: resumenRows,
    foot: [["TOTALES", String(sorted.length), formatNumber(rTotalMonto), formatNumber(rTotalPrestamo), formatNumber(rTotalDescuento), formatNumber(rTotalResta)]],
    styles: { fontSize: 7, cellPadding: 1.5 },
    ...tableStyles,
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear().toString().slice(-2)}`;
  return { blob: doc.output("blob"), filename: `transferencias_${dateStr}.pdf` };
}
