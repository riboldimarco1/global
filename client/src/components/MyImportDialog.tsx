import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParametrosOptions } from "@/hooks/useParametrosOptions";
import { MyButtonStyle } from "@/components/MyButtonStyle";

interface ParsedRecord {
  fecha: string;
  comprobante: string;
  descripcion: string;
  monto: number;
  saldo: number;
}

interface MyImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

function parseMontoVenezolano(montoStr: string): number {
  if (!montoStr || montoStr.trim() === "") return 0;
  const cleaned = montoStr.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function parseFecha(fechaStr: string): string {
  const parts = fechaStr.split("/");
  if (parts.length === 3) {
    const [dia, mes, anio] = parts;
    const anioCorto = anio.length === 4 ? anio.slice(2) : anio;
    return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anioCorto}`;
  }
  return fechaStr;
}

function parseExtractoBancario(content: string): ParsedRecord[] {
  const lines = content.split("\n");
  const records: ParsedRecord[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+([\+\-][\d\.,]+)\s+([\d\.,]+)\s*$/);
    if (dateMatch) {
      const [, fecha, comprobante, descripcion, monto, saldo] = dateMatch;
      records.push({
        fecha: parseFecha(fecha),
        comprobante: comprobante.trim(),
        descripcion: descripcion.trim(),
        monto: parseMontoVenezolano(monto),
        saldo: parseMontoVenezolano(saldo),
      });
    }
  }
  
  return records;
}

export default function MyImportDialog({ isOpen, onClose, onImportComplete }: MyImportDialogProps) {
  const [selectedBanco, setSelectedBanco] = useState<string>("");
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; duplicates: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const bancosOptions = useParametrosOptions("bancos");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    setImportResult(null);
    
    try {
      const content = await file.text();
      const records = parseExtractoBancario(content);
      setParsedRecords(records);
      
      if (records.length === 0) {
        toast({
          title: "Sin registros",
          description: "No se encontraron movimientos bancarios en el archivo",
          variant: "destructive",
        });
      }
    } catch (error) {
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
    
    try {
      const response = await fetch("/api/bancos/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banco: selectedBanco,
          records: parsedRecords,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Error al importar");
      }
      
      const result = await response.json();
      setImportResult(result);
      
      toast({
        title: "Importación completada",
        description: `${result.success} registros importados, ${result.duplicates} duplicados omitidos`,
      });
      
      onImportComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al importar los registros",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsedRecords([]);
    setFileName("");
    setSelectedBanco("");
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
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
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-1 block">Archivo</label>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4" />
                {fileName || "Seleccionar archivo .txt"}
              </Button>
            </div>
          </div>
          
          {parsedRecords.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-sm font-medium flex items-center justify-between">
                <span>Vista previa ({parsedRecords.length} registros)</span>
                {importResult && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {importResult.success} importados
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Fecha</th>
                      <th className="px-2 py-1 text-left">Comprobante</th>
                      <th className="px-2 py-1 text-left">Descripción</th>
                      <th className="px-2 py-1 text-right">Monto</th>
                      <th className="px-2 py-1 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRecords.map((record, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/20">
                        <td className="px-2 py-1">{record.fecha}</td>
                        <td className="px-2 py-1 font-mono">{record.comprobante}</td>
                        <td className="px-2 py-1 truncate max-w-[200px]" title={record.descripcion}>
                          {record.descripcion}
                        </td>
                        <td className={`px-2 py-1 text-right font-mono ${record.monto >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {record.monto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
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
              <span className="text-sm">No se encontraron movimientos bancarios en el formato esperado</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <MyButtonStyle
            color="green"
            onClick={handleImport}
            loading={isImporting}
            disabled={!selectedBanco || parsedRecords.length === 0}
          >
            Importar {parsedRecords.length} registros
          </MyButtonStyle>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
