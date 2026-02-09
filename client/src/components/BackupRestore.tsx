import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertCircle, FileArchive, FileText, FileUp, Download, RotateCcw } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'file';
  message: string;
}

interface BackupFile {
  filename: string;
  size: number;
  date: string;
}

interface BackupRestoreProps {
  open: boolean;
  onClose: () => void;
}

export function BackupRestore({ open, onClose }: BackupRestoreProps) {
  const [phase, setPhase] = useState<string>("list");
  const [detail, setDetail] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (open) {
      loadBackups();
    }
  }, [open]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      showPop({ title: "Error", message: "No se pudo cargar la lista de respaldos" });
    } finally {
      setLoading(false);
    }
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const handleClose = () => {
    if (isRestoring) return;
    setPhase("list");
    setDetail("");
    setProgress(0);
    setLogs([]);
    setCurrentTable(null);
    onClose();
  };

  const processSSELine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    try {
      const data = JSON.parse(line.slice(6));

      if (data.phase === 'complete') {
        setPhase('complete');
        setDetail(data.detail);
        setProgress(100);
        setCurrentTable(null);
        addLog('success', data.detail);
        setIsRestoring(false);
      } else if (data.phase === 'error') {
        setPhase('error');
        setDetail(data.detail);
        setIsRestoring(false);
        addLog('error', data.detail);
      } else if (data.phase === 'table_done') {
        addLog('success', data.detail);
        setCurrentTable(null);
        if (data.progress !== undefined) setProgress(data.progress);
      } else if (data.phase === 'table_error') {
        addLog('error', data.detail);
        if (data.progress !== undefined) setProgress(data.progress);
      } else if (data.phase === 'restoring') {
        setCurrentTable(data.table);
        setDetail(data.detail);
        addLog('file', data.detail);
        if (data.progress !== undefined) setProgress(data.progress);
      } else {
        setPhase(data.phase);
        setDetail(data.detail);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.phase === 'extracting') {
          addLog('info', data.detail);
        }
      }
    } catch {
    }
  };

  const restoreFromServer = async (filename: string) => {
    setIsRestoring(true);
    setPhase("restoring");
    setDetail(`Iniciando restauración de ${filename}...`);
    setProgress(0);
    setLogs([]);
    addLog('info', `Restaurando desde: ${filename}`);

    const xhr = new XMLHttpRequest();
    let lastLen = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newText = xhr.responseText.substring(lastLen);
        lastLen = xhr.responseText.length;
        if (newText) {
          for (const line of newText.split('\n')) {
            if (line.trim()) processSSELine(line);
          }
        }
      }
      if (xhr.readyState === 4 && xhr.status !== 200) {
        setPhase("error");
        setDetail("Error de conexión con el servidor");
        setIsRestoring(false);
        addLog('error', 'Error de conexión con el servidor');
      }
    };

    xhr.onerror = () => {
      setPhase("error");
      setDetail("Error de conexión");
      setIsRestoring(false);
      addLog('error', 'Error de conexión');
    };

    xhr.open('POST', `/api/backup/restore/${encodeURIComponent(filename)}`);
    xhr.send();
  };

  const restoreFromFile = async (file: File) => {
    setIsRestoring(true);
    setPhase("restoring");
    setDetail(`Subiendo y restaurando ${file.name}...`);
    setProgress(0);
    setLogs([]);
    addLog('info', `Restaurando desde archivo externo: ${file.name}`);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    let lastLen = 0;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = (event.loaded / event.total) * 5;
        setProgress(pct);
        setDetail(`Subiendo: ${Math.round(pct / 5 * 100)}%`);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const newText = xhr.responseText.substring(lastLen);
        lastLen = xhr.responseText.length;
        if (newText) {
          for (const line of newText.split('\n')) {
            if (line.trim()) processSSELine(line);
          }
        }
      }
      if (xhr.readyState === 4 && xhr.status !== 200) {
        setPhase("error");
        setDetail("Error de conexión con el servidor");
        setIsRestoring(false);
        addLog('error', 'Error de conexión con el servidor');
      }
    };

    xhr.onerror = () => {
      setPhase("error");
      setDetail("Error de conexión");
      setIsRestoring(false);
      addLog('error', 'Error de conexión');
    };

    xhr.open('POST', '/api/backup/restore-upload');
    xhr.send(formData);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showPop({ title: "Error", message: "El archivo debe ser .zip" });
      return;
    }
    restoreFromFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        data-testid="dialog-backup-restore"
        onInteractOutside={(e) => { if (isRestoring) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isRestoring) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Cargar respaldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {phase === "list" && (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                Seleccione un respaldo del servidor o cargue uno desde su PC:
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Cargando lista...</span>
                </div>
              ) : backups.length > 0 ? (
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-2 space-y-1">
                    {backups.map((b) => (
                      <div
                        key={b.filename}
                        className="flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer border"
                        data-testid={`backup-item-${b.filename}`}
                      >
                        <FileArchive className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{b.filename}</div>
                          <div className="text-[10px] text-muted-foreground">{formatSize(b.size)}</div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <MyButtonStyle
                            color="green"
                            onClick={() => restoreFromServer(b.filename)}
                            data-testid={`button-restore-${b.filename}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurar
                          </MyButtonStyle>
                          <a
                            href={`/api/backup/download/${encodeURIComponent(b.filename)}`}
                            download={b.filename}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 border-2 border-blue-700 px-2 py-1 text-xs text-white font-medium hover:bg-blue-700"
                            data-testid={`button-download-${b.filename}`}
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-6 border rounded-md">
                  No hay respaldos en el servidor
                </div>
              )}

              <div className="border-t pt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".zip"
                  className="hidden"
                  data-testid="input-backup-file"
                />
                <MyButtonStyle
                  color="cyan"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-backup"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Cargar respaldo desde PC
                </MyButtonStyle>
              </div>
            </>
          )}

          {(phase === "restoring" || phase === "extracting" || phase === "complete" || phase === "error") && (
            <>
              <div className="flex items-center gap-3">
                {phase === "complete" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : phase === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {phase === "complete" ? "Restauración completada" : phase === "error" ? "Error" : "Restaurando..."}
                  </div>
                  <div className="text-xs text-muted-foreground">{detail}</div>
                  {currentTable && phase !== "complete" && phase !== "error" && (
                    <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Tabla actual: {currentTable}
                    </div>
                  )}
                </div>
              </div>

              <Progress value={progress} className="h-2" data-testid="progress-backup-restore" />
              <div className="text-center text-xs text-muted-foreground">
                {progress.toFixed(0)}% completado
              </div>

              {logs.length > 0 && (
                <div className="border rounded-md">
                  <div className="px-3 py-2 bg-muted text-xs font-medium border-b">
                    Log de restauración
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

              {phase === "complete" && (
                <MyButtonStyle
                  color="green"
                  onClick={() => {
                    handleClose();
                    setTimeout(() => window.location.reload(), 500);
                  }}
                  className="w-full"
                  data-testid="button-close-backup-restore"
                >
                  Cerrar y recargar
                </MyButtonStyle>
              )}

              {phase === "error" && (
                <MyButtonStyle
                  color="yellow"
                  onClick={() => {
                    setPhase("list");
                    setLogs([]);
                    setProgress(0);
                    setDetail("");
                  }}
                  className="w-full"
                  data-testid="button-retry-backup-restore"
                >
                  Volver a la lista
                </MyButtonStyle>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
