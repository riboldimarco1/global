import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  table: string;
  count: number;
  errors?: number;
  error?: string;
}

interface ImportDbfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDbfDialog({ open, onOpenChange }: ImportDbfDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
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
      setUploadProgress(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use XMLHttpRequest for upload progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.upload.addEventListener("load", () => {
        setIsUploading(false);
        setIsImporting(true);
      });

      xhr.addEventListener("load", () => {
        setIsImporting(false);
        
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            setResults(data.results || []);
            toast({ title: "Importación completada", description: `Se procesaron ${(data.results || []).length} tablas` });
          } catch {
            toast({ title: "Error", description: "Error al procesar respuesta", variant: "destructive" });
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            toast({ title: "Error", description: error.error || "Error en importación", variant: "destructive" });
          } catch {
            toast({ title: "Error", description: "Error en importación", variant: "destructive" });
          }
        }
      });

      xhr.addEventListener("error", () => {
        setIsUploading(false);
        setIsImporting(false);
        toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
      });

      xhr.open("POST", "/api/import-dbf");
      xhr.send(formData);

    } catch (error: any) {
      setIsUploading(false);
      setIsImporting(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleClose = () => {
    if (!isUploading && !isImporting) {
      setFile(null);
      setResults(null);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  const totalRecords = results?.reduce((sum, r) => sum + r.count, 0) || 0;
  const isProcessing = isUploading || isImporting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Importar datos de Global
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
              disabled={isProcessing}
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
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                {!isProcessing && !results && (
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

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando datos... Esto puede tomar varios minutos.
                  </div>
                  <Progress value={undefined} className="h-2" />
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
                          {r.errors ? ` (${r.errors} errores)` : ""}
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
            <Button variant="outline" onClick={handleClose} disabled={isProcessing} data-testid="button-cancel-import">
              {results ? "Cerrar" : "Cancelar"}
            </Button>
            {file && !results && (
              <Button onClick={handleImport} disabled={isProcessing} data-testid="button-start-import">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isUploading ? "Subiendo..." : "Importando..."}
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
