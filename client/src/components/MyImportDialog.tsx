import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useParametrosOptions } from "@/hooks/useParametrosOptions";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";
import * as XLSX from "xlsx";

interface ParsedRecord {
  fecha: string;
  comprobante: string;
  descripcion: string;
  monto: number;
  saldo: number;
  operador: "suma" | "resta";
}

interface MyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBanco?: string;
  username?: string;
  onImportComplete: (result: { imported: number; duplicates: number }) => void;
}

function parseMontoTexto(value: string, formatoAmericano = false): { monto: number; esPositivo: boolean } {
  if (!value) return { monto: 0, esPositivo: true };
  
  let str = value.trim();
  let esPositivo = true;
  if (/^\(.*\)$/.test(str)) {
    esPositivo = false;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith("-")) {
    esPositivo = false;
  }
  let cleaned: string;
  if (formatoAmericano) {
    cleaned = str.replace(/[+\-\s]/g, "").replace(/,/g, "");
  } else {
    cleaned = str.replace(/[+\-\s]/g, "").replace(/\./g, "").replace(",", ".");
  }
  const rawValue = parseFloat(cleaned) || 0;
  return { monto: Math.abs(rawValue), esPositivo };
}

function detectarFormatoAmericano(rows: any[][], columnMap: { [key: string]: number }, startIdx: number): boolean {
  const numCols: number[] = [];
  if (columnMap["monto"] !== undefined) numCols.push(columnMap["monto"]);
  if (columnMap["saldo"] !== undefined) numCols.push(columnMap["saldo"]);
  if (columnMap["debito"] !== undefined) numCols.push(columnMap["debito"]);
  if (columnMap["credito"] !== undefined) numCols.push(columnMap["credito"]);
  if (numCols.length === 0) return false;

  let americanCount = 0;
  let europeanCount = 0;
  const limit = Math.min(startIdx + 30, rows.length);

  for (let i = startIdx; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    for (const col of numCols) {
      const val = String(row[col] || "").trim();
      if (/\d,\d{3}(\.\d+)?$/.test(val)) americanCount++;
      if (/\d\.\d{3}(,\d+)?$/.test(val)) europeanCount++;
    }
  }

  console.log("[PARSER] Format detection - American:", americanCount, "European:", europeanCount);
  return americanCount > europeanCount;
}

function detectarFormatoFechaMesDia(rows: any[][], fechaCol: number, startIdx: number): boolean {
  let maxA = 0;
  let maxB = 0;
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const val = String(row[fechaCol] || "").trim();
    const separators = ["/", ".", "-"];
    for (const sep of separators) {
      const parts = val.split(sep);
      if (parts.length === 3) {
        let [a, , c] = parts.map(p => p.trim());
        let b = parts[1].trim();
        if (a.length === 4) { const tmp = a; a = c; c = tmp; }
        const na = parseInt(a);
        const nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) {
          if (na > maxA) maxA = na;
          if (nb > maxB) maxB = nb;
        }
        break;
      }
    }
  }
  if (maxB > 12 && maxA <= 12) return true;
  return false;
}

const MESES_ESPANOL: { [key: string]: string } = {
  "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
  "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
  "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
};

function parseFechaTexto(value: string, esMesDia: boolean = false): string {
  if (!value) return "";
  const str = value.trim();

  const matchTexto = str.match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})$/i);
  if (matchTexto) {
    const dia = matchTexto[1].padStart(2, "0");
    const mes = MESES_ESPANOL[matchTexto[2].toLowerCase()];
    if (mes) return `${dia}/${mes}/${matchTexto[3]}`;
  }

  const separators = ["/", ".", "-"];
  for (const sep of separators) {
    const parts = str.split(sep);
    if (parts.length === 3) {
      let [a, b, c] = parts.map(p => p.trim());
      if (a.length === 4) {
        const temp = a; a = c; c = temp;
      }
      if (esMesDia) {
        const temp = a; a = b; b = temp;
      }
      const anioCompleto = c.length === 2 ? (parseInt(c) > 50 ? `19${c}` : `20${c}`) : c;
      if (anioCompleto.length === 4 && !isNaN(Number(a)) && !isNaN(Number(b))) {
        return `${a.padStart(2, "0")}/${b.padStart(2, "0")}/${anioCompleto}`;
      }
    }
  }

  return "";
}

