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
