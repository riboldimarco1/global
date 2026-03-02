import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import * as XLSX from "xlsx";

interface ExcelSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileSummary {
  name: string;
  rows: number;
  totalCana: number;
}

function normalizeHeader(h: string): string {
  return h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function findCanaColumn(headers: string[]): string | null {
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm === "cana" || norm === "caña") return h;
  }
  return null;
}

export default function ExcelSummaryDialog({ open, onOpenChange }: ExcelSummaryDialogProps) {
  const { showPop } = useMyPop();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setLoading(false);
      setGenerating(false);
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true);
    try {
      const newEntries: FileSummary[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) continue;

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

        let totalCana = 0;
        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          const canaCol = findCanaColumn(headers);
          if (canaCol) {
            for (const row of jsonData) {
              const val = parseFloat(String(row[canaCol]).replace(/,/g, ""));
              if (!isNaN(val)) totalCana += val;
            }
          }
        }

        newEntries.push({
          name: file.name,
          rows: jsonData.length,
          totalCana,
        });
      }

      setFiles(prev => [...prev, ...newEntries]);
    } catch (err) {
      showPop({ title: "Error", message: "No se pudieron leer uno o más archivos." });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (files.length === 0) {
      showPop({ title: "Atención", message: "No hay archivos cargados." });
      return;
    }

    setGenerating(true);
    try {
      const data = files.map(f => ({
        "Archivo": f.name,
        "Registros": f.rows,
        "Total Caña": parseFloat(f.totalCana.toFixed(3)),
      }));

      data.push({
        "Archivo": "TOTAL",
        "Registros": files.reduce((s, f) => s + f.rows, 0),
        "Total Caña": parseFloat(files.reduce((s, f) => s + f.totalCana, 0).toFixed(3)),
      });

      const ws = XLSX.utils.json_to_sheet(data);

      const colWidths = [
        { wch: 40 },
        { wch: 12 },
        { wch: 15 },
      ];
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      XLSX.writeFile(wb, "resumen_archivos.xlsx");

      showPop({
        title: "Descarga completa",
        message: `Resumen generado con ${files.length} archivos.`,
      });
    } catch (err) {
      showPop({ title: "Error", message: "No se pudo generar el resumen." });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const totalRows = files.reduce((s, f) => s + f.rows, 0);
  const totalCana = files.reduce((s, f) => s + f.totalCana, 0);

  const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-excel-summary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Resumen de archivos Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || generating}
              data-testid="button-select-summary-files"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Agregar archivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-summary-files"
            />
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground" data-testid="text-summary-file-count">
                {files.length} archivo{files.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {files.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">Archivo</th>
                    <th className="text-right px-3 py-1.5 font-medium">Registros</th>
                    <th className="text-right px-3 py-1.5 font-medium">Total Caña</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-t hover:bg-muted/50" data-testid={`row-summary-${i}`}>
                      <td className="px-3 py-1.5 truncate max-w-[200px]" title={f.name} data-testid={`text-summary-name-${i}`}>
                        {f.name}
                      </td>
                      <td className="px-3 py-1.5 text-right" data-testid={`text-summary-rows-${i}`}>
                        {f.rows.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right" data-testid={`text-summary-cana-${i}`}>
                        {fmt(f.totalCana)}
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(i)}
                          disabled={generating}
                          data-testid={`button-remove-summary-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="px-3 py-1.5" data-testid="text-summary-total-label">TOTAL</td>
                    <td className="px-3 py-1.5 text-right" data-testid="text-summary-total-rows">{totalRows.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right" data-testid="text-summary-total-cana">{fmt(totalCana)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed" data-testid="text-summary-empty">
              Seleccione archivos Excel para generar el resumen
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose} disabled={generating} data-testid="button-cancel-summary">
            Cerrar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={files.length === 0 || generating}
            data-testid="button-generate-summary"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Generar y Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
