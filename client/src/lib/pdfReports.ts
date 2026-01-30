import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  fecha: string;
  descripcion: string;
  monto: number;
  montodolares?: number;
  proveedor?: string;
  insumo?: string;
  actividad?: string;
  comprobante?: string;
  unidad?: string;
  personal?: string;
  producto?: string;
  cliente?: string;
  cantidad?: number;
  capital?: boolean;
  anticipo?: boolean;
}

interface ReportConfig {
  title: string;
  fechaInicial: string;
  fechaFinal: string;
  unidad?: string;
}

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
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }
  return dateStr;
}

function createPdfHeader(doc: jsPDF, config: ReportConfig): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(config.title, pageWidth / 2, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateRange = `Período: ${formatDate(config.fechaInicial)} al ${formatDate(config.fechaFinal)}`;
  doc.text(dateRange, pageWidth / 2, 22, { align: "center" });
  
  if (config.unidad && config.unidad !== "all") {
    doc.text(`Unidad: ${config.unidad}`, pageWidth / 2, 28, { align: "center" });
    return 35;
  }
  
  return 30;
}

export interface PdfResult {
  blob: Blob;
  filename: string;
}

export function generateGastosCompleto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "GASTOS Y FACTURAS - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    formatNumber(row.monto),
    formatNumber(row.montodolares),
    row.proveedor || "",
    row.insumo || "",
    row.actividad || "",
    row.comprobante || "",
  ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Proveedor", "Insumo", "Actividad", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 60 },
      2: { halign: "right", cellWidth: 25 },
      3: { halign: "right", cellWidth: 25 },
      4: { cellWidth: 35 },
      5: { cellWidth: 30 },
      6: { cellWidth: 30 },
      7: { cellWidth: 25 },
    },
  });
  
  const blob = doc.output("blob");
  const filename = `gastos_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateGastosResumidoPorActividad(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "GASTOS Y FACTURAS - RESUMIDO POR ACTIVIDAD" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.actividad || "(Sin actividad)";
    if (!grouped[key]) {
      grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    }
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([actividad, totals]) => [
      actividad,
      totals.count.toString(),
      formatNumber(totals.monto),
      formatNumber(totals.montodolares),
    ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  const blob = doc.output("blob");
  const filename = `gastos_actividad_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateGastosResumidoPorProveedor(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "GASTOS Y FACTURAS - RESUMIDO POR PROVEEDOR" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.proveedor || "(Sin proveedor)";
    if (!grouped[key]) {
      grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    }
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([proveedor, totals]) => [
      proveedor,
      totals.count.toString(),
      formatNumber(totals.monto),
      formatNumber(totals.montodolares),
    ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Proveedor", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  const blob = doc.output("blob");
  const filename = `gastos_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateGastosResumidoPorInsumo(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "GASTOS Y FACTURAS - RESUMIDO POR INSUMO" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.insumo || "(Sin insumo)";
    if (!grouped[key]) {
      grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    }
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([insumo, totals]) => [
      insumo,
      totals.count.toString(),
      formatNumber(totals.monto),
      formatNumber(totals.montodolares),
    ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Insumo", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 40 },
    },
  });
  
  const blob = doc.output("blob");
  const filename = `gastos_insumo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ NOMINA REPORTS ============

export function generateNominaCompleto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "NOMINA - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    formatNumber(row.monto),
    formatNumber(row.montodolares),
    row.personal || "",
    row.actividad || "",
    row.comprobante || "",
  ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Personal", "Actividad", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `nomina_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateNominaResumidoPorPersonal(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "NOMINA - RESUMIDO POR PERSONAL" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.personal || "(Sin personal)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([personal, totals]) => [personal, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Personal", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `nomina_personal_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateNominaResumidoPorActividad(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "NOMINA - RESUMIDO POR ACTIVIDAD" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.actividad || "(Sin actividad)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([actividad, totals]) => [actividad, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `nomina_actividad_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ VENTAS REPORTS ============

export function generateVentasCompleto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "VENTAS - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    formatNumber(row.monto),
    formatNumber(row.montodolares),
    row.producto || "",
    row.cliente || "",
    row.comprobante || "",
  ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Producto", "Cliente", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `ventas_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateVentasResumidoPorProducto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "VENTAS - RESUMIDO POR PRODUCTO" });
  
  const grouped: Record<string, { monto: number; montodolares: number; count: number }> = {};
  
  data.forEach(row => {
    const key = row.producto || "(Sin producto)";
    if (!grouped[key]) grouped[key] = { monto: 0, montodolares: 0, count: 0 };
    grouped[key].monto += toNum(row.monto);
    grouped[key].montodolares += toNum(row.montodolares);
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([producto, totals]) => [producto, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `ventas_producto_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ BANCOS REPORTS ============

interface BancoData {
  fecha: string;
  descripcion: string;
  debito: number;
  credito: number;
  saldo: number;
  banco: string;
  comprobante?: string;
}

export function generateBancosCompleto(data: BancoData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "BANCOS - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    row.banco || "",
    formatNumber(row.debito),
    formatNumber(row.credito),
    formatNumber(row.saldo),
    row.comprobante || "",
  ]);
  
  const totalDebito = data.reduce((sum, row) => sum + toNum(row.debito), 0);
  const totalCredito = data.reduce((sum, row) => sum + toNum(row.credito), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Banco", "Débito", "Crédito", "Saldo", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", "", formatNumber(totalDebito), formatNumber(totalCredito), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `bancos_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateBancosSaldos(data: BancoData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "BANCOS - SALDOS POR CUENTA" });
  
  const grouped: Record<string, { debito: number; credito: number; saldo: number }> = {};
  
  data.forEach(row => {
    const key = row.banco || "(Sin banco)";
    if (!grouped[key]) grouped[key] = { debito: 0, credito: 0, saldo: 0 };
    grouped[key].debito += toNum(row.debito);
    grouped[key].credito += toNum(row.credito);
    grouped[key].saldo = row.saldo || 0;
  });
  
  const tableData = Object.entries(grouped)
    .map(([banco, totals]) => [banco, formatNumber(totals.debito), formatNumber(totals.credito), formatNumber(totals.credito - totals.debito)]);
  
  autoTable(doc, {
    startY,
    head: [["Banco", "Total Débitos", "Total Créditos", "Saldo Neto"]],
    body: tableData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `bancos_saldos_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ ALMACEN REPORTS ============

interface AlmacenData {
  fecha: string;
  descripcion: string;
  producto: string;
  cantidad: number;
  entrada: number;
  salida: number;
  existencia: number;
  unidaddemedida?: string;
}

export function generateAlmacenCompleto(data: AlmacenData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "ALMACEN - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.producto || "",
    row.descripcion || "",
    formatNumber(row.entrada),
    formatNumber(row.salida),
    formatNumber(row.existencia),
    row.unidaddemedida || "",
  ]);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Producto", "Descripción", "Entrada", "Salida", "Existencia", "Unidad"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `almacen_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateAlmacenExistencia(data: AlmacenData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "ALMACEN - EXISTENCIAS" });
  
  const grouped: Record<string, { entrada: number; salida: number; existencia: number; unidad: string }> = {};
  
  data.forEach(row => {
    const key = row.producto || "(Sin producto)";
    if (!grouped[key]) grouped[key] = { entrada: 0, salida: 0, existencia: 0, unidad: row.unidaddemedida || "" };
    grouped[key].entrada += toNum(row.entrada);
    grouped[key].salida += toNum(row.salida);
    grouped[key].existencia = toNum(row.existencia);
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([producto, totals]) => [producto, formatNumber(totals.entrada), formatNumber(totals.salida), formatNumber(totals.existencia), totals.unidad]);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Total Entradas", "Total Salidas", "Existencia", "Unidad"]],
    body: tableData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `almacen_existencia_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ COSECHA REPORTS ============

interface CosechaData {
  fecha: string;
  lote: string;
  destino: string;
  tablon: string;
  kilos: number;
  viajes: number;
  ciclo?: string;
}

export function generateCosechaOrdenadoPorLote(data: CosechaData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "COSECHA - ORDENADO POR LOTE" });
  
  const sortedData = [...data].sort((a, b) => (a.lote || "").localeCompare(b.lote || ""));
  
  const tableData = sortedData.map(row => [
    row.fecha || "",
    row.lote || "",
    row.tablon || "",
    row.destino || "",
    formatNumber(row.kilos),
    row.viajes?.toString() || "0",
  ]);
  
  const totalKilos = data.reduce((sum, row) => sum + toNum(row.kilos), 0);
  const totalViajes = data.reduce((sum, row) => sum + toNum(row.viajes), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Lote", "Tablón", "Destino", "Kilos", "Viajes"]],
    body: tableData,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cosecha_lote_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateCosechaResumidoPorLote(data: CosechaData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "COSECHA - RESUMIDO POR LOTE" });
  
  const grouped: Record<string, { kilos: number; viajes: number }> = {};
  
  data.forEach(row => {
    const key = row.lote || "(Sin lote)";
    if (!grouped[key]) grouped[key] = { kilos: 0, viajes: 0 };
    grouped[key].kilos += row.kilos || 0;
    grouped[key].viajes += row.viajes || 0;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].kilos - a[1].kilos)
    .map(([lote, totals]) => [lote, formatNumber(totals.kilos), totals.viajes.toString()]);
  
  const totalKilos = data.reduce((sum, row) => sum + toNum(row.kilos), 0);
  const totalViajes = data.reduce((sum, row) => sum + toNum(row.viajes), 0);
  
  autoTable(doc, {
    startY,
    head: [["Lote", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cosecha_res_lote_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateCosechaOrdenadoPorDestino(data: CosechaData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "COSECHA - ORDENADO POR DESTINO" });
  
  const sortedData = [...data].sort((a, b) => (a.destino || "").localeCompare(b.destino || ""));
  
  const tableData = sortedData.map(row => [
    row.fecha || "",
    row.destino || "",
    row.lote || "",
    row.tablon || "",
    formatNumber(row.kilos),
    row.viajes?.toString() || "0",
  ]);
  
  const totalKilos = data.reduce((sum, row) => sum + toNum(row.kilos), 0);
  const totalViajes = data.reduce((sum, row) => sum + toNum(row.viajes), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Destino", "Lote", "Tablón", "Kilos", "Viajes"]],
    body: tableData,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cosecha_destino_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateCosechaResumidoPorDestino(data: CosechaData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF();
  const startY = createPdfHeader(doc, { ...config, title: "COSECHA - RESUMIDO POR DESTINO" });
  
  const grouped: Record<string, { kilos: number; viajes: number }> = {};
  
  data.forEach(row => {
    const key = row.destino || "(Sin destino)";
    if (!grouped[key]) grouped[key] = { kilos: 0, viajes: 0 };
    grouped[key].kilos += row.kilos || 0;
    grouped[key].viajes += row.viajes || 0;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].kilos - a[1].kilos)
    .map(([destino, totals]) => [destino, formatNumber(totals.kilos), totals.viajes.toString()]);
  
  const totalKilos = data.reduce((sum, row) => sum + toNum(row.kilos), 0);
  const totalViajes = data.reduce((sum, row) => sum + toNum(row.viajes), 0);
  
  autoTable(doc, {
    startY,
    head: [["Destino", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cosecha_res_destino_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

// ============ CUENTAS POR PAGAR/COBRAR ============

export function generateCxpCompleto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "CUENTAS POR PAGAR - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    formatNumber(row.monto),
    formatNumber(row.montodolares),
    row.proveedor || "",
    row.actividad || "",
  ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Proveedor", "Actividad"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cxp_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateCxcCompleto(data: ReportData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = createPdfHeader(doc, { ...config, title: "CUENTAS POR COBRAR - COMPLETO" });
  
  const tableData = data.map(row => [
    row.fecha || "",
    row.descripcion || "",
    formatNumber(row.monto),
    formatNumber(row.montodolares),
    row.cliente || "",
    row.producto || "",
  ]);
  
  const total = data.reduce((sum, row) => sum + toNum(row.monto), 0);
  const totalDolares = data.reduce((sum, row) => sum + toNum(row.montodolares), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Cliente", "Producto"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cxc_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

interface AdminData {
  fecha: string;
  tipo: string;
  monto: number;
  montodolares?: number;
  unidad?: string;
}

function getMonthYear(dateStr: string): string {
  if (!dateStr) return "Sin fecha";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${monthNames[monthIndex]} ${parts[0]}`;
  }
  return dateStr;
}

function isIngreso(tipo: string): boolean {
  const ingresoTipos = ["ventas", "cuentasporcobrar"];
  return ingresoTipos.includes((tipo || "").toLowerCase());
}

interface MonthlyTotals {
  facturasBs: number;
  facturasDol: number;
  nominaBs: number;
  nominaDol: number;
  ventasBs: number;
  ventasDol: number;
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

export function generateAdminIngresosUnidad(data: AdminData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "portrait" });
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
  
  data.forEach(row => {
    const monthKey = getMonthYear(row.fecha);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
    }
    const tipo = (row.tipo || "").toLowerCase();
    const monto = row.monto || 0;
    const montoDol = row.montodolares || 0;
    
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
  });
  
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const monthOrder = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const [mA, yA] = a.split(" ");
    const [mB, yB] = b.split(" ");
    if (yA !== yB) return parseInt(yA) - parseInt(yB);
    return monthOrder.indexOf(mA) - monthOrder.indexOf(mB);
  });
  
  let yPos = 28;
  const totals = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
  
  sortedMonths.forEach(monthKey => {
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
        ["Nomina:", formatNumber(-d.nominaBs), "Nomina:", formatNumber(-d.nominaDol)],
        ["Facturas+Nomina:", formatNumber(-factNomBs), "Facturas+Nomina:", formatNumber(-factNomDol)],
        ["Ventas:", formatNumber(d.ventasBs), "Ventas:", formatNumber(d.ventasDol)],
        ["Ingresos-Egresos:", formatNumber(balanceBs), "Ingresos-Egresos:", formatNumber(balanceDol)],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { halign: "right", cellWidth: 45 },
        2: { cellWidth: 40 },
        3: { halign: "right", cellWidth: 45 },
      },
      margin: { left: 14 },
      tableWidth: 180,
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  });
  
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
    head: [["Totales:", "Bolívares", "", "Dólares"]],
    body: [
      ["Facturas:", formatNumber(-totals.facturasBs), "Facturas:", formatNumber(-totals.facturasDol)],
      ["Nomina:", formatNumber(-totals.nominaBs), "Nomina:", formatNumber(-totals.nominaDol)],
      ["Facturas+Nomina:", formatNumber(-totalFactNomBs), "Facturas+Nomina:", formatNumber(-totalFactNomDol)],
      ["Ventas:", formatNumber(totals.ventasBs), "Ventas:", formatNumber(totals.ventasDol)],
      ["Ingresos-Egresos:", formatNumber(totalBalanceBs), "Ingresos-Egresos:", formatNumber(totalBalanceDol)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [180, 180, 180], textColor: [0, 0, 0], fontStyle: "bold" },
    bodyStyles: { fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { halign: "right", cellWidth: 45 },
      2: { cellWidth: 40 },
      3: { halign: "right", cellWidth: 45 },
    },
    margin: { left: 14 },
    tableWidth: 180,
  });
  
  const blob = doc.output("blob");
  const filename = `admin_ingresos_${unidad}_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}

export function generateAdminIngresosTodas(data: AdminData[], config: ReportConfig): PdfResult {
  const doc = new jsPDF({ orientation: "portrait" });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Egresos / Ingresos - Todas las Unidades", 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`de: ${formatDate(config.fechaInicial)}`, pageWidth - 60, 10);
  doc.text(`hasta: ${formatDate(config.fechaFinal)}`, pageWidth - 60, 16);
  
  const unidadData: Record<string, MonthlyTotals> = {};
  
  data.forEach(row => {
    const unidad = row.unidad || "Sin unidad";
    if (!unidadData[unidad]) {
      unidadData[unidad] = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
    }
    const tipo = (row.tipo || "").toLowerCase();
    const monto = row.monto || 0;
    const montoDol = row.montodolares || 0;
    
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
  });
  
  let yPos = 28;
  const totals = { facturasBs: 0, facturasDol: 0, nominaBs: 0, nominaDol: 0, ventasBs: 0, ventasDol: 0 };
  
  Object.keys(unidadData).sort().forEach(unidad => {
    const d = unidadData[unidad];
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
      head: [[`Unidad: ${unidad}`, "Bolívares", "", "Dólares"]],
      body: [
        ["Facturas:", formatNumber(-d.facturasBs), "Facturas:", formatNumber(-d.facturasDol)],
        ["Nomina:", formatNumber(-d.nominaBs), "Nomina:", formatNumber(-d.nominaDol)],
        ["Facturas+Nomina:", formatNumber(-factNomBs), "Facturas+Nomina:", formatNumber(-factNomDol)],
        ["Ventas:", formatNumber(d.ventasBs), "Ventas:", formatNumber(d.ventasDol)],
        ["Ingresos-Egresos:", formatNumber(balanceBs), "Ingresos-Egresos:", formatNumber(balanceDol)],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { halign: "right", cellWidth: 45 },
        2: { cellWidth: 40 },
        3: { halign: "right", cellWidth: 45 },
      },
      margin: { left: 14 },
      tableWidth: 180,
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
  });
  
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
    head: [["TOTALES GENERALES:", "Bolívares", "", "Dólares"]],
    body: [
      ["Facturas:", formatNumber(-totals.facturasBs), "Facturas:", formatNumber(-totals.facturasDol)],
      ["Nomina:", formatNumber(-totals.nominaBs), "Nomina:", formatNumber(-totals.nominaDol)],
      ["Facturas+Nomina:", formatNumber(-totalFactNomBs), "Facturas+Nomina:", formatNumber(-totalFactNomDol)],
      ["Ventas:", formatNumber(totals.ventasBs), "Ventas:", formatNumber(totals.ventasDol)],
      ["Ingresos-Egresos:", formatNumber(totalBalanceBs), "Ingresos-Egresos:", formatNumber(totalBalanceDol)],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [180, 180, 180], textColor: [0, 0, 0], fontStyle: "bold" },
    bodyStyles: { fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { halign: "right", cellWidth: 45 },
      2: { cellWidth: 40 },
      3: { halign: "right", cellWidth: 45 },
    },
    margin: { left: 14 },
    tableWidth: 180,
  });
  
  const blob = doc.output("blob");
  const filename = `admin_ingresos_todas_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}
