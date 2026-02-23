import type { HtmlReportData, PieChartItem } from "@/components/ReporteHTMLViewer";

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

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0.0%";
  return ((Math.abs(value) / Math.abs(total)) * 100).toFixed(1) + "%";
}

function parseFechaToNum(fecha: string): number {
  if (!fecha) return 0;
  const parts = fecha.split("/");
  if (parts.length !== 3) return 0;
  const [dd, mm, aa] = parts;
  const year = parseInt(aa, 10);
  const fullYear = year < 50 ? 2000 + year : 1900 + year;
  return fullYear * 10000 + parseInt(mm, 10) * 100 + parseInt(dd, 10);
}

function sortByDate(data: any[]): any[] {
  return [...data].sort((a, b) => {
    const numA = parseFechaToNum(a.fecha || "");
    const numB = parseFechaToNum(b.fecha || "");
    return numA - numB;
  });
}

export function prepareGastosCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.proveedor || "", row.insumo || "", row.actividad || "", row.comprobante || "",
    ]);
  }

  return {
    title: "GASTOS Y FACTURAS - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Proveedor", "Insumo", "Actividad", "Comprobante"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", "", ""]],
    alignRight: [2, 3],
  };
}

export function prepareGastosResumidoPorActividad(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([actividad, t]) => ({ label: actividad, value: t.monto }));
  const rows = sorted.map(([actividad, t]) => [actividad, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "GASTOS Y FACTURAS - POR ACTIVIDAD",
    headers: ["Actividad", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareGastosResumidoPorProveedor(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([proveedor, t]) => ({ label: proveedor, value: t.monto }));
  const rows = sorted.map(([proveedor, t]) => [proveedor, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "GASTOS Y FACTURAS - POR PROVEEDOR",
    headers: ["Proveedor", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareGastosResumidoPorInsumo(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([insumo, t]) => ({ label: insumo, value: t.monto }));
  const rows = sorted.map(([insumo, t]) => [insumo, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "GASTOS Y FACTURAS - POR INSUMO",
    headers: ["Insumo", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareNominaCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.personal || "", row.actividad || "", row.comprobante || "",
    ]);
  }

  return {
    title: "NÓMINA - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Personal", "Actividad", "Comprobante"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", ""]],
    alignRight: [2, 3],
  };
}

export function prepareNominaResumidoPorPersonal(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([personal, t]) => ({ label: personal, value: t.monto }));
  const rows = sorted.map(([personal, t]) => [personal, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "NÓMINA - POR PERSONAL",
    headers: ["Personal", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareNominaResumidoPorActividad(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([actividad, t]) => ({ label: actividad, value: t.monto }));
  const rows = sorted.map(([actividad, t]) => [actividad, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "NÓMINA - POR ACTIVIDAD",
    headers: ["Actividad", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareVentasCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.producto || "", row.cliente || "", row.comprobante || "",
    ]);
  }

  return {
    title: "VENTAS - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Producto", "Cliente", "Comprobante"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", "", ""]],
    alignRight: [2, 3],
  };
}

export function prepareVentasResumidoPorProducto(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([producto, t]) => ({ label: producto, value: t.monto }));
  const rows = sorted.map(([producto, t]) => [producto, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "VENTAS - POR PRODUCTO",
    headers: ["Producto", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareBancosCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalDebito = 0;
  let totalCredito = 0;

  for (const row of sortedData) {
    const debito = toNum(row.debito);
    const credito = toNum(row.credito);
    totalDebito += debito;
    totalCredito += credito;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", row.banco || "",
      formatNumber(debito), formatNumber(credito), formatNumber(row.saldo), row.comprobante || "",
    ]);
  }

  return {
    title: "BANCOS - COMPLETO",
    headers: ["Fecha", "Descripción", "Banco", "Débito", "Crédito", "Saldo", "Comprobante"],
    rows,
    footers: [["TOTAL", "", "", formatNumber(totalDebito), formatNumber(totalCredito), "", ""]],
    alignRight: [3, 4, 5],
  };
}

function getValutaGroup(banco: string): string {
  const b = (banco || "").toLowerCase();
  if (b.startsWith("dolares ") || b === "dolares") return "Dólares";
  if (b.startsWith("euro ") || b === "euro") return "Euros";
  if (b.startsWith("caja chica")) return "Caja Chica";
  return "Bolívares";
}

function parseFechaFlexible(fecha: string): number {
  if (!fecha) return 0;
  const s = fecha.trim();
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length === 3) {
      const [dd, mm, aa] = parts;
      const year = parseInt(aa, 10);
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return new Date(fullYear, parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
    }
    return 0;
  }
  const ts = new Date(s).getTime();
  return isNaN(ts) ? 0 : ts;
}

export function prepareBancosSaldos(data: any[], tasaDolar?: number, bancosParametros?: string[]): HtmlReportData {
  const lastByBanco: Record<string, any> = {};

  const sorted = [...data].sort((a, b) => {
    const numA = parseFechaFlexible((a.fecha || "").toString());
    const numB = parseFechaFlexible((b.fecha || "").toString());
    if (numA !== numB) return numA - numB;
    const ca = (a.created_at || "").toString();
    const cb = (b.created_at || "").toString();
    return ca.localeCompare(cb);
  });

  for (const row of sorted) {
    const key = row.banco || "(Sin banco)";
    lastByBanco[key] = row;
  }

  if (bancosParametros && bancosParametros.length > 0) {
    for (const nombre of bancosParametros) {
      if (!lastByBanco[nombre]) {
        lastByBanco[nombre] = { banco: nombre, saldo: 0, saldo_conciliado: 0 };
      }
    }
  }

  const tasa = tasaDolar && tasaDolar > 0 ? tasaDolar : 0;
  const valutaOrder = ["Bolívares", "Dólares", "Euros", "Caja Chica"];
  const byValuta: Record<string, { banco: string; saldo: number; conciliado: number; saldoDol: number; conciliadoDol: number }[]> = {};

  for (const [banco, row] of Object.entries(lastByBanco)) {
    const group = getValutaGroup(banco);
    if (!byValuta[group]) byValuta[group] = [];
    const saldo = toNum(row.saldo);
    const conciliado = toNum(row.saldo_conciliado);
    const saldoDol = tasa ? saldo / tasa : 0;
    const conciliadoDol = tasa ? conciliado / tasa : 0;
    byValuta[group].push({ banco, saldo, conciliado, saldoDol, conciliadoDol });
  }

  const headers = ["Banco", "Saldo", "Saldo Conciliado", "Saldo Dólares", "Saldo Conc. Dólares", "%"];
  const alignRight = [1, 2, 3, 4, 5];

  let grandSaldo = 0;
  let grandConciliado = 0;
  let grandSaldoDol = 0;
  let grandConciliadoDol = 0;

  const groupedSections = valutaOrder
    .filter(v => byValuta[v] && byValuta[v].length > 0)
    .map(valuta => {
      const items = byValuta[valuta].sort((a, b) => a.banco.localeCompare(b.banco));
      let subtotalSaldo = 0;
      let subtotalConciliado = 0;
      let subtotalSaldoDol = 0;
      let subtotalConciliadoDol = 0;

      for (const item of items) {
        subtotalSaldo += item.saldo;
        subtotalConciliado += item.conciliado;
        subtotalSaldoDol += item.saldoDol;
        subtotalConciliadoDol += item.conciliadoDol;
      }

      const absSubtotal = items.reduce((s, v) => s + Math.abs(v.saldo), 0);
      const rows = items.map(item => [
        item.banco,
        formatNumber(item.saldo),
        formatNumber(item.conciliado),
        formatNumber(item.saldoDol),
        formatNumber(item.conciliadoDol),
        formatPercent(item.saldo, absSubtotal),
      ]);

      grandSaldo += subtotalSaldo;
      grandConciliado += subtotalConciliado;
      grandSaldoDol += subtotalSaldoDol;
      grandConciliadoDol += subtotalConciliadoDol;

      const sectionPieChart: PieChartItem[] = items
        .filter(v => Math.abs(v.saldo) > 0)
        .map(v => ({ label: v.banco, value: Math.abs(v.saldo) }));

      return {
        title: valuta.toUpperCase(),
        headers,
        rows,
        footers: [[`SUBTOTAL ${valuta.toUpperCase()}`, formatNumber(subtotalSaldo), formatNumber(subtotalConciliado), formatNumber(subtotalSaldoDol), formatNumber(subtotalConciliadoDol), "100%"]],
        alignRight,
        pieChart: sectionPieChart,
      };
    });

  const tasaLabel = tasa ? ` (Tasa: ${formatNumber(tasa)})` : "";

  return {
    title: `BANCOS - SALDOS POR CUENTA${tasaLabel}`,
    headers,
    rows: [],
    footers: [["TOTAL GENERAL", formatNumber(grandSaldo), formatNumber(grandConciliado), formatNumber(grandSaldoDol), formatNumber(grandConciliadoDol), ""]],
    alignRight,
    groupedSections,
  };
}

export function prepareAlmacenCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];

  for (const row of sortedData) {
    rows.push([
      formatDate(row.fecha), row.producto || "", row.descripcion || "",
      formatNumber(row.entrada), formatNumber(row.salida), formatNumber(row.existencia),
      row.unidaddemedida || "",
    ]);
  }

  return {
    title: "ALMACÉN - COMPLETO",
    headers: ["Fecha", "Producto", "Descripción", "Entrada", "Salida", "Existencia", "Unidad"],
    rows,
    alignRight: [3, 4, 5],
  };
}

export function prepareAlmacenExistencia(data: any[]): HtmlReportData {
  const grouped: Record<string, { entrada: number; salida: number; existencia: number; unidad: string }> = {};

  for (const row of data) {
    const key = row.producto || "(Sin producto)";
    if (!grouped[key]) grouped[key] = { entrada: 0, salida: 0, existencia: 0, unidad: row.unidaddemedida || "" };
    grouped[key].entrada += toNum(row.entrada);
    grouped[key].salida += toNum(row.salida);
    grouped[key].existencia = toNum(row.existencia);
  }

  const rows = Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([producto, t]) => [producto, formatNumber(t.entrada), formatNumber(t.salida), formatNumber(t.existencia), t.unidad]);

  return {
    title: "ALMACÉN - EXISTENCIAS",
    headers: ["Producto", "Total Entradas", "Total Salidas", "Existencia", "Unidad"],
    rows,
    alignRight: [1, 2, 3],
  };
}

export function prepareCosechaOrdenadoPorLote(data: any[]): HtmlReportData {
  const sortedData = [...data].sort((a, b) => (a.lote || "").localeCompare(b.lote || ""));
  const rows: string[][] = [];
  let totalKilos = 0;
  let totalViajes = 0;

  for (const row of sortedData) {
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    totalKilos += kilos;
    totalViajes += viajes;
    rows.push([formatDate(row.fecha), row.lote || "", row.tablon || "", row.destino || "", formatNumber(kilos), viajes.toString()]);
  }

  return {
    title: "COSECHA - POR LOTE",
    headers: ["Fecha", "Lote", "Tablón", "Destino", "Kilos", "Viajes"],
    rows,
    footers: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    alignRight: [4, 5],
  };
}

export function prepareCosechaResumidoPorLote(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].kilos - a[1].kilos);
  const pieChart: PieChartItem[] = sorted.map(([lote, t]) => ({ label: lote, value: t.kilos }));
  const rows = sorted.map(([lote, t]) => [lote, formatNumber(t.kilos), t.viajes.toString(), formatPercent(t.kilos, totalKilos)]);

  return {
    title: "COSECHA - RESUMEN POR LOTE",
    headers: ["Lote", "Kilos Total", "Viajes Total", "%"],
    rows,
    footers: [["TOTAL", formatNumber(totalKilos), totalViajes.toString(), "100%"]],
    alignRight: [1, 2, 3],
    pieChart,
  };
}

export function prepareCosechaOrdenadoPorDestino(data: any[]): HtmlReportData {
  const sortedData = [...data].sort((a, b) => (a.destino || "").localeCompare(b.destino || ""));
  const rows: string[][] = [];
  let totalKilos = 0;
  let totalViajes = 0;

  for (const row of sortedData) {
    const kilos = toNum(row.kilos);
    const viajes = toNum(row.viajes);
    totalKilos += kilos;
    totalViajes += viajes;
    rows.push([formatDate(row.fecha), row.destino || "", row.lote || "", row.tablon || "", formatNumber(kilos), viajes.toString()]);
  }

  return {
    title: "COSECHA - POR DESTINO",
    headers: ["Fecha", "Destino", "Lote", "Tablón", "Kilos", "Viajes"],
    rows,
    footers: [["TOTAL", "", "", "", formatNumber(totalKilos), totalViajes.toString()]],
    alignRight: [4, 5],
  };
}

export function prepareCosechaResumidoPorDestino(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].kilos - a[1].kilos);
  const pieChart: PieChartItem[] = sorted.map(([destino, t]) => ({ label: destino, value: t.kilos }));
  const rows = sorted.map(([destino, t]) => [destino, formatNumber(t.kilos), t.viajes.toString(), formatPercent(t.kilos, totalKilos)]);

  return {
    title: "COSECHA - RESUMEN POR DESTINO",
    headers: ["Destino", "Kilos Total", "Viajes Total", "%"],
    rows,
    footers: [["TOTAL", formatNumber(totalKilos), totalViajes.toString(), "100%"]],
    alignRight: [1, 2, 3],
    pieChart,
  };
}

