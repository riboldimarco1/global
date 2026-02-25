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

function parseMontoTexto(value: string): { monto: number; esPositivo: boolean } {
  if (!value) return { monto: 0, esPositivo: true };
  
  const str = value.trim();
  const esPositivo = !str.startsWith("-");
  const cleaned = str.replace(/[+\-\s]/g, "").replace(/\./g, "").replace(",", ".");
  const rawValue = parseFloat(cleaned) || 0;
  return { monto: Math.abs(rawValue), esPositivo };
}

function parseFechaTexto(value: string): string {
  if (!value) return "";
  const str = value.trim();

  const separators = ["/", ".", "-"];
  for (const sep of separators) {
    const parts = str.split(sep);
    if (parts.length === 3) {
      let [a, b, c] = parts.map(p => p.trim());
      if (a.length === 4) {
        const temp = a; a = c; c = temp;
      }
      const anioCompleto = c.length === 2 ? (parseInt(c) > 50 ? `19${c}` : `20${c}`) : c;
      if (anioCompleto.length === 4 && !isNaN(Number(a)) && !isNaN(Number(b))) {
        return `${a.padStart(2, "0")}/${b.padStart(2, "0")}/${anioCompleto}`;
      }
    }
  }

  return "";
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

  const esFecha = (t: string) => t.includes("fecha") || t.includes("date") || t.includes("data");
  const esDescripcion = (t: string) => t.includes("descripci") || t.includes("concepto") || t.includes("detalle") || t.includes("motivo") || t.includes("descrizione") || t.includes("description") || t.includes("reason");
  const esReferencia = (t: string) => t.includes("referencia") || t.includes("n° operaci") || t.includes("nro") || t.includes("número") || t.includes("transacci") || t.includes("ref") || t.includes("comprobante");
  const esDebito = (t: string) => t === "débito" || t === "debito" || t.includes("débito") || t.includes("debito") || t.includes("cargo");
  const esCredito = (t: string) => t === "crédito" || t === "credito" || t.includes("crédito") || t.includes("credito") || t.includes("abono");
  const esMonto = (t: string) => t.includes("monto") || t.includes("importe") || t.includes("valor") || t.includes("amount") || t.includes("importo");
  const esSaldo = (t: string) => t.includes("saldo") || t.includes("balance") || t.includes("disponible");

  let columnMap: { [key: string]: number } = {};
  let headerRowIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const texts = row.map((c: any) => String(c || "").toLowerCase().trim());
    if (texts.some(esFecha)) {
      texts.forEach((text: string, j: number) => {
        if (esFecha(text) && columnMap["fecha"] === undefined) columnMap["fecha"] = j;
        else if (esDebito(text) && columnMap["debito"] === undefined) columnMap["debito"] = j;
        else if (esCredito(text) && columnMap["credito"] === undefined) columnMap["credito"] = j;
        else if (esSaldo(text) && columnMap["saldo"] === undefined) columnMap["saldo"] = j;
        else if (esDescripcion(text) && columnMap["descripcion"] === undefined) columnMap["descripcion"] = j;
        else if (esReferencia(text) && columnMap["referencia"] === undefined) columnMap["referencia"] = j;
        else if (esMonto(text) && columnMap["monto"] === undefined) columnMap["monto"] = j;
      });
      if (columnMap["fecha"] !== undefined) {
        headerRowIdx = i;
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

      if (numCols.length >= 3) {
        const colHasNegatives: boolean[] = new Array(maxCols).fill(false);
        for (const row of sampleRows) {
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || "").trim();
            if (val.startsWith("-")) colHasNegatives[j] = true;
          }
        }

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

      for (let j = 0; j < maxCols; j++) {
        if (j === fechaCol || j === columnMap["monto"] || j === columnMap["saldo"] || j === columnMap["debito"] || j === columnMap["credito"]) continue;
        if (colNumScore[j] === 0 && columnMap["descripcion"] === undefined) {
          columnMap["descripcion"] = j;
        }
      }
      for (let j = 0; j < maxCols; j++) {
        if (j === fechaCol || j === columnMap["monto"] || j === columnMap["saldo"] || j === columnMap["debito"] || j === columnMap["credito"] || j === columnMap["descripcion"]) continue;
        if (columnMap["referencia"] === undefined) {
          columnMap["referencia"] = j;
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

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const fechaRaw = String(row[columnMap["fecha"]] || "").trim();
    if (!looksLikeDate(fechaRaw)) continue;

    const fecha = parseFechaTexto(fechaRaw);
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) continue;

    const descripcion = columnMap["descripcion"] !== undefined ? String(row[columnMap["descripcion"]] || "").trim() : "";
    const refText = columnMap["referencia"] !== undefined ? String(row[columnMap["referencia"]] || "").trim() : "";
    const saldoText = columnMap["saldo"] !== undefined ? String(row[columnMap["saldo"]] || "").trim() : "0";

    let monto = 0;
    let operador: "suma" | "resta" = "suma";

    if (hasDebitCredit) {
      const debitoText = columnMap["debito"] !== undefined ? String(row[columnMap["debito"]] || "").trim() : "";
      const creditoText = columnMap["credito"] !== undefined ? String(row[columnMap["credito"]] || "").trim() : "";
      const { monto: debitoMonto } = parseMontoTexto(debitoText);
      const { monto: creditoMonto } = parseMontoTexto(creditoText);

      if (creditoMonto > 0) {
        monto = creditoMonto;
        operador = "suma";
      } else if (debitoMonto > 0) {
        monto = debitoMonto;
        operador = "resta";
      }
    } else if (hasMontoCol) {
      const montoText = String(row[columnMap["monto"]] || "").trim();
      const { monto: montoVal, esPositivo } = parseMontoTexto(montoText);
      monto = montoVal;
      operador = esPositivo ? "suma" : "resta";
    }

    if (monto > 0) {
      const { monto: saldo } = parseMontoTexto(saldoText);
      const hashData = `${fecha}|${monto.toFixed(2)}|${operador}`;
      const hash = simpleHash(hashData);
      const comprobante = refText ? (formatComprobanteBanco(refText, banco) ?? `XLS-${hash}`) : `XLS-${hash}`;

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
    console.log("[PARSER] Detected binary XLS/XLSX, using SheetJS");
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
  }

  console.log("[PARSER] Total rows extracted:", rows.length, "Method:", isHtml ? "HTML" : "SheetJS");
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
