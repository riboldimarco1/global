import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";
import * as XLSX from "xlsx";

interface GridBancosImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedGridRecord {
  fecha: string;
  banco: string;
  comprobante: string;
  operacion: string;
  descripcion: string;
  monto: number;
  montodolares: number;
  saldo: number;
  saldo_conciliado: number;
  conciliado: boolean;
  relacionado: boolean;
  operador: string;
  propietario: string;
}

function inferOperador(operacion: string): string {
  const op = operacion.toLowerCase();
  if (op.includes("credito") || op.includes("crédito")) return "suma";
  if (op.includes("debito") || op.includes("débito")) return "resta";
  if (op.includes("transferencia") && op.includes("tercero")) return "resta";
  if (op.includes("transferencia") && op.includes("propia")) return "suma";
  if (op.includes("deposito") || op.includes("depósito")) return "suma";
  if (op.includes("cheque")) return "resta";
  if (op.includes("comision") || op.includes("comisión")) return "resta";
  if (op.includes("interes") || op.includes("interés")) return "suma";
  return "suma";
}

function parseDateValue(val: any): string {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, a] = parts;
    const year = a.length === 2 ? (parseInt(a) > 50 ? `19${a}` : `20${a}`) : a;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return str;
}

function parseNumeric(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  let str = String(val).replace(/[^\d.,-]/g, "");
  if (!str) return 0;
  const lastDot = str.lastIndexOf(".");
  const lastComma = str.lastIndexOf(",");
  if (lastComma > lastDot) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    str = str.replace(/,/g, "");
  } else {
    str = str.replace(/,/g, "");
  }
  return Math.abs(parseFloat(str) || 0);
}

function parseBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return s === "sí" || s === "si" || s === "yes" || s === "true" || s === "1";
}