export function prepareCxpCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.proveedor || "", row.actividad || "",
    ]);
  }

  return {
    title: "CUENTAS POR PAGAR - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Proveedor", "Actividad"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", ""]],
    alignRight: [2, 3],
  };
}

export function prepareCxpOrdenadoPorActividad(data: any[]): HtmlReportData {
  const sorted = [...data].sort((a, b) => (a.actividad || "").localeCompare(b.actividad || ""));
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sorted) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      row.actividad || "", formatDate(row.fecha), row.descripcion || "",
      formatNumber(monto), formatNumber(montoDolares), row.proveedor || "",
    ]);
  }

  return {
    title: "CUENTAS POR PAGAR - ORDENADO POR ACTIVIDAD",
    headers: ["Actividad", "Fecha", "Descripción", "Monto Bs", "Monto $", "Proveedor"],
    rows,
    footers: [["TOTAL", "", "", formatNumber(totalMonto), formatNumber(totalDolares), ""]],
    alignRight: [3, 4],
  };
}

export function prepareCxpResumidoPorActividad(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([actividad, t]) => ({ label: actividad, value: t.monto }));
  const rows = sorted.map(([actividad, t]) => [actividad, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "CUENTAS POR PAGAR - RESUMIDO POR ACTIVIDAD",
    headers: ["Actividad", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareCxpOrdenadoPorProveedor(data: any[]): HtmlReportData {
  const sorted = [...data].sort((a, b) => (a.proveedor || "").localeCompare(b.proveedor || ""));
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sorted) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      row.proveedor || "", formatDate(row.fecha), row.descripcion || "",
      formatNumber(monto), formatNumber(montoDolares), row.actividad || "",
    ]);
  }

  return {
    title: "CUENTAS POR PAGAR - ORDENADO POR PROVEEDOR",
    headers: ["Proveedor", "Fecha", "Descripción", "Monto Bs", "Monto $", "Actividad"],
    rows,
    footers: [["TOTAL", "", "", formatNumber(totalMonto), formatNumber(totalDolares), ""]],
    alignRight: [3, 4],
  };
}

