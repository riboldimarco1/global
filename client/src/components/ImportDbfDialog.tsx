import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileArchive, CheckCircle, XCircle } from "lucide-react";

interface ImportDbfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportDbfDialog({ open, onOpenChange, onSuccess }: ImportDbfDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(0);
      setMessage("");
      setIsComplete(false);
      setHasError(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setMessage("Iniciando importación...");
    setIsComplete(false);
    setHasError(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import-dbf", {
        method: "POST",
        body: formData,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No se pudo leer la respuesta");

      const decoder = new TextDecoder();
      let buffer = "";

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
              setProgress(data.percent || 0);
              setMessage(data.message || "");
              if (data.error) {
                setHasError(true);
              }
              if (data.percent === 100) {
                setIsComplete(true);
                if (!data.error && onSuccess) {
                  onSuccess();
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setHasError(true);
      setProgress(100);
      setIsComplete(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFile(null);
      setProgress(0);
      setMessage("");
      setIsComplete(false);
      setHasError(false);
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(0);
    setMessage("");
    setIsComplete(false);
    setHasError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Cargar DBF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Seleccione un archivo ZIP que contenga una tabla DBF. Los registros se agregarán a la tabla correspondiente.
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-dbf"
          />

          {!isLoading && !isComplete && (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-select-file"
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : "Seleccionar archivo ZIP"}
              </Button>

              {file && (
                <Button
                  onClick={handleImport}
                  className="w-full"
                  data-testid="button-start-import"
                >
                  Iniciar importación
                </Button>
              )}
            </div>
          )}

          {(isLoading || isComplete) && (
            <div className="space-y-3">
              <Progress value={progress} className="h-3" />
              
              <div className="flex items-center gap-2 text-sm">
                {isComplete && !hasError && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {isComplete && hasError && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={hasError ? "text-destructive" : ""}>
                  {message}
                </span>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                {progress}% completado
              </div>

              {isComplete && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                    data-testid="button-import-another"
                  >
                    Cargar otro archivo
                  </Button>
                  <Button
                    onClick={handleClose}
                    className="flex-1"
                    data-testid="button-close-import"
                  >
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
