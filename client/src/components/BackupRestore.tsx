import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Loader2, AlertCircle, FileArchive, FileText, FileUp, Download, RotateCcw, Table2, ArrowLeft } from "lucide-react";
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
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedBackupFilename, setSelectedBackupFilename] = useState<string>("");
  const [loadingTables, setLoadingTables] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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
    setAvailableTables([]);
    setSelectedBackupFilename("");
    setPendingFile(null);
    onClose();
  };

  const showTableSelection = async (filename: string) => {
    setLoadingTables(true);
    setSelectedBackupFilename(filename);
    setPendingFile(null);
    try {
      const res = await fetch(`/api/backup/tables/${encodeURIComponent(filename)}`);
      if (!res.ok) {
        showPop({ title: "Error", message: "No se pudo leer las tablas del respaldo" });
        setSelectedBackupFilename("");
        return;
      }
      const data = await res.json();
      const tables = data.tables || [];
      if (tables.length === 0) {
        showPop({ title: "Error", message: "El respaldo no contiene tablas" });
        setSelectedBackupFilename("");
        return;
      }
      setAvailableTables(tables);
      setPhase("select_table");
    } catch {
      showPop({ title: "Error", message: "No se pudo leer las tablas del respaldo" });
      setSelectedBackupFilename("");
    } finally {
      setLoadingTables(false);
    }
  };

  const showTableSelectionFromFile = async (file: File) => {
    setLoadingTables(true);
    setPendingFile(file);
    setSelectedBackupFilename(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/backup/tables-upload', { method: 'POST', body: formData });
      if (!res.ok) {
        showPop({ title: "Error", message: "No se pudo leer las tablas del archivo" });
        setPendingFile(null);
        setSelectedBackupFilename("");
        return;
      }
      const data = await res.json();
      const tables = data.tables || [];
      if (tables.length === 0) {
        showPop({ title: "Error", message: "El archivo no contiene tablas" });
        setPendingFile(null);
        setSelectedBackupFilename("");
        return;
      }
      setAvailableTables(tables);
      setPhase("select_table");
    } catch {
      showPop({ title: "Error", message: "No se pudo leer las tablas del archivo" });
      setPendingFile(null);
      setSelectedBackupFilename("");
    } finally {
      setLoadingTables(false);
    }
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

  const restoreFromServer = async (filename: string, onlyTable?: string) => {
    setIsRestoring(true);
    setPhase("restoring");
    const tableLabel = onlyTable ? ` (tabla: ${onlyTable})` : " (todas las tablas)";
    setDetail(`Iniciando restauración de ${filename}${tableLabel}...`);
    setProgress(0);
    setLogs([]);
    addLog('info', `Restaurando desde: ${filename}${tableLabel}`);

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

    let url = `/api/backup/restore/${encodeURIComponent(filename)}`;
    if (onlyTable) url += `?table=${encodeURIComponent(onlyTable)}`;
    xhr.open('POST', url);
    xhr.send();
  };

  const restoreFromFile = async (file: File, onlyTable?: string) => {
    setIsRestoring(true);
    setPhase("restoring");
    const tableLabel = onlyTable ? ` (tabla: ${onlyTable})` : " (todas las tablas)";
    setDetail(`Subiendo y restaurando ${file.name}${tableLabel}...`);
    setProgress(0);
    setLogs([]);
    addLog('info', `Restaurando desde archivo externo: ${file.name}${tableLabel}`);

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

    let url = '/api/backup/restore-upload';
    if (onlyTable) url += `?table=${encodeURIComponent(onlyTable)}`;
    xhr.open('POST', url);
    xhr.send(formData);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showPop({ title: "Error", message: "El archivo debe ser .zip" });
      return;
    }
    showTableSelectionFromFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRestore = (onlyTable?: string) => {
    if (pendingFile) {
      restoreFromFile(pendingFile, onlyTable);
    } else if (selectedBackupFilename) {
      restoreFromServer(selectedBackupFilename, onlyTable);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                        <FileArchive className="h-4 w-4 text-blue-800 dark:text-blue-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{b.filename}</div>
                          <div className="text-[10px] text-muted-foreground">{formatSize(b.size)}</div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <MyButtonStyle
                            color="green"
                            loading={loadingTables && selectedBackupFilename === b.filename}
                            onClick={() => showTableSelection(b.filename)}
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

          {phase === "select_table" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <MyButtonStyle
                  color="gray"
                  onClick={() => {
                    setPhase("list");
                    setAvailableTables([]);
                    setSelectedBackupFilename("");
                    setPendingFile(null);
                  }}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Volver
                </MyButtonStyle>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {selectedBackupFilename}
                </span>
              </div>

              <MyButtonStyle
                color="green"
                className="w-full"
                onClick={() => startRestore()}
                data-testid="button-restore-all-tables"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar todas las tablas ({availableTables.length})
              </MyButtonStyle>

              <div className="text-xs text-muted-foreground">
                O seleccione una tabla individual:
              </div>

              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {availableTables.map((table) => (
                    <div
                      key={table}
                      className="flex items-center gap-2 p-2 rounded-md hover-elevate border cursor-pointer"
                      onClick={() => startRestore(table)}
                      data-testid={`button-restore-table-${table}`}
                    >
                      <Table2 className="h-4 w-4 text-blue-800 dark:text-blue-300 flex-shrink-0" />
                      <span className="text-xs font-medium flex-1">{table}</span>
                      <RotateCcw className="h-3 w-3 text-green-800 dark:text-green-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {(phase === "restoring" || phase === "extracting" || phase === "complete" || phase === "error") && (
            <>
              <div className="flex items-center gap-3">
                {phase === "complete" ? (
                  <CheckCircle className="h-5 w-5 text-green-800 dark:text-green-300" />
                ) : phase === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-800 dark:text-red-300" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-800 dark:text-blue-300" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {phase === "complete" ? "Restauración completada" : phase === "error" ? "Error" : "Restaurando..."}
                  </div>
                  <div className="text-xs text-muted-foreground">{detail}</div>
                  {currentTable && phase !== "complete" && phase !== "error" && (
                    <div className="text-xs text-blue-800 dark:text-blue-300 font-bold mt-1 flex items-center gap-1">
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
                            log.type === 'error' ? 'text-red-800 dark:text-red-300 font-bold' :
                            log.type === 'success' ? 'text-green-800 dark:text-green-300 font-bold' :
                            log.type === 'file' ? 'text-blue-800 dark:text-blue-300 font-bold' :
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