export function prepareCxpResumidoPorProveedor(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([proveedor, t]) => ({ label: proveedor, value: t.monto }));
  const rows = sorted.map(([proveedor, t]) => [proveedor, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "CUENTAS POR PAGAR - RESUMIDO POR PROVEEDOR",
    headers: ["Proveedor", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function prepareCxcCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.cliente || "", row.producto || "",
    ]);
  }

  return {
    title: "CUENTAS POR COBRAR - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Cliente", "Producto"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", ""]],
    alignRight: [2, 3],
  };
}

export function prepareCxcOrdenadoPorCliente(data: any[]): HtmlReportData {
  const sorted = [...data].sort((a, b) => (a.cliente || "").localeCompare(b.cliente || ""));
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sorted) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([row.cliente || "", formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares)]);
  }

  return {
    title: "CUENTAS POR COBRAR - ORDENADO POR CLIENTE",
    headers: ["Cliente", "Fecha", "Descripción", "Monto Bs", "Monto $"],
    rows,
    footers: [["TOTAL", "", "", formatNumber(totalMonto), formatNumber(totalDolares)]],
    alignRight: [3, 4],
  };
}

export function prepareCxcResumidoPorCliente(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([cliente, t]) => ({ label: cliente, value: t.monto }));
  const rows = sorted.map(([cliente, t]) => [cliente, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "CUENTAS POR COBRAR - RESUMIDO POR CLIENTE",
    headers: ["Cliente", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}

export function preparePrestamosCompleto(data: any[]): HtmlReportData {
  const sortedData = sortByDate(data);
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sortedData) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      formatDate(row.fecha), row.descripcion || "", formatNumber(monto), formatNumber(montoDolares),
      row.personal || "", row.comprobante || "",
    ]);
  }

  return {
    title: "PRÉSTAMOS - COMPLETO",
    headers: ["Fecha", "Descripción", "Monto Bs", "Monto $", "Personal", "Comprobante"],
    rows,
    footers: [["TOTAL", "", formatNumber(totalMonto), formatNumber(totalDolares), "", ""]],
    alignRight: [2, 3],
  };
}

