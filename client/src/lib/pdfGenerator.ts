import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";
import type { Registro, Central } from "@shared/schema";
import { getWeekDateRange, formatDateSpanish, getWeekStartDate } from "./weekUtils";

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

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

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function generateDailyChartImage(registros: Registro[], centrales: Central[]): string | null {
  if (registros.length === 0) return null;

  const dailyByCentral: Record<string, Record<number, number>> = {};
  centrales.forEach(c => {
    dailyByCentral[c.nombre] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  });
  const dailyTotal: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  registros.forEach(r => {
    const date = new Date(r.fecha + 'T12:00:00');
    const dayOfWeek = date.getDay();
    if (dailyByCentral[r.central]) {
      dailyByCentral[r.central][dayOfWeek] += r.cantidad;
    }
    dailyTotal[dayOfWeek] += r.cantidad;
  });

  const labels = DAY_NAMES;
  const datasets = centrales.filter(c => {
    return registros.some(r => r.central === c.nombre);
  }).map(central => ({
    label: central.nombre,
    data: [0, 1, 2, 3, 4, 5, 6].map(d => dailyByCentral[central.nombre][d]),
    borderColor: central.color,
    backgroundColor: central.color,
    borderWidth: 2,
    tension: 0.3,
    pointRadius: 4,
    pointBackgroundColor: central.color,
  }));

  datasets.push({
    label: 'Total',
    data: [0, 1, 2, 3, 4, 5, 6].map(d => dailyTotal[d]),
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
    borderWidth: 3,
    tension: 0.3,
    pointRadius: 5,
    pointBackgroundColor: '#ef4444',
  });

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'Cantidad por Día de la Semana',
          font: { size: 14 }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 10
          }
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

