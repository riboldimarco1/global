import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Loader2, AlertCircle } from "lucide-react";

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
  const eventSourceRef = useRef<EventSource | null>(null);

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
    if (!downloadInfo) return;

    try {
      const response = await fetch(`/api/export-download/${downloadInfo.exportId}`);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadInfo.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      handleClose();
    } catch (err) {
      setError("Error al descargar");
      setPhase("error");
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
            <Button 
              onClick={handleDownload} 
              className="w-full"
              data-testid="button-download-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar archivo comprimido
            </Button>
          )}

          {phase === "error" && (
            <Button 
              onClick={startExport} 
              variant="outline" 
              className="w-full"
              data-testid="button-retry-export"
            >
              Reintentar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
