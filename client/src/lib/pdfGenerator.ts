import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip } from "chart.js";
import type { Registro } from "@shared/schema";
import { getWeekDateRange, formatDateSpanish } from "./weekUtils";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip);

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

function generateDailyChartImage(registros: Registro[]): string | null {
  if (registros.length === 0) return null;

  const dailyTotals: Record<string, number> = {};
  registros.forEach(r => {
    const day = r.fecha;
    dailyTotals[day] = (dailyTotals[day] || 0) + r.cantidad;
  });

  const sortedDays = Object.keys(dailyTotals).sort();
  const labels = sortedDays.map(d => {
    const [, month, day] = d.split('-');
    return `${day}/${month}`;
  });
  const data = sortedDays.map(d => dailyTotals[d]);

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Cantidad por Día',
        data,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'Cantidad por Día',
          font: { size: 14 }
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  const imageData = canvas.toDataURL('image/png', 1);
  chart.destroy();
  return imageData;
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
    r.grado !== null ? formatNumber(r.grado) : "-",
  ]);

  const centrales = ["Palmar", "Portuguesa", "Pastora", "Otros"];
  const totalsByCentral = centrales.map(central => {
    const centralRegistros = registros.filter(r => r.central === central);
    const centralRegistrosConGrado = centralRegistros.filter(r => r.grado !== null);
    const cantidad = centralRegistros.reduce((sum, r) => sum + r.cantidad, 0);
    const cantidadConGrado = centralRegistrosConGrado.reduce((sum, r) => sum + r.cantidad, 0);
    const avgGrado = cantidadConGrado > 0
      ? centralRegistrosConGrado.reduce((sum, r) => sum + (r.cantidad * (r.grado ?? 0)), 0) / cantidadConGrado
      : 0;
    return { central, cantidad, avgGrado, count: centralRegistros.length };
  }).filter(t => t.count > 0);

  const totalCantidad = registros.reduce((sum, r) => sum + r.cantidad, 0);
  const registrosConGrado = registros.filter(r => r.grado !== null);
  const cantidadConGrado = registrosConGrado.reduce((sum, r) => sum + r.cantidad, 0);
  const avgGrado = cantidadConGrado > 0 
    ? registrosConGrado.reduce((sum, r) => sum + (r.cantidad * (r.grado ?? 0)), 0) / cantidadConGrado 
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

  let currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const chartImage = generateDailyChartImage(registros);
  if (chartImage) {
    const pageHeight = doc.internal.pageSize.height;
    const chartHeight = 60;
    
    if (currentY + chartHeight + 20 > pageHeight) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.addImage(chartImage, 'PNG', 14, currentY, 180, chartHeight);
    currentY += chartHeight + 10;
  }

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

export async function generateWeeklyPdf(registros: Registro[], weekNumber: number): Promise<void> {
  const doc = createPdfDocument(registros, weekNumber);
  const blob = doc.output('blob');
  const fileName = `registros_semana_${weekNumber}.pdf`;

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & { showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Documento PDF',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
    }
  }

  doc.save(fileName);
}

export async function shareWeeklyPdf(registros: Registro[], weekNumber: number): Promise<boolean> {
  const doc = createPdfDocument(registros, weekNumber);
  const blob = doc.output('blob');
  const fileName = `registros_semana_${weekNumber}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (!navigator.share) {
    return false;
  }

  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

  if (!canShareFiles) {
    return false;
  }

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

export function canSharePdf(): boolean {
  return typeof navigator.share === 'function';
}

export function viewWeeklyPdf(registros: Registro[], weekNumber: number): void {
  const doc = createPdfDocument(registros, weekNumber);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    const fileName = `registros_semana_${weekNumber}.pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } else {
    window.open(url, '_blank');
  }
}
