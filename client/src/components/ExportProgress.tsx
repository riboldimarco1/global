import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle, Loader2, AlertCircle, FolderOpen, X } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface ExportProgressProps {
  open: boolean;
  onClose: () => void;
}

export function ExportProgress({ open, onClose }: ExportProgressProps) {
  const [phase, setPhase] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [downloadInfo, setDownloadInfo] = useState<{ exportId: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadDone, setDownloadDone] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";
  
  const supportsFilePicker = typeof window !== "undefined" && "showSaveFilePicker" in window;

  useEffect(() => {
    if (open && !isExporting && !downloadInfo && !downloadDone) {
      startExport();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleClose = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsExporting(false);
    setPhase("");
    setDetail("");
    setProgress(0);
    setDownloadInfo(null);
    setError(null);
    setCustomFilename("");
    setDownloadDone(false);
    setIsDownloading(false);
    setDownloadProgress(0);
    onClose();
  };

  const startExport = () => {
    setIsExporting(true);
    setPhase("");
    setDetail("");
    setProgress(0);
    setDownloadInfo(null);
    setError(null);
    setDownloadDone(false);

    const eventSource = new EventSource("/api/export-all-data-progress");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.phase === "complete") {
        setDownloadInfo({ exportId: data.exportId, filename: data.filename });
        setCustomFilename(data.filename.replace(".zip", ""));
        setPhase("ready");
        setDetail("Archivo listo para descargar");
        setProgress(100);
        eventSource.close();
        eventSourceRef.current = null;
        setIsExporting(false);
      } else if (data.phase === "error") {
        setError(data.detail);
        setPhase("error");
        eventSource.close();
        eventSourceRef.current = null;
        setIsExporting(false);
      } else {
        setPhase(data.phase);
        setDetail(data.detail);
        setProgress(data.progress);
      }
    };

    eventSource.onerror = () => {
      setError("Error de conexión");
      setPhase("error");
      eventSource.close();
      eventSourceRef.current = null;
      setIsExporting(false);
    };
  };

  const handleDownload = async () => {
    if (!downloadInfo || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setPhase("downloading");
    setDetail("Descargando archivo...");
    setProgress(0);
    
    const finalFilename = customFilename.trim() ? `${customFilename.trim()}.zip` : downloadInfo.filename;
    
    try {
      const response = await fetch(`/api/export-download/${downloadInfo.exportId}`);
      if (!response.ok) throw new Error("Download failed");
      
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let blob: Blob;
      
      if (total && response.body) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          received += value.length;
          const pct = Math.round((received / total) * 100);
          setDownloadProgress(pct);
          setProgress(pct);
          setDetail(`Descargando... ${(received / 1024).toFixed(0)} KB / ${(total / 1024).toFixed(0)} KB`);
        }
        
        blob = new Blob(chunks, { type: 'application/zip' });
      } else {
        setDetail("Descargando...");
        blob = await response.blob();
      }
      
      const downloadWithFallback = () => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      };

      if (supportsFilePicker) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: finalFilename,
            types: [{
              description: "Archivo comprimido",
              accept: { "application/zip": [".zip"] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (pickerError: any) {
          if (pickerError.name === "AbortError") {
            setIsDownloading(false);
            setDownloadProgress(0);
            setPhase("ready");
            setDetail("Archivo listo para descargar");
            setProgress(100);
            return;
          }
          downloadWithFallback();
        }
      } else {
        downloadWithFallback();
      }
      
      setPhase("complete");
      setDetail(`Archivo guardado: ${finalFilename}`);
      setProgress(100);
      setDownloadDone(true);
    } catch (err) {
      setError("Error al descargar");
      setPhase("error");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const getPhaseIcon = () => {
    if (phase === "complete") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (phase === "error") return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (phase === "ready") return <Download className="h-5 w-5 text-blue-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "loading": return "Cargando tablas";
      case "compressing": return "Comprimiendo";
      case "ready": return "Listo para descargar";
      case "downloading": return "Descargando";
      case "complete": return "Descarga completada";
      case "error": return "Error";
      default: return "Iniciando...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className={`sm:max-w-md ${windowStyle}`} data-testid="dialog-export-progress">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Datos
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
          
          <Progress value={progress} className="h-3" data-testid="progress-export" />
          
          <div className="text-center text-xs text-muted-foreground">
            {progress}% completado
          </div>

          {(phase === "ready" || phase === "downloading") && downloadInfo && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="export-filename" className="text-sm font-medium">
                  Nombre del archivo
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="export-filename"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="backup"
                    className="flex-1"
                    disabled={isDownloading}
                    data-testid="input-export-filename"
                  />
                  <span className="text-sm text-muted-foreground">.zip</span>
                </div>
                {supportsFilePicker && !isDownloading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    Podrás elegir dónde guardar el archivo
                  </p>
                )}
              </div>
              
              <MyButtonStyle 
                color="green"
                onClick={handleDownload} 
                className="w-full"
                disabled={!customFilename.trim() || isDownloading}
                loading={isDownloading}
                data-testid="button-download-export"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Descargando... {downloadProgress}%
                  </>
                ) : (
                  <>
                    {supportsFilePicker ? <FolderOpen className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    {supportsFilePicker ? "Guardar como..." : "Descargar archivo"}
                  </>
                )}
              </MyButtonStyle>
            </div>
          )}

          {phase === "complete" && downloadDone && (
            <MyButtonStyle 
              color="gray"
              onClick={handleClose} 
              className="w-full"
              data-testid="button-close-export"
            >
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </MyButtonStyle>
          )}

          {phase === "error" && (
            <MyButtonStyle 
              color="yellow"
              onClick={startExport} 
              className="w-full"
              data-testid="button-retry-export"
            >
              Reintentar
            </MyButtonStyle>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
