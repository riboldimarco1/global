import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Download, Loader2 } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

interface DocxSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileSummary {
  name: string;
  totalCana: number;
  found: boolean;
}

function extractTotalCana(text: string): { value: number; found: boolean } {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const match = line.match(/Total\s+Caña\s*:\s*([\d.,]+)/i);
    if (match) {
      const raw = match[1].replace(/,/g, "");
      const num = parseFloat(raw);
      if (!isNaN(num)) return { value: num, found: true };
    }
  }
  return { value: 0, found: false };
}

export default function DocxSummaryDialog({ open, onOpenChange }: DocxSummaryDialogProps) {
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
      const warnings: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const { value, found } = extractTotalCana(result.value);

        if (!found) {
          warnings.push(file.name);
        }

        newEntries.push({
          name: file.name,
          totalCana: value,
          found,
        });
      }

      setFiles(prev => [...prev, ...newEntries]);

      if (warnings.length > 0) {
        showPop({
          title: "Advertencia",
          message: `No se encontró "Total Caña" en: ${warnings.join(", ")}`,
        });
      }
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
        "Total Caña": parseFloat(f.totalCana.toFixed(2)),
      }));

      data.push({
        "Archivo": "TOTAL",
        "Total Caña": parseFloat(files.reduce((s, f) => s + f.totalCana, 0).toFixed(2)),
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [{ wch: 60 }, { wch: 15 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen");
      XLSX.writeFile(wb, "resumen_validacion_cana.xlsx");

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

  const totalCana = files.reduce((s, f) => s + f.totalCana, 0);
  const fmt = (n: number) => n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-docx-summary">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resumen validación caña
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || generating}
              data-testid="button-select-docx-files"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Agregar archivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".docx"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-docx-files"
            />
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground" data-testid="text-docx-file-count">
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
                    <th className="text-right px-3 py-1.5 font-medium">Total Caña</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-t hover:bg-muted/50" data-testid={`row-docx-${i}`}>
                      <td className="px-3 py-1.5 truncate max-w-[280px]" title={f.name} data-testid={`text-docx-name-${i}`}>
                        {f.name}
                        {!f.found && <span className="text-destructive ml-1" title="No se encontró Total Caña">⚠</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right" data-testid={`text-docx-cana-${i}`}>
                        {fmt(f.totalCana)}
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(i)}
                          disabled={generating}
                          data-testid={`button-remove-docx-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="px-3 py-1.5" data-testid="text-docx-total-label">TOTAL</td>
                    <td className="px-3 py-1.5 text-right" data-testid="text-docx-total-cana">{fmt(totalCana)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed" data-testid="text-docx-empty">
              Seleccione archivos .docx de validación de caña
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose} disabled={generating} data-testid="button-cancel-docx">
            Cerrar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={files.length === 0 || generating}
            data-testid="button-generate-docx-summary"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Generar y Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