export default function GridBancosImportDialog({ open, onOpenChange }: GridBancosImportDialogProps) {
  const [records, setRecords] = useState<ParsedGridRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showPop } = useMyPop();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setRecords([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

        if (rows.length === 0) {
          setError("El archivo no contiene datos");
          return;
        }

        const headers = Object.keys(rows[0]);
        const headerMap: Record<string, string> = {};
        const mappings: [string[], string][] = [
          [["fecha"], "fecha"],
          [["banco"], "banco"],
          [["comprob.", "comprob", "comprobante"], "comprobante"],
          [["operación", "operacion"], "operacion"],
          [["descripción", "descripcion"], "descripcion"],
          [["monto"], "monto"],
          [["monto $", "monto$", "montodolares", "monto dolares"], "montodolares"],
          [["saldo"], "saldo"],
          [["saldo conc.", "saldo conc", "saldo conciliado"], "saldo_conciliado"],
          [["conc", "conciliado"], "conciliado"],
          [["rel", "relacionado"], "relacionado"],
          [["propietario"], "propietario"],
          [["uti", "utility"], "utility"],
        ];
        for (const h of headers) {
          const hLower = h.trim().toLowerCase();
          for (const [variants, key] of mappings) {
            if (variants.includes(hLower)) {
              headerMap[key] = h;
              break;
            }
          }
        }
        const requiredKeys = ["fecha", "banco", "comprobante"];
        const missingKeys = requiredKeys.filter(k => !headerMap[k]);
        if (missingKeys.length > 0) {
          setError(`Faltan columnas requeridas: ${missingKeys.join(", ")}`);
          return;
        }

        const col = (row: any, key: string) => row[headerMap[key]] ?? "";

        const parsed: ParsedGridRecord[] = [];
        for (const row of rows) {
          const fecha = parseDateValue(col(row, "fecha"));
          if (!fecha) continue;

          const banco = String(col(row, "banco")).toLowerCase();
          const comprobante = String(col(row, "comprobante")).trim();
          const operacion = String(col(row, "operacion")).toLowerCase();
          const descripcion = String(col(row, "descripcion")).toLowerCase();
          const monto = parseNumeric(col(row, "monto"));
          const montodolares = parseNumeric(col(row, "montodolares"));
          const saldo = parseNumeric(col(row, "saldo"));
          const saldoConc = parseNumeric(col(row, "saldo_conciliado"));
          const conciliado = parseBool(col(row, "conciliado"));
          const relacionado = parseBool(col(row, "relacionado"));
          const propietario = String(col(row, "propietario")).toLowerCase();
          const operador = inferOperador(operacion);

          parsed.push({
            fecha,
            banco,
            comprobante,
            operacion,
            descripcion,
            monto,
            montodolares,
            saldo,
            saldo_conciliado: saldoConc,
            conciliado,
            relacionado,
            operador,
            propietario,
          });
        }

        if (parsed.length === 0) {
          setError("No se encontraron registros válidos");
          return;
        }

        setRecords(parsed);
      } catch (err: any) {
        setError(`Error al leer el archivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (records.length === 0) return;
    setImporting(true);
    try {
      const username = getStoredUsername() || "sistema";
      const res = await apiRequest("POST", "/api/bancos/grid-import", {
        records,
        username,
      });
      const data = await res.json();
      if (data.ok) {
        showPop({
          title: "Importación completada",
          message: `Se insertaron ${data.inserted} registros. ${data.skipped > 0 ? `Se omitieron ${data.skipped} duplicados.` : ""}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
        onOpenChange(false);
        setRecords([]);
        setFileName("");
      } else {
        showPop({ title: "Error", message: data.error || "Error al importar" });
      }
    } catch (err: any) {
      showPop({ title: "Error", message: err.message || "Error al importar" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      setRecords([]);
      setFileName("");
      setError("");
    }
  };

  const bancosResumen = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.banco] = (acc[r.banco] || 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-grid-bancos-import">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-grid-bancos-import">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Excel de Bancos (formato grilla)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              data-testid="button-select-file"
            >
              <Upload className="h-4 w-4 mr-1" />
              Seleccionar archivo
            </Button>
            {fileName && (
              <span className="text-xs text-muted-foreground" data-testid="text-filename">{fileName}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs" data-testid="text-error">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {records.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs" data-testid="text-summary">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{records.length} registros encontrados</span>
                <span className="text-muted-foreground">
                  ({Object.entries(bancosResumen).map(([b, c]) => `${b}: ${c}`).join(", ")})
                </span>
              </div>

              <div className="border rounded overflow-auto max-h-[40vh]">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-1 py-0.5 text-left">#</th>
                      <th className="px-1 py-0.5 text-left">Fecha</th>
                      <th className="px-1 py-0.5 text-left">Banco</th>
                      <th className="px-1 py-0.5 text-left">Comprob.</th>
                      <th className="px-1 py-0.5 text-left">Operación</th>
                      <th className="px-1 py-0.5 text-left">Operador</th>
                      <th className="px-1 py-0.5 text-left">Descripción</th>
                      <th className="px-1 py-0.5 text-right">Monto</th>
                      <th className="px-1 py-0.5 text-right">Monto $</th>
                      <th className="px-1 py-0.5 text-center">Conc</th>
                      <th className="px-1 py-0.5 text-left">Propietario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t hover:bg-muted/50" data-testid={`row-preview-${i}`}>
                        <td className="px-1 py-0.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-1 py-0.5">{r.fecha}</td>
                        <td className="px-1 py-0.5">{r.banco}</td>
                        <td className="px-1 py-0.5">{r.comprobante}</td>
                        <td className="px-1 py-0.5">{r.operacion}</td>
                        <td className="px-1 py-0.5">{r.operador}</td>
                        <td className="px-1 py-0.5 max-w-[200px] truncate">{r.descripcion}</td>
                        <td className="px-1 py-0.5 text-right">{r.monto.toFixed(2)}</td>
                        <td className="px-1 py-0.5 text-right">{r.montodolares.toFixed(2)}</td>
                        <td className="px-1 py-0.5 text-center">{r.conciliado ? "Sí" : "No"}</td>
                        <td className="px-1 py-0.5 max-w-[120px] truncate">{r.propietario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {records.length > 20 && (
                  <div className="text-center text-[10px] text-muted-foreground py-1">
                    ... y {records.length - 20} registros más
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={importing} data-testid="button-cancel-import">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={records.length === 0 || importing}
            data-testid="button-confirm-import"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Importar {records.length} registros
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
