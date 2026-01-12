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

export function generateWeeklyPdf(registros: Registro[], weekNumber: number): void {
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

  const totalCantidad = registros.reduce((sum, r) => sum + r.cantidad, 0);
  const avgGrado = totalCantidad > 0 
    ? registros.reduce((sum, r) => sum + (r.cantidad * r.grado), 0) / totalCantidad 
    : 0;

  autoTable(doc, {
    startY: 50,
    head: [["Fecha", "Central", "Cantidad", "Grado"]],
    body: tableData,
    foot: [[
      "TOTALES",
      `${registros.length} registros`,
      formatNumber(totalCantidad),
      `Prom: ${formatNumber(avgGrado)}`,
    ]],
    theme: "striped",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [33, 33, 33],
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

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-ES")}`,
    14,
    pageHeight - 10
  );

  doc.save(`registros_semana_${weekNumber}.pdf`);
}
