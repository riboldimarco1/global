import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertCircle, FileUp, FileText, MapPin } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning' | 'skip';
  message: string;
}

interface DireccionesDBFImportProgressProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DireccionesDBFImportProgress({ open, onClose, onSuccess }: DireccionesDBFImportProgressProps) {
  const [phase, setPhase] = useState<string>("select");
  const [detail, setDetail] = useState<string>("Seleccione un archivo .dbf con las direcciones");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const handleClose = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setPhase("select");
    setDetail("Seleccione un archivo .dbf con las direcciones");
    setProgress(0);
    setError(null);
    setIsImporting(false);
    setSelectedFile(null);
    setLogs([]);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.dbf')) {
        setError("El archivo debe ser un archivo .dbf");
        showPop({ title: "Error", message: "El archivo debe ser .dbf" });
        return;
      }
      setSelectedFile(file);
      setError(null);
      setLogs([]);
      setDetail(`Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    }
  };

  const processSSELine = (line: string) => {
    if (!line.startsWith('data: ')) return;

    try {
      const data = JSON.parse(line.slice(6));

      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      if (data.phase === 'complete') {
        setPhase('complete');
        setDetail(data.detail);
        setProgress(100);
        setIsImporting(false);
        addLog('success', data.detail);
        onSuccess();
      } else if (data.phase === 'error') {
        setPhase('error');
        setError(data.detail);
        setIsImporting(false);
        addLog('error', data.detail);
        showPop({ title: "Error", message: data.detail });
      } else if (data.phase === 'reading') {
        setPhase('reading');
        setDetail(data.detail);
        addLog('info', data.detail);
      } else if (data.phase === 'updated') {
        setPhase('processing');
        setDetail(data.detail);
        addLog('success', data.detail);
      } else if (data.phase === 'not_found') {
        setPhase('processing');
        setDetail(data.detail);
        addLog('warning', data.detail);
      } else if (data.phase === 'skipped') {
        setPhase('processing');
        setDetail(data.detail);
        addLog('skip', data.detail);
      } else if (data.phase === 'unchanged') {
        setPhase('processing');
        setDetail(data.detail);
        addLog('skip', data.detail);
      }
    } catch (e) {
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

    addLog('info', `Enviando ${selectedFile.name} al servidor...`);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    let lastResponseLength = 0;
    let lineBuffer = "";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const uploadPercent = (event.loaded / event.total) * 5;
        setProgress(uploadPercent);
        setDetail(`Subiendo: ${Math.round((event.loaded / event.total) * 100)}%`);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newText = xhr.responseText.substring(lastResponseLength);
        lastResponseLength = xhr.responseText.length;

        if (newText) {
          lineBuffer += newText;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || "";
          for (const line of lines) {
            if (line.trim()) {
              processSSELine(line);
            }
          }
        }
      }

      if (xhr.readyState === 4) {
        if (lineBuffer.trim()) {
          processSSELine(lineBuffer);
          lineBuffer = "";
        }
        if (xhr.status !== 200) {
          setError('Error al conectar con el servidor');
          setPhase("error");
          setIsImporting(false);
          addLog('error', 'Error al conectar con el servidor');
        }
      }
    };

    xhr.onerror = () => {
      setError('Error de conexión');
      setPhase("error");
      setIsImporting(false);
      addLog('error', 'Error de conexión');
    };

    xhr.onabort = () => {
      addLog('info', 'Importación cancelada');
      setIsImporting(false);
    };

    xhr.open('POST', '/api/herramientas/importar-direcciones-dbf');
    xhr.send(formData);
  };

  const getPhaseIcon = () => {
    if (phase === "complete") return <CheckCircle className="h-5 w-5 text-green-800 dark:text-green-300" />;
    if (phase === "error") return <AlertCircle className="h-5 w-5 text-red-800 dark:text-red-300" />;
    if (phase === "select") return <MapPin className="h-5 w-5 text-blue-800 dark:text-blue-300" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-800 dark:text-blue-300" />;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "select": return "Seleccionar archivo DBF";
      case "uploading": return "Subiendo archivo";
      case "reading": return "Leyendo archivo DBF";
      case "processing": return "Actualizando direcciones";
      case "complete": return "Completado";
      case "error": return "Error";
      default: return "Procesando...";
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-800 dark:text-green-300 flex-shrink-0" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-red-800 dark:text-red-300 flex-shrink-0" />;
      case 'warning': return <AlertCircle className="h-3 w-3 text-yellow-800 dark:text-yellow-300 flex-shrink-0" />;
      case 'skip': return <FileText className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />;
      default: return <Loader2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-800 dark:text-green-300';
      case 'error': return 'text-red-800 dark:text-red-300';
      case 'warning': return 'text-yellow-800 dark:text-yellow-300';
      case 'skip': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className={`sm:max-w-lg ${windowStyle}`}
        data-testid="dialog-direcciones-dbf-import"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Importar direcciones DBF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            {getPhaseIcon()}
            <div className="flex-1">
              <div className="font-medium text-sm">{getPhaseLabel()}</div>
              <div className="text-xs text-muted-foreground truncate">{detail || error}</div>
            </div>
          </div>

          {phase !== "select" && (
            <>
              <Progress value={progress} className="h-2" data-testid="progress-direcciones-import" />
              <div className="text-center text-xs text-muted-foreground">
                {progress.toFixed(0)}% completado
              </div>
            </>
          )}

          {logs.length > 0 && (
            <div className="border rounded-md">
              <div className="px-3 py-2 bg-muted text-xs font-medium border-b">
                Log de importación ({logs.length} entradas)
              </div>
              <ScrollArea className="h-48">
                <div className="p-2 space-y-0.5">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      {getLogIcon(log.type)}
                      <span className={getLogColor(log.type)}>
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
                accept=".dbf"
                className="hidden"
                data-testid="input-direcciones-dbf-file"
              />
              <MyButtonStyle
                color="gray"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-direcciones-file"
              >
                <FileUp className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : "Seleccionar archivo DBF"}
              </MyButtonStyle>

              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <p className="font-medium mb-1">Campos esperados en el DBF:</p>
                <p>CLASE, NOMBRE, DIRECCION, DESCRIPCIO (cuenta), CEDULA, OPERADOR (correo), TELEFONO</p>
              </div>

              {selectedFile && phase !== "error" && (
                <MyButtonStyle
                  color="green"
                  onClick={startImport}
                  className="w-full"
                  loading={isImporting}
                  data-testid="button-start-direcciones-import"
                >
                  <MapPin className="h-4 w-4 mr-2" />
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
                  data-testid="button-retry-direcciones-import"
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
              data-testid="button-close-direcciones-import"
            >
              Cerrar
            </MyButtonStyle>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
