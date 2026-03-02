import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import * as XLSX from "xlsx";

interface ExcelMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileEntry {
  name: string;
  rows: number;
  headers: string[];
  data: Record<string, any>[];
}

export default function ExcelMergeDialog({ open, onOpenChange }: ExcelMergeDialogProps) {
  const { showPop } = useMyPop();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setLoading(false);
      setMerging(false);
    }
  }, [open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true);
    try {
      const newEntries: FileEntry[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) continue;

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

        newEntries.push({
          name: file.name,
          rows: jsonData.length,
          headers,
          data: jsonData,
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

  const handleMerge = () => {
    if (files.length < 2) {
      showPop({ title: "Atención", message: "Seleccione al menos 2 archivos para unir." });
      return;
    }

    setMerging(true);
    try {
      const allHeaders = new Set<string>();
      files.forEach(f => f.headers.forEach(h => allHeaders.add(h)));
      const headerList = Array.from(allHeaders);

      const mergedData: Record<string, any>[] = [];
      files.forEach(f => {
        f.data.forEach(row => {
          const normalizedRow: Record<string, any> = {};
          headerList.forEach(h => {
            normalizedRow[h] = row[h] !== undefined ? row[h] : "";
          });
          mergedData.push(normalizedRow);
        });
      });

      const ws = XLSX.utils.json_to_sheet(mergedData, { header: headerList });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Unificado");
      XLSX.writeFile(wb, "archivos_unidos.xlsx");

      showPop({
        title: "Descarga completa",
        message: `Se unieron ${files.length} archivos con ${mergedData.length} filas en total.`,
      });
    } catch (err) {
      showPop({ title: "Error", message: "No se pudieron unir los archivos." });
    } finally {
      setMerging(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    onOpenChange(false);
  };

  const totalRows = files.reduce((sum, f) => sum + f.rows, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-excel-merge">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Unir archivos Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || merging}
              data-testid="button-select-excel-files"
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
              data-testid="input-excel-files"
            />
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground" data-testid="text-file-count">
                {files.length} archivo{files.length !== 1 ? "s" : ""} · {totalRows} filas
              </span>
            )}
          </div>

          {files.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">Archivo</th>
                    <th className="text-right px-3 py-1.5 font-medium">Filas</th>
                    <th className="text-right px-3 py-1.5 font-medium">Columnas</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => (
                    <tr key={i} className="border-t hover:bg-muted/50" data-testid={`row-file-${i}`}>
                      <td className="px-3 py-1.5 truncate max-w-[200px]" title={f.name} data-testid={`text-filename-${i}`}>
                        {f.name}
                      </td>
                      <td className="px-3 py-1.5 text-right" data-testid={`text-rows-${i}`}>{f.rows}</td>
                      <td className="px-3 py-1.5 text-right" data-testid={`text-columns-${i}`}>{f.headers.length}</td>
                      <td className="px-1 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(i)}
                          disabled={merging}
                          data-testid={`button-remove-file-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-md border-dashed" data-testid="text-empty-state">
              Seleccione archivos Excel para unir
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose} disabled={merging} data-testid="button-cancel-merge">
            Cerrar
          </Button>
          <Button
            onClick={handleMerge}
            disabled={files.length < 2 || merging}
            data-testid="button-merge-download"
          >
            {merging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Unir y Descargar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
