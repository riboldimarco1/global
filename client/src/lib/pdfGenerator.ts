import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Registro } from "@shared/schema";
import { getWeekDateRange, formatDateSpanish } from "./weekUtils";

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function createPdfDocument(registros: Registro[], weekNumber: number): jsPDF {
  const doc = new jsPDF();
  const { start, end } = getWeekDateRange(weekNumber);
  
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text("Registro de Centrales", 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(`Semana ${weekNumber}`, 14, 32);
  
  doc.setFontSize(11);
  doc.text(`${formatDateSpanish(start)} - ${formatDateSpanish(end)}`, 14, 40);
  
  const tableData = registros.map(r => [
    formatDateDisplay(r.fecha),
    r.central,
    formatNumber(r.cantidad),
    formatNumber(r.grado),
  ]);

  const centrales = ["Palmar", "Portuguesa", "Pastora", "Otros"];
  const totalsByCentral = centrales.map(central => {
    const centralRegistros = registros.filter(r => r.central === central);
    const cantidad = centralRegistros.reduce((sum, r) => sum + r.cantidad, 0);
    const avgGrado = cantidad > 0
      ? centralRegistros.reduce((sum, r) => sum + (r.cantidad * r.grado), 0) / cantidad
      : 0;
    return { central, cantidad, avgGrado, count: centralRegistros.length };
  }).filter(t => t.count > 0);

  const totalCantidad = registros.reduce((sum, r) => sum + r.cantidad, 0);
  const avgGrado = totalCantidad > 0 
    ? registros.reduce((sum, r) => sum + (r.cantidad * r.grado), 0) / totalCantidad 
    : 0;

  autoTable(doc, {
    startY: 50,
    head: [["Fecha", "Central", "Cantidad", "Grado"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const summaryData: string[][] = [];
  totalsByCentral.forEach(t => {
    summaryData.push([
      t.central,
      `${t.count} reg.`,
      formatNumber(t.cantidad),
      formatNumber(t.avgGrado),
    ]);
  });
  summaryData.push([
    "TOTAL GENERAL",
    `${registros.length} reg.`,
    formatNumber(totalCantidad),
    formatNumber(avgGrado),
  ]);

  autoTable(doc, {
    startY: finalY,
    head: [["Central", "Registros", "Total Cantidad", "Prom. Grado"]],
    body: summaryData.slice(0, -1),
    foot: [summaryData[summaryData.length - 1]],
    theme: "grid",
    headStyles: {
      fillColor: [75, 85, 99],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-ES")}`,
    14,
    pageHeight - 10
  );

  return doc;
}

export function generateWeeklyPdf(registros: Registro[], weekNumber: number): void {
  const doc = createPdfDocument(registros, weekNumber);
  doc.save(`registros_semana_${weekNumber}.pdf`);
}

export async function shareWeeklyPdf(registros: Registro[], weekNumber: number): Promise<boolean> {
  const doc = createPdfDocument(registros, weekNumber);
  const blob = doc.output('blob');
  const fileName = `registros_semana_${weekNumber}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Registro de Centrales - Semana ${weekNumber}`,
        text: `Reporte de registros de la semana ${weekNumber}`,
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  }
  
  return false;
}

export function canSharePdf(): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}
