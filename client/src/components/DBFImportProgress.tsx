import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, CheckCircle, Loader2, AlertCircle, FileUp, FileArchive, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'file';
  message: string;
  timestamp: Date;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string, showToast: boolean = false) => {
    const entry: LogEntry = { type, message, timestamp: new Date() };
    setLogs(prev => [...prev, entry]);
    
    if (showToast) {
      toast({
        title: type === 'error' ? 'Error' : type === 'success' ? 'Completado' : 'Procesando',
        description: message,
        variant: type === 'error' ? 'destructive' : 'default',
      });
    }
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPhase("select");
    setDetail("Seleccione un archivo ZIP con los archivos DBF de Global");
    setProgress(0);
    setError(null);
    setIsImporting(false);
    setSelectedFile(null);
    setLogs([]);
    setCurrentFile(null);
    onClose();
  };

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

  const processSSELine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    
    try {
      const data = JSON.parse(line.slice(6));
      
      if (data.phase === 'complete') {
        setPhase('complete');
        setDetail(data.detail || `Importación completada: ${data.records || 0} registros`);
        setProgress(100);
        setCurrentFile(null);
        addLog('success', data.detail || `Importación completada: ${data.records || 0} registros`, true);
        setIsImporting(false);
        // No llamar onSuccess() automáticamente - el usuario cierra manualmente
      } else if (data.phase === 'unmapped_fields') {
        // Campos del DBF que tienen datos pero no están mapeados
        addLog('info', `⚠️ ${data.detail}`);
      } else if (data.phase === 'missing_fields') {
        // Campos esperados que no existen en el DBF
        addLog('info', `📋 ${data.detail}`);
      } else if (data.phase === 'error') {
        setPhase('error');
        setError(data.detail || 'Error al importar');
        setIsImporting(false);
        addLog('error', data.detail || 'Error al importar', true);
      } else if (data.phase === 'file_error') {
        addLog('error', data.detail, true);
      } else if (data.phase === 'file_start') {
        setCurrentFile(data.file);
        addLog('file', `Procesando: ${data.file}`, true);
      } else if (data.phase === 'file_complete') {
        addLog('success', `${data.file}: ${data.records} registros importados`);
      } else if (data.phase === 'record_progress') {
        // Update detail with current record count without adding to log
        setDetail(`${data.table}: registro ${data.current} de ${data.total}`);
        setCurrentFile(data.file);
        // Calculate progress: base 50% + proportional progress within current file
        if (data.current && data.total) {
          const fileProgress = (data.current / data.total) * 40;
          setProgress(50 + fileProgress);
        }
      } else {
        setPhase(data.phase);
        setDetail(data.detail);
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }
        if (data.file) {
          setCurrentFile(data.file);
        }
        if (data.phase === 'extracting' || data.phase === 'processing' || data.phase === 'importing') {
          addLog('info', data.detail);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  const startImport = async () => {
    if (!selectedFile || isImporting) return;

    setIsImporting(true);
    setPhase("uploading");
    setDetail("Subiendo archivo...");
    setProgress(0);
    setError(null);
    setLogs([]);
    
    addLog('info', `Iniciando carga de ${selectedFile.name}...`);
    toast({ title: "Importación iniciada", description: `Subiendo ${selectedFile.name}` });

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Use XMLHttpRequest for upload progress + streaming response
    const xhr = new XMLHttpRequest();
    let lastResponseLength = 0;
    
    // Store XHR for potential abort
    const xhrRef = xhr;
    abortControllerRef.current = {
      abort: () => xhrRef.abort(),
      signal: { aborted: false } as AbortSignal
    } as AbortController;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        // Upload progress: 0-40%
        const uploadPercent = (event.loaded / event.total) * 40;
        setProgress(uploadPercent);
        setDetail(`Subiendo: ${Math.round(uploadPercent / 40 * 100)}%`);
      }
    };

    xhr.onreadystatechange = () => {
      // readyState 3 = LOADING (receiving data)
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newText = xhr.responseText.substring(lastResponseLength);
        lastResponseLength = xhr.responseText.length;
        
        if (newText) {
          const lines = newText.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              processSSELine(line);
            }
          }
        }
      }
      
      if (xhr.readyState === 4) {
        if (xhr.status !== 200) {
          setError('Error al conectar con el servidor');
          setPhase("error");
          setIsImporting(false);
          addLog('error', 'Error al conectar con el servidor', true);
        }
      }
    };

    xhr.onerror = () => {
      setError('Error de conexión');
      setPhase("error");
      setIsImporting(false);
      addLog('error', 'Error de conexión', true);
    };

    xhr.onabort = () => {
      addLog('info', 'Importación cancelada');
      setIsImporting(false);
    };

    try {
      addLog('info', 'Enviando archivo al servidor...');
      
      xhr.open('POST', '/api/import-dbf-global');
      xhr.send(formData);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al importar";
      setError(errorMsg);
      setPhase("error");
      setIsImporting(false);
      addLog('error', errorMsg, true);
    }
  };

  const getPhaseIcon = () => {
    if (phase === "complete") return <CheckCircle className="h-5 w-5 text-green-800 dark:text-green-300" />;
    if (phase === "error") return <AlertCircle className="h-5 w-5 text-red-800 dark:text-red-300" />;
    if (phase === "select") return <FileArchive className="h-5 w-5 text-blue-800 dark:text-blue-300" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-800 dark:text-blue-300" />;
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

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-800 dark:text-green-300 flex-shrink-0" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-800 dark:text-red-300 flex-shrink-0" />;
      case 'file': return <FileText className="h-3 w-3 text-blue-800 dark:text-blue-300 flex-shrink-0" />;
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
                <div className="text-xs text-blue-800 dark:text-blue-300 mt-1 flex items-center gap-1">
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
                        log.type === 'error' ? 'text-red-800 dark:text-red-300' : 
                        log.type === 'success' ? 'text-green-800 dark:text-green-300' : 
                        log.type === 'file' ? 'text-blue-800 dark:text-blue-300' : 
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
                <p>parametros.dbf, bancos.dbf, administracion.dbf, cosecha.dbf, almacen.dbf, transferencias.dbf</p>
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