export function preparePrestamosOrdenadoPorPersonal(data: any[]): HtmlReportData {
  const sorted = [...data].sort((a, b) => (a.personal || "").localeCompare(b.personal || ""));
  const rows: string[][] = [];
  let totalMonto = 0;
  let totalDolares = 0;

  for (const row of sorted) {
    const monto = toNum(row.monto);
    const montoDolares = toNum(row.montodolares);
    totalMonto += monto;
    totalDolares += montoDolares;
    rows.push([
      row.personal || "", formatDate(row.fecha), row.descripcion || "",
      formatNumber(monto), formatNumber(montoDolares), row.comprobante || "",
    ]);
  }

  return {
    title: "PRÉSTAMOS - ORDENADO POR PERSONAL",
    headers: ["Personal", "Fecha", "Descripción", "Monto Bs", "Monto $", "Comprobante"],
    rows,
    footers: [["TOTAL", "", "", formatNumber(totalMonto), formatNumber(totalDolares), ""]],
    alignRight: [3, 4],
  };
}

export function preparePrestamosResumidoPorPersonal(data: any[]): HtmlReportData {
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

  const sorted = Object.entries(grouped).sort((a, b) => b[1].monto - a[1].monto);
  const pieChart: PieChartItem[] = sorted.map(([personal, t]) => ({ label: personal, value: t.monto }));
  const rows = sorted.map(([personal, t]) => [personal, t.count.toString(), formatNumber(t.monto), formatNumber(t.montodolares), formatPercent(t.monto, totalMonto)]);

  return {
    title: "PRÉSTAMOS - RESUMIDO POR PERSONAL",
    headers: ["Personal", "Registros", "Monto Bs", "Monto $", "%"],
    rows,
    footers: [["TOTAL", data.length.toString(), formatNumber(totalMonto), formatNumber(totalDolares), "100%"]],
    alignRight: [1, 2, 3, 4],
    pieChart,
  };
}