function createPdfDocument(registros: Registro[], weekNumber: number, centrales: Central[]): jsPDF {
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

  const centralNames = centrales.map(c => c.nombre);
  const totalsByCentral = centralNames.map(central => {
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

  const chartImage = generateDailyChartImage(registros, centrales);
  if (chartImage) {
    const pageHeight = doc.internal.pageSize.height;
    const chartHeight = 70;
    
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

export async function generateWeeklyPdf(registros: Registro[], weekNumber: number, centrales: Central[]): Promise<void> {
  const doc = createPdfDocument(registros, weekNumber, centrales);
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

export async function shareWeeklyPdf(registros: Registro[], weekNumber: number, centrales: Central[]): Promise<boolean> {
  const doc = createPdfDocument(registros, weekNumber, centrales);
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

export function viewWeeklyPdf(registros: Registro[], weekNumber: number, centrales: Central[]): void {
  const doc = createPdfDocument(registros, weekNumber, centrales);
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

function generateWeeklyTotalsChartImage(registros: Registro[], centrales: Central[]): string | null {
  if (registros.length === 0) return null;

  const centralNames = centrales.map(c => c.nombre);
  const weeklyTotals: Record<number, Record<string, number>> = {};
  
  const weekStart = getWeekStartDate();
  const startDateObj = new Date(weekStart.year, weekStart.month - 1, weekStart.day);
  
  registros.forEach(r => {
    const date = new Date(r.fecha + 'T12:00:00');
    const diffTime = date.getTime() - startDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    
    if (week > 0) {
      if (!weeklyTotals[week]) {
        weeklyTotals[week] = {};
        centralNames.forEach(name => {
          weeklyTotals[week][name] = 0;
        });
      }
      if (weeklyTotals[week][r.central] !== undefined) {
        weeklyTotals[week][r.central] += r.cantidad;
      }
    }
  });

  const weeks = Object.keys(weeklyTotals).map(Number).sort((a, b) => a - b);
  if (weeks.length === 0) return null;

  const labels = weeks.map(w => `S${w}`);
  const datasets = centrales.filter(c => {
    return weeks.some(w => weeklyTotals[w][c.nombre] > 0);
  }).map(central => ({
    label: central.nombre,
    data: weeks.map(w => weeklyTotals[w][central.nombre] || 0),
    borderColor: central.color,
    backgroundColor: central.color,
    borderWidth: 2,
    tension: 0.3,
    pointRadius: 4,
    pointBackgroundColor: central.color,
  }));

  datasets.push({
    label: 'Total',
    data: weeks.map(w => 
      centralNames.reduce((sum, name) => sum + (weeklyTotals[w][name] || 0), 0)
    ),
    borderColor: '#ef4444',
    backgroundColor: '#ef4444',
    borderWidth: 3,
    tension: 0.3,
    pointRadius: 5,
    pointBackgroundColor: '#ef4444',
  });

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'Totales por Semana',
          font: { size: 14 }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 12, padding: 10 }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });

  const imageData = canvas.toDataURL('image/png', 1);
  chart.destroy();
  return imageData;
}

function generateCumulativeChartImage(registros: Registro[], centrales: Central[]): string | null {
  if (registros.length === 0 || centrales.length === 0) return null;

  const sortedRegistros = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  const dailyTotals: Record<string, Record<string, number>> = {};
  
  sortedRegistros.forEach(r => {
    if (!dailyTotals[r.fecha]) {
      dailyTotals[r.fecha] = {};
      centrales.forEach(c => {
        dailyTotals[r.fecha][c.nombre] = 0;
      });
    }
    if (dailyTotals[r.fecha][r.central] !== undefined) {
      dailyTotals[r.fecha][r.central] += r.cantidad;
    }
  });

  const dates = Object.keys(dailyTotals).sort();
  if (dates.length === 0) return null;

  const cumulatives: Record<string, number> = {};
  centrales.forEach(c => {
    cumulatives[c.nombre] = 0;
  });
  let cumulativeTotal = 0;

  const chartData: Array<{ label: string; Total: number; [key: string]: string | number }> = dates.map(date => {
    centrales.forEach(c => {
      cumulatives[c.nombre] += dailyTotals[date][c.nombre] || 0;
    });
    const dayTotal = Object.values(dailyTotals[date]).reduce((sum, v) => sum + v, 0);
    cumulativeTotal += dayTotal;

    const [, month, day] = date.split('-');
    return {
      label: `${day}/${month}`,
      ...Object.fromEntries(centrales.map(c => [c.nombre, cumulatives[c.nombre]])),
      Total: cumulativeTotal,
    };
  });

  const labels = chartData.map(d => d.label);
  const datasets = centrales.filter(c => {
    return chartData.some(d => (d[c.nombre] as number) > 0);
  }).map(central => ({
    label: central.nombre,
    data: chartData.map(d => d[central.nombre] as number),
    borderColor: central.color,
    backgroundColor: central.color,
    borderWidth: 2,
    tension: 0.3,
    pointRadius: 3,
    pointBackgroundColor: central.color,
  }));

  datasets.push({
    label: 'Total',
    data: chartData.map(d => d.Total as number),
    borderColor: '#000000',
    backgroundColor: '#000000',
    borderWidth: 2,
    tension: 0.3,
    pointRadius: 4,
    pointBackgroundColor: '#000000',
  });

  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: 'Cantidades Acumuladas desde el Primer Día',
          font: { size: 14 }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: { boxWidth: 12, padding: 10 }
        }
      },
      scales: { 
        y: { beginAtZero: true },
        x: { 
          ticks: { 
            maxRotation: 45,
            minRotation: 45,
            font: { size: 9 }
          }
        }
      }
    }
  });

  const imageData = canvas.toDataURL('image/png', 1);
  chart.destroy();
  return imageData;
}

