import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle, Loader2, AlertCircle, FolderOpen } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";

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
  const [customFilename, setCustomFilename] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const supportsFilePicker = typeof window !== "undefined" && "showSaveFilePicker" in window;

  useEffect(() => {
    if (open && !isExporting && !downloadInfo) {
      startExport();
    }
  }, [open]);

  // Cleanup on unmount or close
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
    onClose();
  };

  const startExport = () => {
    setIsExporting(true);
    setPhase("");
    setDetail("");
    setProgress(0);
    setDownloadInfo(null);
    setError(null);

    const eventSource = new EventSource("/api/export-all-data-progress");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.phase === "complete") {
        setDownloadInfo({ exportId: data.exportId, filename: data.filename });
        setCustomFilename(data.filename.replace(".tar.gz", ""));
        setPhase("complete");
        setDetail("Listo para descargar");
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
    
    const finalFilename = customFilename.trim() ? `${customFilename.trim()}.tar.gz` : downloadInfo.filename;
    
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
          setDownloadProgress(Math.round((received / total) * 100));
        }
        
        blob = new Blob(chunks, { type: 'application/gzip' });
      } else {
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
              accept: { "application/gzip": [".tar.gz", ".gz"] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (pickerError: any) {
          if (pickerError.name === "AbortError") {
            setIsDownloading(false);
            setDownloadProgress(0);
            return;
          }
          downloadWithFallback();
        }
      } else {
        downloadWithFallback();
      }
      
      handleClose();
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
    return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "loading": return "Cargando tablas";
      case "preparing": return "Preparando datos";
      case "compressing": return "Comprimiendo";
      case "complete": return "Completado";
      case "error": return "Error";
      default: return "Iniciando...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-export-progress">
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
          
          <Progress value={progress} className="h-2" data-testid="progress-export" />
          
          <div className="text-center text-xs text-muted-foreground">
            {progress}% completado
          </div>

          {phase === "complete" && downloadInfo && (
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
                    data-testid="input-export-filename"
                  />
                  <span className="text-sm text-muted-foreground">.tar.gz</span>
                </div>
                {supportsFilePicker && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    Podrás elegir dónde guardar el archivo
                  </p>
                )}
              </div>
              
              {isDownloading && (
                <>
                  <Progress value={downloadProgress} className="h-2" data-testid="progress-download" />
                  <div className="text-center text-xs text-muted-foreground">
                    Descargando... {downloadProgress}%
                  </div>
                </>
              )}
              <MyButtonStyle 
                color="green"
                onClick={handleDownload} 
                className="w-full"
                disabled={!customFilename.trim()}
                loading={isDownloading}
                data-testid="button-download-export"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
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
