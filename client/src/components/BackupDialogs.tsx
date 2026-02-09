import { useState, useEffect } from "react";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface BackupInfo {
  name: string;
  filename: string;
  fecha: string;
  hora: string;
  propietario: string;
  size: number;
  createdAt: string;
}

interface BackupDialogsProps {
  action: "backup_eliminar" | null;
  onClose: () => void;
}

export function BackupDialogs({ action, onClose }: BackupDialogsProps) {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  useEffect(() => {
    if (action === "backup_eliminar") {
      loadBackups();
    }
  }, [action]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/backups");
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (error) {
      showPop({ title: "Error", message: "No se pudieron cargar los respaldos" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (backupName: string) => {
    try {
      setLoading(true);
      const result = await apiRequest("DELETE", `/api/backups/${backupName}`);
      const data = await result.json();
      toast({ title: "Respaldo eliminado", description: data.message });
      await loadBackups();
      if (backups.length <= 1) {
        onClose();
      }
    } catch (error) {
      showPop({ title: "Error", message: "No se pudo eliminar el respaldo" });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (backup: BackupInfo) => {
    const date = new Date(backup.createdAt);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  if (action === "backup_eliminar") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className={`sm:max-w-lg ${windowStyle}`}>
          <DialogHeader>
            <DialogTitle>Eliminar Respaldos</DialogTitle>
            <DialogDescription>
              Seleccione los respaldos que desea eliminar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
            {backups.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay respaldos disponibles
              </p>
            )}
            {backups.map((b) => (
              <div 
                key={b.name} 
                className="flex items-center justify-between p-2 rounded border bg-muted/30"
              >
                <div className="text-sm">
                  <div className="font-medium">{formatDateTime(b)}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.propietario} - {formatSize(b.size)}
                  </div>
                </div>
                <MyButtonStyle 
                  color="red"
                  onClick={() => handleDelete(b.name)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </MyButtonStyle>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <MyButtonStyle color="gray" onClick={onClose}>
              Cerrar
            </MyButtonStyle>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