function createAllWeeksPdfDocument(registros: Registro[], centrales: Central[]): jsPDF {
  const useLandscape = centrales.length >= 6;
  const doc = new jsPDF({ orientation: useLandscape ? 'landscape' : 'portrait' });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 28;
  const availableWidth = pageWidth - margins;
  
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text("Registro de Centrales - Todas las Semanas", 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total de registros: ${registros.length}`, 14, 32);

  const centralNames = centrales.map(c => c.nombre);
  const weeklyTotals: Record<number, Record<string, number>> = {};
  
  const weekStart = getWeekStartDate();
  const startDateObj = new Date(weekStart.year, weekStart.month - 1, weekStart.day);
  
  registros.forEach(r => {
    const date = new Date(r.fecha + 'T12:00:00');
    const diffTime = date.getTime() - startDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    
    if (week > 0) {
      if (!weeklyTotals[week]) {
        weeklyTotals[week] = {};
        centralNames.forEach(name => {
          weeklyTotals[week][name] = 0;
        });
      }
      if (weeklyTotals[week][r.central] !== undefined) {
        weeklyTotals[week][r.central] += r.cantidad;
      }
    }
  });

  const weeks = Object.keys(weeklyTotals).map(Number).sort((a, b) => a - b);
  
  const weeklyTableData: string[][] = weeks.map(week => {
    const values = centralNames.map(name => weeklyTotals[week][name] || 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    return [
      `Semana ${week}`,
      ...values.map(v => formatNumber(v)),
      formatNumber(total),
    ];
  });

  const grandTotals = centralNames.map(name => 
    weeks.reduce((sum, w) => sum + (weeklyTotals[w][name] || 0), 0)
  );
  const grandTotal = grandTotals.reduce((sum, t) => sum + t, 0);

  const totalColumns = centralNames.length + 2;
  const dataColumns = totalColumns - 1;
  
  const weekColumnRatio = 1.3;
  const totalRatioUnits = weekColumnRatio + dataColumns;
  const unitWidth = availableWidth / totalRatioUnits;
  
  let weekColumnWidth = unitWidth * weekColumnRatio;
  let dataColumnWidth = unitWidth;
  
  weekColumnWidth = Math.min(45, weekColumnWidth);
  dataColumnWidth = Math.min(45, dataColumnWidth);

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" | "left" | "center" }> = {
    0: { cellWidth: weekColumnWidth },
  };
  centralNames.forEach((_, i) => {
    columnStyles[i + 1] = { cellWidth: dataColumnWidth, halign: "right" };
  });
  columnStyles[centralNames.length + 1] = { cellWidth: dataColumnWidth, halign: "right" };

  autoTable(doc, {
    startY: 42,
    head: [["Semana", ...centralNames, "Total"]],
    body: weeklyTableData,
    foot: [[
      "TOTAL",
      ...grandTotals.map(t => formatNumber(t)),
      formatNumber(grandTotal),
    ]],
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
    columnStyles,
    margin: { left: 14, right: 14 },
    styles: {
      overflow: 'linebreak',
      fontSize: centralNames.length > 12 ? 7 : centralNames.length > 8 ? 8 : 10,
      cellPadding: centralNames.length > 12 ? 1 : 2,
    },
  });

  let currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const chartImage = generateWeeklyTotalsChartImage(registros, centrales);
  if (chartImage) {
    const docPageHeight = doc.internal.pageSize.height;
    const chartHeight = 70;
    const chartWidth = pageWidth - margins;
    
    if (currentY + chartHeight + 20 > docPageHeight) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.addImage(chartImage, 'PNG', 14, currentY, chartWidth, chartHeight);
    currentY += chartHeight + 15;
  }

  const cumulativeChartImage = generateCumulativeChartImage(registros, centrales);
  if (cumulativeChartImage) {
    const docPageHeightForCumulative = doc.internal.pageSize.height;
    const chartHeight = 70;
    const chartWidth = pageWidth - margins;
    
    if (currentY + chartHeight + 20 > docPageHeightForCumulative) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.addImage(cumulativeChartImage, 'PNG', 14, currentY, chartWidth, chartHeight);
    currentY += chartHeight + 15;
  }

  const docPageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleString("es-ES")}`,
    14,
    docPageHeight - 10
  );

  return doc;
}

export async function generateAllWeeksPdf(registros: Registro[], centrales: Central[]): Promise<void> {
  const doc = createAllWeeksPdfDocument(registros, centrales);
  const blob = doc.output('blob');
  const fileName = `registros_todas_semanas.pdf`;

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
