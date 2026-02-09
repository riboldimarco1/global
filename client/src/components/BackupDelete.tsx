import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileArchive, Trash2 } from "lucide-react";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";
import { apiRequest } from "@/lib/queryClient";

interface BackupFile {
  filename: string;
  size: number;
  date: string;
}

interface BackupDeleteProps {
  open: boolean;
  onClose: () => void;
}

export function BackupDelete({ open, onClose }: BackupDeleteProps) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (filename: string) => {
    showPop({
      title: "Confirmar eliminación",
      message: `¿Está seguro que desea eliminar el respaldo "${filename}"? Esta acción no se puede deshacer.`,
      onConfirm: () => doDelete(filename),
      confirmText: "Eliminar",
    });
  };

  const doDelete = async (filename: string) => {
    setDeleting(filename);
    try {
      await apiRequest("DELETE", `/api/backup/${encodeURIComponent(filename)}`);
      setBackups(prev => prev.filter(b => b.filename !== filename));
      showPop({ title: "Eliminado", message: `El respaldo "${filename}" fue eliminado exitosamente.` });
    } catch {
      showPop({ title: "Error", message: "No se pudo eliminar el respaldo." });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} modal={false}>
      <DialogContent
        className={`sm:max-w-lg ${windowStyle}`}
        data-testid="dialog-backup-delete"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Eliminar respaldos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground mb-2">
            Seleccione el respaldo que desea eliminar del servidor:
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando lista...</span>
            </div>
          ) : backups.length > 0 ? (
            <ScrollArea className="h-64 border rounded-md">
              <div className="p-2 space-y-1">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="flex items-center gap-2 p-2 rounded-md hover-elevate border"
                    data-testid={`backup-delete-item-${b.filename}`}
                  >
                    <FileArchive className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{b.filename}</div>
                      <div className="text-[10px] text-muted-foreground">{formatSize(b.size)}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <MyButtonStyle
                        color="red"
                        loading={deleting === b.filename}
                        disabled={deleting !== null}
                        onClick={() => handleDelete(b.filename)}
                        data-testid={`button-delete-backup-${b.filename}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </MyButtonStyle>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
