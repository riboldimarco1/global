import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, Loader2, AlertCircle, FileUp, FileArchive } from "lucide-react";

interface DBFImportProgressProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DBFImportProgress({ open, onClose, onSuccess }: DBFImportProgressProps) {
  const [phase, setPhase] = useState<string>("select");
  const [detail, setDetail] = useState<string>("Seleccione un archivo ZIP con los archivos DBF de Global");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setPhase("select");
    setDetail("Seleccione un archivo ZIP con los archivos DBF de Global");
    setProgress(0);
    setUploadProgress(0);
    setError(null);
    setIsImporting(false);
    setSelectedFile(null);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError("El archivo debe ser un archivo .zip");
        return;
      }
      setSelectedFile(file);
      setError(null);
      setDetail(`Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const startImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setPhase("uploading");
    setDetail("Subiendo archivo...");
    setProgress(0);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
          setProgress(percent * 0.3);
          setDetail(`Subiendo archivo... ${percent}%`);
        }
      };

      xhr.onload = async () => {
        if (xhr.status !== 200) {
          try {
            const errorData = JSON.parse(xhr.responseText);
            throw new Error(errorData.error || 'Error al importar');
          } catch {
            throw new Error('Error al importar datos');
          }
        }

        setPhase("processing");
        setDetail("Procesando archivos DBF...");
        setProgress(35);
        
        const lines = xhr.responseText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.phase === 'complete') {
                setPhase('complete');
                setDetail(data.detail || `Importación completada: ${data.records || 0} registros`);
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

        onSuccess();
      };

      xhr.onerror = () => {
        setError("Error de conexión al servidor");
        setPhase("error");
        setIsImporting(false);
      };

      xhr.open('POST', '/api/import-dbf-global');
      xhr.send(formData);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
      setPhase("error");
      setIsImporting(false);
    }
  };

  const getPhaseIcon = () => {
    if (phase === "complete") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (phase === "error") return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (phase === "select") return <FileArchive className="h-5 w-5 text-blue-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "select": return "Seleccionar archivo ZIP";
      case "uploading": return "Subiendo";
      case "extracting": return "Extrayendo archivos";
      case "processing": return "Procesando DBF";
      case "importing": return "Importando datos";
      case "complete": return "Completado";
      case "error": return "Error";
      default: return "Procesando...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-dbf-import-progress">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Cargar datos de Global (DBF)
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
              <Progress value={progress} className="h-2" data-testid="progress-dbf-import" />
              <div className="text-center text-xs text-muted-foreground">
                {progress.toFixed(0)}% completado
              </div>
            </>
          )}

          {(phase === "select" || phase === "error") && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".zip"
                className="hidden"
                data-testid="input-dbf-import-file"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-dbf-file"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Seleccionar archivo ZIP"}
              </Button>
              
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <p className="font-medium mb-1">Archivos DBF esperados:</p>
                <p>parametros.dbf, bancos.dbf, administracion.dbf, cheques.dbf, cosecha.dbf, almacen.dbf, transferencias.dbf</p>
              </div>
              
              {selectedFile && phase !== "error" && (
                <Button 
                  onClick={startImport} 
                  className="w-full"
                  disabled={isImporting}
                  data-testid="button-start-dbf-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Iniciar importación
                </Button>
              )}
              
              {error && (
                <div className="text-xs text-red-500 text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</div>
              )}
              
              {phase === "error" && (
                <Button 
                  onClick={() => {
                    setPhase("select");
                    setError(null);
                    setProgress(0);
                  }} 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-retry-dbf-import"
                >
                  Reintentar
                </Button>
              )}
            </div>
          )}

          {phase === "complete" && (
            <Button 
              onClick={handleClose} 
              className="w-full"
              data-testid="button-close-dbf-import"
            >
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
