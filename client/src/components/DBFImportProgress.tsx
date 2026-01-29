import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, CheckCircle, Loader2, AlertCircle, FileUp, FileArchive, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
        title: type === 'error' ? 'Error' : type === 'success' ? 'Completado' : 'Información',
        description: message,
        variant: type === 'error' ? 'destructive' : 'default',
      });
    }
  };

  const handleClose = () => {
    setPhase("select");
    setDetail("Seleccione un archivo ZIP con los archivos DBF de Global");
    setProgress(0);
    setUploadProgress(0);
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
        toast({ title: "Error", description: "El archivo debe ser .zip", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setError(null);
      setLogs([]);
      setDetail(`Archivo seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      addLog('info', `Archivo seleccionado: ${file.name}`);
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
    setLogs([]);
    
    addLog('info', `Iniciando carga de ${selectedFile.name}...`);
    toast({ title: "Importación iniciada", description: `Subiendo ${selectedFile.name}` });

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
          if (percent === 100) {
            addLog('success', 'Archivo subido correctamente');
          }
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
                setCurrentFile(null);
                addLog('success', data.detail || `Importación completada: ${data.records || 0} registros`, true);
              } else if (data.phase === 'error') {
                setPhase('error');
                setError(data.detail || 'Error al importar');
                setIsImporting(false);
                addLog('error', data.detail || 'Error al importar', true);
                return;
              } else if (data.phase === 'file_error') {
                addLog('error', data.detail, true);
              } else if (data.phase === 'file_start') {
                setCurrentFile(data.file);
                addLog('file', `Procesando: ${data.file}`);
                toast({ title: "Procesando archivo", description: data.file });
              } else if (data.phase === 'file_complete') {
                addLog('success', `${data.file}: ${data.records} registros importados`);
              } else {
                setPhase(data.phase);
                setDetail(data.detail);
                setProgress(data.progress);
                if (data.file) {
                  setCurrentFile(data.file);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        onSuccess();
      };

      xhr.onerror = () => {
        const errorMsg = "Error de conexión al servidor";
        setError(errorMsg);
        setPhase("error");
        setIsImporting(false);
        addLog('error', errorMsg, true);
      };

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
      <DialogContent className="sm:max-w-lg" data-testid="dialog-dbf-import-progress">
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
              <ScrollArea className="h-32">
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
