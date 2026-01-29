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

export function generateGastosCompleto(data: ReportData[], config: ReportConfig): void {
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
  
  doc.save(`gastos_completo_${config.fechaInicial}_${config.fechaFinal}.pdf`);
}

export function generateGastosResumidoPorActividad(data: ReportData[], config: ReportConfig): void {
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
  
  doc.save(`gastos_actividad_${config.fechaInicial}_${config.fechaFinal}.pdf`);
}

export function generateGastosResumidoPorProveedor(data: ReportData[], config: ReportConfig): void {
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
  
  doc.save(`gastos_proveedor_${config.fechaInicial}_${config.fechaFinal}.pdf`);
}

export function generateGastosResumidoPorInsumo(data: ReportData[], config: ReportConfig): void {
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
  
  doc.save(`gastos_insumo_${config.fechaInicial}_${config.fechaFinal}.pdf`);
}
