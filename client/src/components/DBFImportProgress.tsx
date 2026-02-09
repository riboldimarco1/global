import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, CheckCircle, Loader2, AlertCircle, FileUp, FileArchive, FileText } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'file';
  message: string;
}

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const logIndexRef = useRef<number>(0);
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopPolling();
    sessionIdRef.current = null;
    logIndexRef.current = 0;
    setPhase("select");
    setDetail("Seleccione un archivo ZIP con los archivos DBF de Global");
    setProgress(0);
    setError(null);
    setIsImporting(false);
    setSelectedFile(null);
    setLogs([]);
    setCurrentFile(null);
    onClose();
  }, [onClose, stopPolling]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError("El archivo debe ser un archivo .zip");
        showPop({ title: "Error", message: "El archivo debe ser .zip" });
        return;
      }
      setSelectedFile(file);
      setError(null);
      setLogs([]);
      setDetail(`Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      const resp = await fetch(`/api/import-dbf-status/${sessionIdRef.current}?since=${logIndexRef.current}`);
      if (!resp.ok) return;
      const data = await resp.json();

      if (data.status === 'not_found') {
        stopPolling();
        setError('Sesión no encontrada o expirada');
        setPhase('error');
        setIsImporting(false);
        return;
      }

      setPhase(data.phase);
      setDetail(data.detail);
      setProgress(data.progress);

      if (data.logs && data.logs.length > 0) {
        const newEntries: LogEntry[] = data.logs.map((l: any) => ({
          type: l.type,
          message: l.message
        }));
        setLogs(prev => [...prev, ...newEntries]);
        logIndexRef.current = data.logIndex;

        const lastFileLog = [...data.logs].reverse().find((l: any) => l.file);
        if (lastFileLog) {
          setCurrentFile(lastFileLog.file);
        }
      }

      if (data.status === 'complete') {
        stopPolling();
        setIsImporting(false);
        setCurrentFile(null);
      } else if (data.status === 'error') {
        stopPolling();
        setError(data.detail);
        setIsImporting(false);
      }
    } catch {
      // Network error during poll - keep polling, will retry
    }
  }, [stopPolling]);

  const startImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setPhase("uploading");
    setDetail("Subiendo archivo...");
    setProgress(0);
    setError(null);
    setLogs([]);
    logIndexRef.current = 0;
    
    setLogs([{ type: 'info', message: `Iniciando carga de ${selectedFile.name}...` }]);

    try {
      // Phase 1: Upload file via XHR (with progress tracking)
      const sessionId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadPercent = (event.loaded / event.total) * 40;
            setProgress(uploadPercent);
            setDetail(`Subiendo: ${Math.round(uploadPercent / 40 * 100)}%`);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.sessionId) {
                resolve(data.sessionId);
              } else {
                reject(new Error('Respuesta inválida del servidor'));
              }
            } catch {
              reject(new Error('Error al procesar respuesta del servidor'));
            }
          } else {
            let errorMsg = `Error del servidor (${xhr.status})`;
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.error) errorMsg = data.error;
            } catch {}
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => reject(new Error('Error de conexión al subir archivo'));
        xhr.onabort = () => reject(new Error('Carga cancelada'));

        const formData = new FormData();
        formData.append('file', selectedFile);
        xhr.open('POST', '/api/import-dbf-upload');
        xhr.send(formData);
      });

      setLogs(prev => [...prev, { type: 'success', message: 'Archivo subido correctamente' }]);
      setProgress(40);
      setPhase("processing");
      setDetail("Iniciando procesamiento...");

      // Phase 2: Start background processing (returns immediately)
      sessionIdRef.current = sessionId;
      const startResp = await fetch(`/api/import-dbf-start/${sessionId}`, { method: 'POST' });
      if (!startResp.ok) {
        const errData = await startResp.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al iniciar procesamiento');
      }

      setLogs(prev => [...prev, { type: 'info', message: 'Procesamiento iniciado...' }]);

      // Phase 3: Poll for progress every 1.5 seconds
      pollingRef.current = setInterval(pollStatus, 1500);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al importar";
      setError(errorMsg);
      setPhase("error");
      setIsImporting(false);
      setLogs(prev => [...prev, { type: 'error', message: errorMsg }]);
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
      case "cleaning": return "Limpiando tablas";
      case "complete": return "Completado";
      case "error": return "Error";
      default: return "Procesando...";
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />;
      case 'file': return <FileText className="h-3 w-3 text-blue-500 flex-shrink-0" />;
      default: return <Loader2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent 
        className={`sm:max-w-lg ${windowStyle}`}
        data-testid="dialog-dbf-import-progress"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
              {currentFile && phase !== "complete" && phase !== "error" && (
                <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Archivo actual: {currentFile}
                </div>
              )}
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

          {logs.length > 0 && (
            <div className="border rounded-md">
              <div className="px-3 py-2 bg-muted text-xs font-medium border-b">
                Log de importación
              </div>
              <ScrollArea className="h-40">
                <div className="p-2 space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {getLogIcon(log.type)}
                      <span className={
                        log.type === 'error' ? 'text-red-500' : 
                        log.type === 'success' ? 'text-green-600' : 
                        log.type === 'file' ? 'text-blue-500' : 
                        'text-muted-foreground'
                      }>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </ScrollArea>
            </div>
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
              <MyButtonStyle
                color="gray"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-dbf-file"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Seleccionar archivo ZIP"}
              </MyButtonStyle>
              
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <p className="font-medium mb-1">Archivos DBF esperados:</p>
                <p>parametros.dbf, bancos.dbf, administracion.dbf, cheques.dbf, cosecha.dbf, almacen.dbf, transferencias.dbf</p>
              </div>
              
              {selectedFile && phase !== "error" && (
                <MyButtonStyle 
                  color="green"
                  onClick={startImport} 
                  className="w-full"
                  loading={isImporting}
                  data-testid="button-start-dbf-import"
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
                  data-testid="button-retry-dbf-import"
                >
                  Reintentar
                </MyButtonStyle>
              )}
            </div>
          )}

          {phase === "complete" && (
            <MyButtonStyle 
              color="green"
              onClick={() => {
                onSuccess();
                handleClose();
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              }} 
              className="w-full"
              data-testid="button-close-dbf-import"
            >
              Cerrar
            </MyButtonStyle>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
