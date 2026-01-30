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

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "";
  return num.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Proveedor", "Insumo", "Actividad", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Proveedor", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Insumo", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Personal", "Actividad", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([personal, totals]) => [personal, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Personal", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([actividad, totals]) => [actividad, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Actividad", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Producto", "Cliente", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].monto += row.monto || 0;
    grouped[key].montodolares += row.montodolares || 0;
    grouped[key].count += 1;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([producto, totals]) => [producto, totals.count.toString(), formatNumber(totals.monto), formatNumber(totals.montodolares)]);
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Registros", "Monto Total", "Monto $ Total"]],
    body: tableData,
    foot: [["TOTAL", data.length.toString(), formatNumber(total), formatNumber(totalDolares)]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const totalDebito = data.reduce((sum, row) => sum + (row.debito || 0), 0);
  const totalCredito = data.reduce((sum, row) => sum + (row.credito || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Banco", "Débito", "Crédito", "Saldo", "Comprobante"]],
    body: tableData,
    foot: [["TOTAL", "", "", formatNumber(totalDebito), formatNumber(totalCredito), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].debito += row.debito || 0;
    grouped[key].credito += row.credito || 0;
    grouped[key].saldo = row.saldo || 0;
  });
  
  const tableData = Object.entries(grouped)
    .map(([banco, totals]) => [banco, formatNumber(totals.debito), formatNumber(totals.credito), formatNumber(totals.credito - totals.debito)]);
  
  autoTable(doc, {
    startY,
    head: [["Banco", "Total Débitos", "Total Créditos", "Saldo Neto"]],
    body: tableData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
    headStyles: { fillColor: [66, 66, 66] },
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
    grouped[key].entrada += row.entrada || 0;
    grouped[key].salida += row.salida || 0;
    grouped[key].existencia = row.existencia || 0;
  });
  
  const tableData = Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([producto, totals]) => [producto, formatNumber(totals.entrada), formatNumber(totals.salida), formatNumber(totals.existencia), totals.unidad]);
  
  autoTable(doc, {
    startY,
    head: [["Producto", "Total Entradas", "Total Salidas", "Existencia", "Unidad"]],
    body: tableData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const totalKilos = data.reduce((sum, row) => sum + (row.kilos || 0), 0);
  const totalViajes = data.reduce((sum, row) => sum + (row.viajes || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Lote", "Tablón", "Destino", "Kilos", "Viajes"]],
    body: tableData,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const totalKilos = data.reduce((sum, row) => sum + (row.kilos || 0), 0);
  const totalViajes = data.reduce((sum, row) => sum + (row.viajes || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Lote", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const totalKilos = data.reduce((sum, row) => sum + (row.kilos || 0), 0);
  const totalViajes = data.reduce((sum, row) => sum + (row.viajes || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Destino", "Lote", "Tablón", "Kilos", "Viajes"]],
    body: tableData,
    foot: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const totalKilos = data.reduce((sum, row) => sum + (row.kilos || 0), 0);
  const totalViajes = data.reduce((sum, row) => sum + (row.viajes || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Destino", "Kilos Total", "Viajes Total"]],
    body: tableData,
    foot: [["TOTAL", formatNumber(totalKilos), totalViajes.toString()]],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Proveedor", "Actividad"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
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
  
  const total = data.reduce((sum, row) => sum + (row.monto || 0), 0);
  const totalDolares = data.reduce((sum, row) => sum + (row.montodolares || 0), 0);
  
  autoTable(doc, {
    startY,
    head: [["Fecha", "Descripción", "Monto", "Monto $", "Cliente", "Producto"]],
    body: tableData,
    foot: [["TOTAL", "", formatNumber(total), formatNumber(totalDolares), "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] },
    footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: "bold" },
  });
  
  const blob = doc.output("blob");
  const filename = `cxc_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`;
  return { blob, filename };
}