function expandSheetRange(sheet: any): void {
  const cellKeys = Object.keys(sheet).filter(k => !k.startsWith("!"));
  if (cellKeys.length === 0) return;
  let maxRow = 0;
  let maxCol = 0;
  let minRow = Infinity;
  let minCol = Infinity;
  for (const key of cellKeys) {
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const col = match[1].split("").reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
    const row = parseInt(match[2]);
    if (row > maxRow) maxRow = row;
    if (row < minRow) minRow = row;
    if (col > maxCol) maxCol = col;
    if (col < minCol) minCol = col;
  }
  const colToLetter = (n: number): string => {
    let s = "";
    while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s;
  };
  const newRef = `${colToLetter(minCol)}${minRow}:${colToLetter(maxCol)}${maxRow}`;
  if (sheet["!ref"] !== newRef) {
    console.log("[PARSER] Expanding sheet range from", sheet["!ref"], "to", newRef);
    sheet["!ref"] = newRef;
  }
}

function formatComprobanteBanco(referencia: string, banco: string): string | null {
  const soloDigitos = referencia.replace(/\D/g, "");
  if (!soloDigitos) return null;
  const ultimos6 = soloDigitos.slice(-6).padStart(6, "0");
  return `${ultimos6}-${banco}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
}

function parseHtmlToRows(html: string): string[][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");
  const allRows: string[][] = [];

  tables.forEach(table => {
    const trs = table.querySelectorAll("tr");
    trs.forEach(tr => {
      const cells = tr.querySelectorAll("td, th");
      const row: string[] = [];
      cells.forEach(cell => {
        const text = (cell.textContent || "").replace(/\u00a0/g, " ").trim();
        row.push(text);
      });
      const nonEmpty = row.filter(c => c.length > 0);
      if (nonEmpty.length >= 2) {
        allRows.push(row);
      }
    });
  });

  return allRows;
}

function detectarYParsearFilas(rows: any[][], banco: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const usedComprobantes = new Set<string>();

  const esFecha = (t: string) => t.includes("fecha") || t.includes("date") || t.includes("data");
  const esDescripcion = (t: string) => t.includes("descripci") || t.includes("concepto") || t.includes("detalle") || t.includes("motivo") || t.includes("descrizione") || t.includes("description") || t.includes("reason");
  const esReferencia = (t: string) => t.includes("referencia") || t.includes("n° operaci") || t.includes("nro") || t.includes("número") || t.includes("transacci") || t.includes("ref") || t.includes("comprobante");
  const esDebito = (t: string) => t === "débito" || t === "debito" || t === "debe" || t.includes("débito") || t.includes("debito") || t.includes("cargo");
  const esCredito = (t: string) => t === "crédito" || t === "credito" || t === "haber" || t.includes("crédito") || t.includes("credito") || t.includes("abono");
  const esMonto = (t: string) => t.includes("monto") || t.includes("importe") || t.includes("valor") || t.includes("amount") || t.includes("importo");
  const esSaldo = (t: string) => t.includes("saldo") || t.includes("balance") || t.includes("disponible");
  const esTipoMov = (t: string) => t.includes("tipo de movimiento") || t.includes("tipo movimiento") || t.includes("tipo_movimiento");

  let columnMap: { [key: string]: number } = {};
  let headerRowIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const texts = row.map((c: any) => String(c || "").toLowerCase().trim());
    if (texts.some(esFecha)) {
      const candidateMap: { [key: string]: number } = {};
      texts.forEach((text: string, j: number) => {
        if (esFecha(text) && candidateMap["fecha"] === undefined) candidateMap["fecha"] = j;
        else if (esDebito(text) && candidateMap["debito"] === undefined) candidateMap["debito"] = j;
        else if (esCredito(text) && candidateMap["credito"] === undefined) candidateMap["credito"] = j;
        else if (esSaldo(text) && candidateMap["saldo"] === undefined) candidateMap["saldo"] = j;
        else if (esDescripcion(text) && candidateMap["descripcion"] === undefined) candidateMap["descripcion"] = j;
        else if (esReferencia(text) && candidateMap["referencia"] === undefined) candidateMap["referencia"] = j;
        else if (esMonto(text) && candidateMap["monto"] === undefined) candidateMap["monto"] = j;
        else if (esTipoMov(text) && candidateMap["tipomov"] === undefined) candidateMap["tipomov"] = j;
      });
      const hasFinancialCol = candidateMap["debito"] !== undefined || candidateMap["credito"] !== undefined || candidateMap["monto"] !== undefined || candidateMap["saldo"] !== undefined;
      if (candidateMap["fecha"] !== undefined && hasFinancialCol) {
        columnMap = candidateMap;
        headerRowIdx = i;
        console.log("[PARSER] Header found at row", i, "texts:", texts.filter(t => t));
        break;
      }
    }
  }

  console.log("[PARSER] Header row:", headerRowIdx, "Column map:", columnMap);

  const looksLikeDate = (v: string) => /\d{1,4}[\/.\\-]\d{1,2}[\/.\\-]\d{1,4}/.test(v);
  const looksLikeNumber = (v: string) => {
    const cleaned = v.replace(/[+\-\s.]/g, "").replace(",", ".");
    return !isNaN(Number(cleaned)) && cleaned.length > 0;
  };

  if (headerRowIdx === -1) {
    console.log("[PARSER] No header found, attempting content-based detection");
    const sampleRows = rows.slice(0, Math.min(20, rows.length));
    const maxCols = Math.max(...sampleRows.map(r => r.length));

    const colDateScore: number[] = new Array(maxCols).fill(0);
    const colNumScore: number[] = new Array(maxCols).fill(0);

    for (const row of sampleRows) {
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || "").trim();
        if (looksLikeDate(val)) colDateScore[j]++;
        if (looksLikeNumber(val)) colNumScore[j]++;
      }
    }

    let fechaCol = -1;
    let maxDateScore = 0;
    colDateScore.forEach((score, idx) => {
      if (score > maxDateScore) { maxDateScore = score; fechaCol = idx; }
    });

    if (fechaCol >= 0) {
      columnMap["fecha"] = fechaCol;
      const numCols = colNumScore.map((score, idx) => ({ idx, score }))
        .filter(c => c.idx !== fechaCol && c.score > 0)
        .sort((a, b) => b.score - a.score);

      const colHasDecimals: boolean[] = new Array(maxCols).fill(false);
      const colHasNegatives: boolean[] = new Array(maxCols).fill(false);
      for (const row of sampleRows) {
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || "").trim();
          if (val.startsWith("-")) colHasNegatives[j] = true;
          if (/[.,]\d{1,2}$/.test(val) || /\d[.,]\d{3}/.test(val)) colHasDecimals[j] = true;
        }
      }

      const integerOnlyCols = numCols.filter(c => !colHasDecimals[c.idx]);
      const decimalCols = numCols.filter(c => colHasDecimals[c.idx]);

      if (integerOnlyCols.length > 0 && decimalCols.length >= 1) {
        const colAvgLen: { idx: number; avgLen: number }[] = integerOnlyCols.map(c => {
          let totalLen = 0;
          let count = 0;
          for (const row of sampleRows) {
            const val = String(row[c.idx] || "").trim();
            if (val && /^\d+$/.test(val)) { totalLen += val.length; count++; }
          }
          return { idx: c.idx, avgLen: count > 0 ? totalLen / count : 0 };
        });
        colAvgLen.sort((a, b) => b.avgLen - a.avgLen);
        columnMap["referencia"] = colAvgLen[0].idx;
        const amountCols = decimalCols;

        const signedCol = amountCols.find(c => colHasNegatives[c.idx]);
        if (signedCol) {
          columnMap["monto"] = signedCol.idx;
          const remaining = amountCols.filter(c => c.idx !== signedCol.idx);
          if (remaining.length > 0) columnMap["saldo"] = remaining[0].idx;
        } else {
          const colPartialFill: number[] = new Array(maxCols).fill(0);
          for (const row of sampleRows) {
            for (let j = 0; j < row.length; j++) {
              const val = String(row[j] || "").trim();
              if (val && looksLikeNumber(val)) colPartialFill[j]++;
            }
          }
          const totalDataRows = sampleRows.length;
          const partialCols = amountCols.filter(c => colPartialFill[c.idx] < totalDataRows * 0.8 && colPartialFill[c.idx] > 0);

          if (partialCols.length >= 2) {
            columnMap["debito"] = partialCols[0].idx;
            columnMap["credito"] = partialCols[1].idx;
            const saldoCol = amountCols.find(c => c.idx !== partialCols[0].idx && c.idx !== partialCols[1].idx);
            if (saldoCol) columnMap["saldo"] = saldoCol.idx;
          } else if (amountCols.length >= 2) {
            columnMap["monto"] = amountCols[0].idx;
            columnMap["saldo"] = amountCols[1].idx;
          } else if (amountCols.length === 1) {
            columnMap["monto"] = amountCols[0].idx;
          }
        }
      } else if (numCols.length >= 3) {
        const signedCol = numCols.find(c => colHasNegatives[c.idx]);
        if (signedCol) {
          columnMap["monto"] = signedCol.idx;
          const remaining = numCols.filter(c => c.idx !== signedCol.idx);
          if (remaining.length > 0) columnMap["saldo"] = remaining[0].idx;
        } else {
          const colPartialFill: number[] = new Array(maxCols).fill(0);
          for (const row of sampleRows) {
            for (let j = 0; j < row.length; j++) {
              const val = String(row[j] || "").trim();
              if (val && looksLikeNumber(val)) colPartialFill[j]++;
            }
          }
          const totalDataRows = sampleRows.length;
          const partialCols = numCols.filter(c => colPartialFill[c.idx] < totalDataRows * 0.8 && colPartialFill[c.idx] > 0);

          if (partialCols.length >= 2) {
            columnMap["debito"] = partialCols[0].idx;
            columnMap["credito"] = partialCols[1].idx;
            const saldoCol = numCols.find(c => c.idx !== partialCols[0].idx && c.idx !== partialCols[1].idx);
            if (saldoCol) columnMap["saldo"] = saldoCol.idx;
          } else {
            columnMap["monto"] = numCols[0].idx;
            columnMap["saldo"] = numCols[1].idx;
          }
        }
      } else if (numCols.length >= 2) {
        columnMap["monto"] = numCols[0].idx;
        columnMap["saldo"] = numCols[1].idx;
      } else if (numCols.length === 1) {
        columnMap["monto"] = numCols[0].idx;
      }

      const colTextScore: number[] = new Array(maxCols).fill(0);
      const colUniqueTexts: Set<string>[] = Array.from({ length: maxCols }, () => new Set());
      for (const row of sampleRows) {
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || "").trim();
          if (val.length > 1 && !looksLikeNumber(val) && !looksLikeDate(val)) {
            colTextScore[j]++;
            colUniqueTexts[j].add(val);
          }
        }
      }
      let bestDescCol = -1;
      let bestDescScore = 0;
      let bestDescVariety = 0;
      for (let j = 0; j < maxCols; j++) {
        if (j === fechaCol || j === columnMap["monto"] || j === columnMap["saldo"] || j === columnMap["debito"] || j === columnMap["credito"] || j === columnMap["referencia"]) continue;
        if (colNumScore[j] === 0 && colTextScore[j] > 0) {
          const variety = colUniqueTexts[j].size;
          if (variety > bestDescVariety || (variety === bestDescVariety && colTextScore[j] > bestDescScore)) {
            bestDescScore = colTextScore[j];
            bestDescVariety = variety;
            bestDescCol = j;
          }
        }
      }
      if (bestDescCol >= 0) columnMap["descripcion"] = bestDescCol;
      if (columnMap["referencia"] === undefined) {
        for (let j = 0; j < maxCols; j++) {
          if (j === fechaCol || j === columnMap["monto"] || j === columnMap["saldo"] || j === columnMap["debito"] || j === columnMap["credito"] || j === columnMap["descripcion"]) continue;
          if (columnMap["referencia"] === undefined) {
            columnMap["referencia"] = j;
          }
        }
      }
      headerRowIdx = -1;
      console.log("[PARSER] Content-based column map:", columnMap);
    }
  }

  if (columnMap["fecha"] === undefined) {
    console.log("[PARSER] Could not detect any date column");
    return records;
  }

  const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const hasDebitCredit = columnMap["debito"] !== undefined || columnMap["credito"] !== undefined;
  const hasMontoCol = columnMap["monto"] !== undefined;
  const esAmericano = detectarFormatoAmericano(rows, columnMap, startIdx);
  const esMesDia = detectarFormatoFechaMesDia(rows, columnMap["fecha"], startIdx);
  console.log("[PARSER] Formato americano:", esAmericano, "Fecha mm/dd:", esMesDia);

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const fechaRaw = String(row[columnMap["fecha"]] || "").trim();
    if (!looksLikeDate(fechaRaw)) continue;

    const fecha = parseFechaTexto(fechaRaw, esMesDia);
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) continue;

    const descripcion = columnMap["descripcion"] !== undefined ? String(row[columnMap["descripcion"]] || "").trim() : "";
    const refText = columnMap["referencia"] !== undefined ? String(row[columnMap["referencia"]] || "").trim() : "";
    const saldoText = columnMap["saldo"] !== undefined ? String(row[columnMap["saldo"]] || "").trim() : "0";

    let monto = 0;
    let operador: "suma" | "resta" = "suma";

    if (hasDebitCredit) {
      const debitoText = columnMap["debito"] !== undefined ? String(row[columnMap["debito"]] || "").trim() : "";
      const creditoText = columnMap["credito"] !== undefined ? String(row[columnMap["credito"]] || "").trim() : "";
      const { monto: debitoMonto } = parseMontoTexto(debitoText, esAmericano);
      const { monto: creditoMonto } = parseMontoTexto(creditoText, esAmericano);

      if (creditoMonto > 0) {
        monto = creditoMonto;
        operador = "suma";
      } else if (debitoMonto > 0) {
        monto = debitoMonto;
        operador = "resta";
      }
    } else if (hasMontoCol) {
      const montoText = String(row[columnMap["monto"]] || "").trim();
      const { monto: montoVal, esPositivo } = parseMontoTexto(montoText, esAmericano);
      monto = montoVal;
      if (columnMap["tipomov"] !== undefined) {
        const tipoText = String(row[columnMap["tipomov"]] || "").toLowerCase().trim();
        operador = tipoText.includes("cr") ? "suma" : "resta";
      } else {
        operador = esPositivo ? "suma" : "resta";
      }
    }

    if (monto > 0) {
      const { monto: saldo } = parseMontoTexto(saldoText, esAmericano);
      let seq = 0;
      let comprobante = "";
      while (true) {
        const seqSuffix = seq > 0 ? `|${seq}` : "";
        const hashData = `${fecha}|${descripcion}|${refText}|${monto.toFixed(2)}|${operador}${seqSuffix}`;
        const hash = simpleHash(hashData);
        const refFormatted = formatComprobanteBanco(refText, banco);
        comprobante = refFormatted ? `${refFormatted.split("-")[0]}-${hash}-${banco}` : `XLS-${hash}-${banco}`;
        if (!usedComprobantes.has(comprobante)) break;
        seq++;
      }
      usedComprobantes.add(comprobante);

      records.push({
        fecha,
        comprobante,
        descripcion: descripcion.toLowerCase(),
        monto,
        saldo,
        operador,
      });
    }
  }

  console.log("[PARSER] Total records parsed:", records.length);
  return records;
}

function parseTextoPlanoRegistros(text: string, banco: string): ParsedRecord[] {
  const records: ParsedRecord[] = [];
  const usedComprobantes = new Set<string>();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const looksLikeDateLine = (l: string) => /^\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}:\d{2}/.test(l);
  const isTipoLine = (l: string) => /^(CREDITO|DEBITO|CR[EÉ]DITO|D[EÉ]BITO)$/i.test(l);
  const isMontoLine = (l: string) => /[\d.,]+\s*(Bs\.?|USD|\$|€)/i.test(l);

  let i = 0;
  while (i < lines.length) {
    if (!looksLikeDateLine(lines[i])) { i++; continue; }
    if (i + 5 >= lines.length) break;

    const fechaLine = lines[i];
    const refLine = lines[i + 1];
    const descLine = lines[i + 2];
    const tipoLine = lines[i + 3];
    const montoLine = lines[i + 4];
    const saldoLine = lines[i + 5];

    if (!isTipoLine(tipoLine)) { i++; continue; }

    const fechaParts = fechaLine.split(/\s+/)[0];
    const fecha = parseFechaTexto(fechaParts);
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) { i++; continue; }

    const montoClean = montoLine.replace(/[A-Za-z$€.]+$/g, "").trim();
    const { monto, esPositivo } = parseMontoTexto(montoClean, false);
    const tipoUpper = tipoLine.toUpperCase().trim();
    const operador: "suma" | "resta" = (tipoUpper === "CREDITO" || tipoUpper === "CRÉDITO") ? "suma" : "resta";

    const saldoClean = saldoLine.replace(/[A-Za-z$€.]+$/g, "").trim();
    const { monto: saldo } = parseMontoTexto(saldoClean, false);

    if (monto > 0) {
      let seq = 0;
      let comprobante = "";
      while (true) {
        const seqSuffix = seq > 0 ? `|${seq}` : "";
        const hashData = `${fecha}|${descLine}|${refLine}|${monto.toFixed(2)}|${operador}${seqSuffix}`;
        const hash = simpleHash(hashData);
        const refFormatted = formatComprobanteBanco(refLine, banco);
        comprobante = refFormatted ? `${refFormatted.split("-")[0]}-${hash}-${banco}` : `XLS-${hash}-${banco}`;
        if (!usedComprobantes.has(comprobante)) break;
        seq++;
      }
      usedComprobantes.add(comprobante);

      records.push({
        fecha,
        comprobante,
        descripcion: descLine.toLowerCase(),
        monto,
        saldo,
        operador,
      });
    }

    i += 6;
  }

  console.log("[PARSER] Texto plano records parsed:", records.length);
  return records;
}

async function parseArchivoBancario(file: File, banco: string): Promise<ParsedRecord[]> {
  const buffer = await file.arrayBuffer();
  let rows: any[][] = [];

  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const textContent = textDecoder.decode(buffer);
  const isHtml = textContent.includes("<table") || textContent.includes("<TABLE") || textContent.includes("<html") || textContent.includes("<HTML");

  if (isHtml) {
    console.log("[PARSER] Detected HTML file");
    rows = parseHtmlToRows(textContent);
  } else {
    const bytes = new Uint8Array(buffer);
    let nonPrintable = 0;
    const checkLen = Math.min(bytes.length, 512);
    for (let i = 0; i < checkLen; i++) {
      if (bytes[i] < 9 || (bytes[i] > 13 && bytes[i] < 32 && bytes[i] !== 27)) nonPrintable++;
    }
    const isBinary = nonPrintable > checkLen * 0.1;

    if (isBinary) {
      console.log("[PARSER] Detected binary XLS/XLSX, using SheetJS");
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      expandSheetRange(sheet);
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
    } else {
      const isXmlSpreadsheet = textContent.includes("<Workbook") || textContent.includes("<workbook");

      if (isXmlSpreadsheet) {
        console.log("[PARSER] Detected XML SpreadsheetML format");
        let fixedXml = textContent.replace(/<xml\s+version="1\.0"\s*>/i, '<?xml version="1.0"?>');
        const workbook = XLSX.read(fixedXml, { type: "string" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        expandSheetRange(sheet);
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
      } else {
        const lines = textContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        const dateLinePattern = /^\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}:\d{2}/;
        const dateLineCount = lines.filter(l => dateLinePattern.test(l)).length;
        const hasTipoLines = lines.some(l => /^(CREDITO|DEBITO|CR[EÉ]DITO|D[EÉ]BITO)$/i.test(l));

        if (dateLineCount >= 2 && hasTipoLines) {
          console.log("[PARSER] Detected plain text bank format (Venezuela/BDV style)");
          return parseTextoPlanoRegistros(textContent, banco);
        }

        console.log("[PARSER] Detected text file, attempting SheetJS");
        const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        expandSheetRange(sheet);
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
      }
    }
  }

  console.log("[PARSER] Total rows extracted:", rows.length, "Method:", isHtml ? "HTML" : "SheetJS/Text");
  if (rows.length > 0) {
    console.log("[PARSER] First row sample:", rows[0]);
    console.log("[PARSER] Second row sample:", rows.length > 1 ? rows[1] : "N/A");
  }

  return detectarYParsearFilas(rows, banco);
}

export function MyImportDialog({ open, onOpenChange, defaultBanco, username, onImportComplete }: MyImportDialogProps) {
  const [selectedBanco, setSelectedBanco] = useState<string>(defaultBanco || "");
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number; duplicatedComprobantes?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";
  
  const bancosOptions = useParametrosOptions("bancos");

  useEffect(() => {
    if (defaultBanco) {
      setSelectedBanco(defaultBanco);
    }
  }, [defaultBanco]);

  useEffect(() => {
    if (open) {
      setParsedRecords([]);
      setFileName("");
      setImportResult(null);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setImportResult(null);
    
    try {
      const records = await parseArchivoBancario(file, selectedBanco);
      
      setParsedRecords(records);
      
      if (records.length === 0) {
        toast({
          title: "Sin registros",
          description: "No se encontraron movimientos bancarios en el archivo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error al leer archivo",
        description: "No se pudo leer el contenido del archivo",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!selectedBanco) {
      toast({
        title: "Seleccione banco",
        description: "Debe seleccionar el banco destino",
        variant: "destructive",
      });
      return;
    }
    
    if (parsedRecords.length === 0) {
      toast({
        title: "Sin registros",
        description: "No hay registros para importar",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);
    
    try {
      const response = await fetch("/api/bancos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banco: selectedBanco,
          records: parsedRecords,
          username: username || "sistema",
        }),
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      if (!response.ok) {
        throw new Error("Error al importar");
      }
      
      const result = await response.json();
      setImportResult(result);
      
      showPop({
        title: "Importación completada",
        message: `${result.success} registros importados, ${result.duplicates} duplicados omitidos.\n\nEs importante chequear saldos.`,
      });
      
      onImportComplete({ imported: result.success, duplicates: result.duplicates });
    } catch (error) {
      clearInterval(progressInterval);
      toast({
        title: "Error",
        description: "Error al importar los registros",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 500);
    }
  };

  const handleClose = () => {
    setParsedRecords([]);
    setFileName("");
    setSelectedBanco(defaultBanco || "");
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className={`max-w-4xl max-h-[85vh] flex flex-col ${windowStyle}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-cyan-800 dark:text-cyan-300" />
            Importar Extracto Bancario
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Banco Destino</label>
              <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                <SelectTrigger data-testid="select-banco-import">
                  <SelectValue placeholder="Seleccionar banco..." />
                </SelectTrigger>
                <SelectContent>
                  {bancosOptions.map((banco) => (
                    <SelectItem key={banco} value={banco}>
                      {banco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Archivo de Extracto</label>
              <input
                type="file"
                accept=".txt,.csv,.xls,.xlsx"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
                data-testid="input-file-import"
              />
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-file"
              >
                <FileText className="h-4 w-4" />
                {fileName || "Seleccionar archivo..."}
              </Button>
            </div>
          </div>
          
          {isImporting && (
            <div className="space-y-2" data-testid="import-progress-container">
              <div className="flex justify-between text-sm">
                <span>Importando registros...</span>
                <span>{Math.round(importProgress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${importProgress}%` }}
                  data-testid="import-progress-bar"
                />
              </div>
            </div>
          )}
          
          {parsedRecords.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-sm font-medium flex items-center justify-between">
                <span data-testid="text-records-count">Vista previa ({parsedRecords.length} registros)</span>
                {importResult && (
                  <span className="flex items-center gap-1 text-green-800 dark:text-green-300" data-testid="text-import-success">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResult.success} importados
                  </span>
                )}
              </div>
              <div className="max-h-[350px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Fecha</th>
                      <th className="px-2 py-1 text-left">Referencia</th>
                      <th className="px-2 py-1 text-left">Descripción</th>
                      <th className="px-2 py-1 text-center">Op</th>
                      <th className="px-2 py-1 text-right">Monto</th>
                      <th className="px-2 py-1 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.map((record, idx) => (
                      <tr key={idx} className="border-t" data-testid={`row-import-record-${idx}`}>
                        <td className="px-2 py-1" data-testid={`text-import-fecha-${idx}`}>{record.fecha}</td>
                        <td className="px-2 py-1 font-mono" data-testid={`text-import-comprobante-${idx}`}>{record.comprobante}</td>
                        <td className="px-2 py-1 truncate max-w-[250px]" title={record.descripcion} data-testid={`text-import-descripcion-${idx}`}>
                          {record.descripcion}
                        </td>
                        <td className={`px-2 py-1 text-center font-medium ${record.operador === "suma" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`} data-testid={`text-import-operacion-${idx}`}>
                          {record.operador === "suma" ? "+" : "-"}
                        </td>
                        <td className="px-2 py-1 text-right font-mono" data-testid={`text-import-monto-${idx}`}>
                          {record.monto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 text-right font-mono" data-testid={`text-import-saldo-${idx}`}>
                          {record.saldo.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {parsedRecords.length === 0 && fileName && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">No se encontraron movimientos bancarios. Formato esperado: Fecha | Referencia | Descripción | Monto | Saldo</span>
            </div>
          )}
          
          {importResult && importResult.duplicatedComprobantes && importResult.duplicatedComprobantes.length > 0 && (
            <div className="border rounded-lg overflow-hidden border-amber-300 dark:border-amber-700" data-testid="section-duplicated-comprobantes">
              <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span data-testid="text-duplicates-count">Comprobantes duplicados ({importResult.duplicatedComprobantes.length})</span>
              </div>
              <div className="max-h-[120px] overflow-auto p-2 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex flex-wrap gap-1">
                  {importResult.duplicatedComprobantes.map((comp, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded text-xs font-mono" data-testid={`text-duplicate-comprobante-${idx}`}>
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
            Cancelar
          </Button>
          <MyButtonStyle
            color="green"
            onClick={handleImport}
            loading={isImporting}
            disabled={!selectedBanco || parsedRecords.length === 0}
            data-testid="button-confirm-import"
          >
            Importar {parsedRecords.length} registros
          </MyButtonStyle>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
