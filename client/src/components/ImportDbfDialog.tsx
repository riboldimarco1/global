import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  table: string;
  count: number;
  error?: string;
}

interface ImportDbfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDbfDialog({ open, onOpenChange }: ImportDbfDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState<string>("");
  const [tableProgress, setTableProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
        toast({ title: "Error", description: "Por favor seleccione un archivo ZIP", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setResults(null);
    setProgress(0);
    setCurrentTable("");
    setTableProgress("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-dbf", {
        method: "POST",
        body: formData,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No se pudo leer la respuesta");
      }

      let buffer = "";
      let errorOccurred: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "error") {
                errorOccurred = data.error;
                break;
              } else if (data.type === "start") {
                setTableProgress(`0/${data.totalTables} tablas`);
              } else if (data.type === "table_start") {
                setCurrentTable(data.table);
                setProgress(data.percent);
                setTableProgress(`${data.current}/${data.total} tablas`);
              } else if (data.type === "table_complete") {
                setProgress(data.percent);
                setTableProgress(`${data.current}/${data.total} tablas`);
              } else if (data.type === "table_error") {
                setProgress(data.percent);
              } else if (data.type === "complete") {
                setProgress(100);
                setResults(data.results);
                toast({ title: "Importación completada", description: `Se importaron ${data.results.length} tablas` });
              }
            } catch (parseError) {
              console.error("Error parsing SSE:", parseError);
            }
          }
        }

        if (errorOccurred) break;
      }

      if (errorOccurred) {
        throw new Error(errorOccurred);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      setCurrentTable("");
      setTableProgress("");
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setFile(null);
      setResults(null);
      onOpenChange(false);
    }
  };

  const totalRecords = results?.reduce((sum, r) => sum + r.count, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Importar datos de DBF
          </DialogTitle>
          <DialogDescription>
            Seleccione un archivo ZIP que contenga tablas DBF de Global
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-dbf-file"
          />

          {!file ? (
            <Button
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-select-dbf-file"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Haga clic para seleccionar archivo ZIP</span>
              </div>
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                {!isImporting && !results && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    data-testid="button-clear-file"
                  >
                    Cambiar
                  </Button>
                )}
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {currentTable ? `Importando ${currentTable}...` : "Preparando importación..."}
                    </div>
                    <span className="font-medium">{tableProgress}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">{progress}%</div>
                </div>
              )}

              {results && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Resultados:</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {results.map((r) => (
                      <div
                        key={r.table}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {r.error ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          <span className="capitalize">{r.table}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {r.error ? r.error : `${r.count.toLocaleString()} registros`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-medium pt-2 border-t">
                    Total: {totalRecords.toLocaleString()} registros importados
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isImporting} data-testid="button-cancel-import">
              {results ? "Cerrar" : "Cancelar"}
            </Button>
            {file && !results && (
              <Button onClick={handleImport} disabled={isImporting} data-testid="button-start-import">
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  "Importar"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
