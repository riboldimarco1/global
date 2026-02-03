import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { apiRequest } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";
import { Loader2, Trash2 } from "lucide-react";

interface BackupInfo {
  name: string;
  filename: string;
  fecha: string;
  hora: string;
  propietario: string;
  size: number;
  createdAt: string;
}

interface TableInfo {
  name: string;
  records: number;
}

interface BackupDialogsProps {
  action: "backup_salvar" | "backup_cargar" | "backup_eliminar" | null;
  onClose: () => void;
}

export function BackupDialogs({ action, onClose }: BackupDialogsProps) {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const { toast } = useToast();
  const { showPop } = useMyPop();

  useEffect(() => {
    if (action === "backup_cargar" || action === "backup_eliminar") {
      loadBackups();
    }
  }, [action]);

  useEffect(() => {
    if (selectedBackup && action === "backup_cargar") {
      loadTables(selectedBackup);
    }
  }, [selectedBackup, action]);

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

  const loadTables = async (backupName: string) => {
    try {
      const response = await fetch(`/api/backups/${backupName}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTables(data);
      }
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const propietario = getStoredUsername() || "sistema";
      const result = await apiRequest("POST", "/api/backups", { propietario });
      const data = await result.json();
      toast({ title: "Respaldo creado", description: data.message });
      onClose();
    } catch (error) {
      showPop({ title: "Error", message: "No se pudo crear el respaldo" });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) {
      showPop({ title: "Selección requerida", message: "Por favor seleccione un respaldo" });
      return;
    }

    try {
      setLoading(true);
      const result = await apiRequest("POST", "/api/backups/restore", {
        backupName: selectedBackup,
        tableName: selectedTable === "all" ? undefined : selectedTable
      });
      const data = await result.json();
      
      if (data.errors && data.errors.length > 0) {
        showPop({ title: "Restauración parcial", message: data.errors.join("\n") });
      } else {
        toast({ title: "Respaldo restaurado", description: data.message });
      }
      
      onClose();
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      showPop({ title: "Error", message: "No se pudo restaurar el respaldo" });
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

  if (action === "backup_salvar") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Respaldo</DialogTitle>
            <DialogDescription>
              Se creará un respaldo de todas las tablas del sistema con la fecha y hora actual.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              El respaldo incluirá: parámetros, administración, bancos, cheques, cosecha, almacén, transferencias, centrales, fincas y configuración.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Respaldo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === "backup_cargar") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cargar Respaldo</DialogTitle>
            <DialogDescription>
              Seleccione el respaldo a restaurar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {backups.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay respaldos disponibles
                </p>
              )}
              {backups.map((b) => (
                <div 
                  key={b.name} 
                  className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                    selectedBackup === b.name 
                      ? "bg-primary/10 border-primary" 
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedBackup(b.name)}
                >
                  <div className="text-sm">
                    <div className="font-medium">{formatDateTime(b)}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.propietario} - {formatSize(b.size)}
                    </div>
                  </div>
                  {selectedBackup === b.name && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
            
            {selectedBackup && tables.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tabla a restaurar</label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las tablas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las tablas</SelectItem>
                    {tables.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} ({t.records} registros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={loading || !selectedBackup}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === "backup_eliminar") {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-lg">
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
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(b.name)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
