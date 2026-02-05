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
  const parts = str.split("/");
  if (parts.length === 3) {
    const [dia, mes, anio] = parts;
    const anioCompleto = anio.length === 2 ? (parseInt(anio) > 50 ? `19${anio}` : `20${anio}`) : anio;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anioCompleto}`;
  }
  return "";
}

function parseTextFile(content: string): ParsedRecord[] {
  const lines = content.split("\n").filter(line => line.trim().length > 0);
  const records: ParsedRecord[] = [];
  
  for (const line of lines) {
    if (line.includes("Fecha") && line.includes("Referencia")) continue;
    if (line.trim().length < 50) continue;
    
    const fechaMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
    if (!fechaMatch) continue;
    
    const fechaRaw = fechaMatch[1];
    const fecha = parseFechaTexto(fechaRaw);
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) continue;
    
    const restOfLine = line.substring(11).trim();
    
    const comprobanteMatch = restOfLine.match(/^(\d+)/);
    if (!comprobanteMatch) continue;
    const comprobante = comprobanteMatch[1];
    
    const afterComprobante = restOfLine.substring(comprobante.length).trim();
    
    const montoSaldoMatch = afterComprobante.match(/([+\-]?[\d.,\s]+)\s+([\d.,]+)\s*$/);
    if (!montoSaldoMatch) continue;
    
    const montoRaw = montoSaldoMatch[1].trim();
    const saldoRaw = montoSaldoMatch[2].trim();
    
    const descripcionEnd = afterComprobante.lastIndexOf(montoSaldoMatch[0]);
    const descripcion = afterComprobante.substring(0, descripcionEnd).trim();
    
    const { monto, esPositivo } = parseMontoTexto(montoRaw);
    const { monto: saldo } = parseMontoTexto(saldoRaw);
    
    if (comprobante && monto > 0) {
      const operador = esPositivo ? "suma" : "resta";
      const hashData = `${fecha}|${monto.toFixed(2)}|${operador}`;
      const hash = simpleHashTxt(hashData);
      const comprobanteConHash = `${comprobante}-${hash}`;
      
      records.push({
        fecha,
        comprobante: comprobanteConHash,
        descripcion,
        monto,
        saldo,
        operador,
      });
    }
  }
  
  return records;
}

function simpleHashTxt(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padStart(4, "0");
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

function parseSemicolonCSV(content: string): ParsedRecord[] {
  const lines = content.split("\n").filter(line => line.trim().length > 0);
  const records: ParsedRecord[] = [];
  
  for (const line of lines) {
    const parts = line.split(";");
    if (parts.length < 7) continue;
    
    const fechaRaw = parts[1]?.trim() || "";
    const descripcion = parts[3]?.trim() || "";
    const referencia = parts[4]?.trim() || "";
    const montoRaw = parts[5]?.trim() || "";
    const saldoRaw = parts[6]?.trim() || "";
    
    const fecha = parseFechaTexto(fechaRaw);
    if (!fecha || !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) continue;
    
    const { monto, esPositivo } = parseMontoTexto(montoRaw);
    const { monto: saldo } = parseMontoTexto(saldoRaw);
    
    if (monto > 0) {
      const operador = esPositivo ? "suma" : "resta";
      const hashData = `${fecha}|${monto.toFixed(2)}|${operador}`;
      const hash = simpleHash(hashData);
      const comprobante = referencia ? `${referencia}-${hash}` : `CSV-${hash}`;
      
      records.push({
        fecha,
        comprobante,
        descripcion,
        monto,
        saldo,
        operador,
      });
    }
  }
  
  return records;
}

function detectSemicolonCSV(content: string): boolean {
  const lines = content.split("\n").filter(line => line.trim().length > 0);
  if (lines.length === 0) return false;
  
  const firstLine = lines[0];
  const parts = firstLine.split(";");
  if (parts.length >= 7) {
    const possibleDate = parts[1]?.trim() || "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(possibleDate)) {
      return true;
    }
  }
  return false;
}

function isValidMultiLineBlock(lines: string[], startIndex: number): boolean {
  if (startIndex + 5 >= lines.length) return false;
  
  const fechaLine = lines[startIndex];
  const referenciaLine = lines[startIndex + 1];
  const descripcionLine = lines[startIndex + 2];
  const tipoLine = lines[startIndex + 3]?.toUpperCase() || "";
  const montoLine = lines[startIndex + 4];
  const saldoLine = lines[startIndex + 5];
  
  const fechaMatch = /^\d{2}-\d{2}-\d{4}\s*-\s*\d{2}:\d{2}$/.test(fechaLine);
  const referenciaMatch = /^\d{5,}$/.test(referenciaLine);
  const descripcionMatch = descripcionLine.length > 0 && !/^\d+([.,]\d+)?$/.test(descripcionLine);
  const tipoMatch = tipoLine === "CREDITO" || tipoLine === "DEBITO";
  const montoMatch = /^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(montoLine) || /^\d+,\d{2}$/.test(montoLine);
  const saldoMatch = /^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(saldoLine) || /^\d+,\d{2}$/.test(saldoLine);
  
  return fechaMatch && referenciaMatch && descripcionMatch && tipoMatch && montoMatch && saldoMatch;
}

function parseMultiLineText(content: string): ParsedRecord[] {
  const lines = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  const records: ParsedRecord[] = [];
  
  let i = 0;
  while (i + 5 < lines.length) {
    if (!isValidMultiLineBlock(lines, i)) {
      i++;
      continue;
    }
    
    const fechaLine = lines[i];
    const referenciaLine = lines[i + 1];
    const descripcionLine = lines[i + 2];
    const tipoLine = lines[i + 3];
    const montoLine = lines[i + 4];
    const saldoLine = lines[i + 5];
    
    const fechaMatch = fechaLine.match(/^(\d{2})-(\d{2})-(\d{4})\s*-\s*\d{2}:\d{2}$/);
    if (!fechaMatch) {
      i++;
      continue;
    }
    
    const fecha = `${fechaMatch[1]}/${fechaMatch[2]}/${fechaMatch[3]}`;
    const referencia = referenciaLine;
    const descripcion = descripcionLine;
    const tipo = tipoLine.toUpperCase();
    const { monto } = parseMontoTexto(montoLine);
    const { monto: saldo } = parseMontoTexto(saldoLine);
    
    if (monto > 0) {
      const esPositivo = tipo === "CREDITO";
      const operador = esPositivo ? "suma" : "resta";
      const hashData = `${fecha}|${monto.toFixed(2)}|${operador}`;
      const hash = simpleHash(hashData);
      const comprobante = referencia ? `${referencia}-${hash}` : `ML-${hash}`;
      
      records.push({
        fecha,
        comprobante,
        descripcion,
        monto,
        saldo,
        operador,
      });
    }
    
    i += 6;
  }
  
  return records;
}

function detectMultiLineText(content: string): boolean {
  const lines = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 6) return false;
  
  const maxScan = Math.min(50, lines.length - 6);
  for (let i = 0; i <= maxScan; i++) {
    if (isValidMultiLineBlock(lines, i)) {
      return true;
    }
  }
  return false;
}

function parseHtmlExcelFile(content: string): { records: ParsedRecord[]; error?: string } {
  const records: ParsedRecord[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const rows = doc.querySelectorAll("tr");
  
  if (rows.length === 0) {
    return { records: [], error: "No se encontró tabla en el archivo" };
  }
  
  let columnMap: { [key: string]: number } = {};
  let headerFound = false;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll("td, th");
    if (cells.length < 3) continue;
    
    if (!headerFound) {
      for (let j = 0; j < cells.length; j++) {
        const text = cells[j]?.textContent?.toLowerCase().trim() || "";
        if (text.includes("fecha")) columnMap["fecha"] = j;
        else if (text.includes("referencia") || text.includes("comprobante") || text.includes("ref")) columnMap["referencia"] = j;
        else if (text.includes("descripci") || text.includes("concepto") || text.includes("detalle")) columnMap["descripcion"] = j;
        else if (text === "débito" || text === "debito" || text.includes("d\u00e9bito")) columnMap["debito"] = j;
        else if (text === "crédito" || text === "credito" || text.includes("cr\u00e9dito")) columnMap["credito"] = j;
        else if (text.includes("monto") || text.includes("importe")) {
          if (columnMap["monto"] === undefined) columnMap["monto"] = j;
        }
        else if (text.includes("saldo") || text.includes("balance")) columnMap["saldo"] = j;
      }
      
      if (columnMap["fecha"] !== undefined) {
        headerFound = true;
        const hasMontoOrDebitCredit = columnMap["monto"] !== undefined || 
          (columnMap["debito"] !== undefined && columnMap["credito"] !== undefined);
        if (!hasMontoOrDebitCredit || columnMap["saldo"] === undefined) {
          return { records: [], error: "Columnas requeridas no encontradas: fecha, monto/débito-crédito, saldo" };
        }
        continue;
      }
    }
    
    if (!headerFound) continue;
    
    const fechaIdx = columnMap["fecha"];
    const refIdx = columnMap["referencia"];
    const descIdx = columnMap["descripcion"];
    const montoIdx = columnMap["monto"];
    const debitoIdx = columnMap["debito"];
    const creditoIdx = columnMap["credito"];
    const saldoIdx = columnMap["saldo"];
    
    const hasMontoColumn = montoIdx !== undefined;
    const hasDebitoCreditoColumns = debitoIdx !== undefined && creditoIdx !== undefined;
    
    if (fechaIdx === undefined || (!hasMontoColumn && !hasDebitoCreditoColumns)) continue;
    
    const fechaText = cells[fechaIdx]?.textContent?.trim() || "";
    let referencia = refIdx !== undefined ? (cells[refIdx]?.textContent?.trim() || "") : "";
    if (referencia.startsWith("'")) referencia = referencia.substring(1);
    const descripcion = descIdx !== undefined ? (cells[descIdx]?.textContent?.trim() || "") : "";
    const saldoText = saldoIdx !== undefined ? (cells[saldoIdx]?.textContent?.trim() || "") : "0";
    
    const fechaMatch4 = fechaText.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
    const fechaMatch2 = fechaText.match(/(\d{2})[\/-](\d{2})[\/-](\d{2})/);
    
    let fecha: string | null = null;
    if (fechaMatch4) {
      const fechaNormalized = `${fechaMatch4[1]}/${fechaMatch4[2]}/${fechaMatch4[3]}`;
      fecha = parseFechaTexto(fechaNormalized);
    } else if (fechaMatch2) {
      const fechaNormalized = `${fechaMatch2[1]}/${fechaMatch2[2]}/20${fechaMatch2[3]}`;
      fecha = parseFechaTexto(fechaNormalized);
    }
    if (!fecha) continue;
    
    let monto = 0;
    let esPositivo = true;
    
    if (hasDebitoCreditoColumns) {
      const debitoText = cells[debitoIdx]?.textContent?.trim() || "0";
      const creditoText = cells[creditoIdx]?.textContent?.trim() || "0";
      const { monto: debitoMonto } = parseMontoTexto(debitoText);
      const { monto: creditoMonto } = parseMontoTexto(creditoText);
      
      if (creditoMonto > 0) {
        monto = creditoMonto;
        esPositivo = true;
      } else if (debitoMonto > 0) {
        monto = debitoMonto;
        esPositivo = false;
      }
    } else {
      const montoText = cells[montoIdx]?.textContent?.trim() || "";
      const parsed = parseMontoTexto(montoText);
      monto = parsed.monto;
      esPositivo = parsed.esPositivo;
    }
    
    const { monto: saldo } = parseMontoTexto(saldoText);
    
    if (monto > 0) {
      const operador = esPositivo ? "suma" : "resta";
      const hashData = `${fecha}|${monto.toFixed(2)}|${operador}`;
      const hash = simpleHash(hashData);
      const comprobante = referencia ? `${referencia}-${hash}` : `XLS-${hash}`;
      
      records.push({
        fecha,
        comprobante,
        descripcion,
        monto,
        saldo,
        operador,
      });
    }
  }
  
  if (!headerFound) {
    return { records: [], error: "No se encontró fila de encabezados con columna 'Fecha'" };
  }
  
  return { records };
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
      const text = await file.text();
      const isExcelHtml = file.name.toLowerCase().endsWith(".xls") || 
                          text.includes("<html") || 
                          text.includes("<table");
      const isSemicolonCSV = detectSemicolonCSV(text);
      const isMultiLine = detectMultiLineText(text);
      
      let records: ParsedRecord[];
      if (isExcelHtml) {
        const result = parseHtmlExcelFile(text);
        if (result.error) {
          toast({
            title: "Error en formato",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
        records = result.records;
      } else if (isSemicolonCSV) {
        records = parseSemicolonCSV(text);
      } else if (isMultiLine) {
        records = parseMultiLineText(text);
      } else {
        records = parseTextFile(text);
      }
      
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
            <Upload className="h-5 w-5 text-cyan-600" />
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
                accept=".txt,.csv,.xls"
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
                  <span className="flex items-center gap-1 text-green-600" data-testid="text-import-success">
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
                        <td className={`px-2 py-1 text-center font-medium ${record.operador === "suma" ? "text-green-600" : "text-red-600"}`} data-testid={`text-import-operacion-${idx}`}>
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
