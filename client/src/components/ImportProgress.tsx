import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, Loader2, AlertCircle, FileUp } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";

interface ImportProgressProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportProgress({ open, onClose, onSuccess }: ImportProgressProps) {
  const [phase, setPhase] = useState<string>("select");
  const [detail, setDetail] = useState<string>("Seleccione un archivo para importar");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setPhase("select");
    setDetail("Seleccione un archivo para importar");
    setProgress(0);
    setError(null);
    setIsImporting(false);
    setSelectedFile(null);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
        setError("El archivo debe ser .zip o .json");
        return;
      }
      setSelectedFile(file);
      setError(null);
      setDetail(`Archivo seleccionado: ${file.name}`);
    }
  };

  const startImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setPhase("uploading");
    setDetail("Subiendo archivo...");
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No se pudo leer la respuesta');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.phase === 'complete') {
                setPhase('complete');
                setDetail(`Importación completada: ${data.records} registros`);
                setProgress(100);
              } else if (data.phase === 'error') {
                setPhase('error');
                setError(data.detail || 'Error al importar');
                setIsImporting(false);
                return;
              } else {
                setPhase(data.phase);
                setDetail(data.detail);
                setProgress(data.progress);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
      setPhase("error");
    } finally {
      setIsImporting(false);
    }
  };

  const getPhaseIcon = () => {
    if (phase === "complete") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (phase === "error") return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (phase === "select") return <FileUp className="h-5 w-5 text-blue-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "select": return "Seleccionar archivo";
      case "uploading": return "Subiendo";
      case "decompressing": return "Descomprimiendo";
      case "importing": return "Importando";
      case "complete": return "Completado";
      case "error": return "Error";
      default: return "Procesando...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-import-progress">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Datos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            {getPhaseIcon()}
            <div className="flex-1">
              <div className="font-medium text-sm">{getPhaseLabel()}</div>
              <div className="text-xs text-muted-foreground">{detail || error}</div>
            </div>
          </div>
          
          {phase !== "select" && (
            <>
              <Progress value={progress} className="h-2" data-testid="progress-import" />
              <div className="text-center text-xs text-muted-foreground">
                {progress}% completado
              </div>
            </>
          )}

          {(phase === "select" || phase === "error") && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".zip,.json"
                className="hidden"
                data-testid="input-import-file"
              />
              <MyButtonStyle
                color="gray"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-file"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Seleccionar archivo"}
              </MyButtonStyle>
              
              {selectedFile && phase !== "error" && (
                <MyButtonStyle 
                  color="green"
                  onClick={startImport} 
                  className="w-full"
                  loading={isImporting}
                  data-testid="button-start-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Iniciar importación
                </MyButtonStyle>
              )}
              
              {error && (
                <div className="text-xs text-red-500 text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</div>
              )}
              
              {phase === "error" && (
                <MyButtonStyle 
                  color="yellow"
                  onClick={() => {
                    setPhase("select");
                    setError(null);
                    setProgress(0);
                  }} 
                  className="w-full"
                  data-testid="button-retry-import"
                >
                  Reintentar
                </MyButtonStyle>
              )}
            </div>
          )}

          {phase === "complete" && (
            <MyButtonStyle 
              color="green"
              onClick={handleClose} 
              className="w-full"
              data-testid="button-close-import"
            >
              Cerrar
            </MyButtonStyle>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
