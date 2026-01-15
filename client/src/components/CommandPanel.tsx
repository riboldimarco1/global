import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Upload, BarChart3, Database, RotateCcw } from "lucide-react";

interface BackupInfo {
  id: string;
  nombre: string;
  fecha: string;
}

interface CommandPanelProps {
  onGeneratePdf: () => void;
  onGenerateAllPdf: () => void;
  onUploadPalmar: (files: File[]) => void;
  onUploadPortuguesa: (files: File[]) => void;
  onBackup: (nombre: string) => void;
  onRestore: (backupId: string) => void;
  backups: BackupInfo[];
  isUploading?: boolean;
  isUploadingPortuguesa?: boolean;
  isBackingUp?: boolean;
  isRestoring?: boolean;
  isGeneratingPdf: boolean;
  isPdfDisabled?: boolean;
  totalsChartButton?: React.ReactNode;
  dailyChartButton?: React.ReactNode;
  cumulativeChartButton?: React.ReactNode;
  gradeChartButton?: React.ReactNode;
  isAdmin?: boolean;
}

export function CommandPanel({ 
  onGeneratePdf, 
  onGenerateAllPdf,
  onUploadPalmar,
  onUploadPortuguesa,
  onBackup,
  onRestore,
  backups,
  isUploading = false,
  isUploadingPortuguesa = false,
  isBackingUp = false,
  isRestoring = false,
  isGeneratingPdf,
  isPdfDisabled = false,
  totalsChartButton,
  dailyChartButton,
  cumulativeChartButton,
  gradeChartButton,
  isAdmin = false,
}: CommandPanelProps) {
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [selectedBackupId, setSelectedBackupId] = useState("");

  const handleCreateBackup = () => {
    if (backupName.trim()) {
      onBackup(backupName.trim());
      setBackupName("");
      setShowBackupDialog(false);
    }
  };

  const handleRestore = () => {
    if (selectedBackupId) {
      onRestore(selectedBackupId);
      setSelectedBackupId("");
      setShowRestoreDialog(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Respaldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-name">Nombre del respaldo</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Ej: Respaldo semanal"
                data-testid="input-backup-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBackup} disabled={!backupName.trim() || isBackingUp}>
              {isBackingUp ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Respaldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleccionar respaldo</Label>
              {backups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay respaldos disponibles</p>
              ) : (
                <Select value={selectedBackupId} onValueChange={setSelectedBackupId}>
                  <SelectTrigger data-testid="select-backup">
                    <SelectValue placeholder="Seleccione un respaldo" />
                  </SelectTrigger>
                  <SelectContent>
                    {backups.map((backup) => (
                      <SelectItem key={backup.id} value={backup.id}>
                        {backup.nombre} - {formatDate(backup.fecha)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={!selectedBackupId || isRestoring}>
              {isRestoring ? "Restaurando..." : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Comandos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {totalsChartButton}
          {dailyChartButton}
          {cumulativeChartButton}
          {gradeChartButton}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Cargar Excel:</span>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    onUploadPortuguesa(Array.from(files));
                    e.target.value = "";
                  }
                }}
                data-testid="input-upload-portuguesa"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploadingPortuguesa}
                data-testid="button-upload-portuguesa"
                className="gap-1"
                asChild
              >
                <span>
                  <Upload className="h-3 w-3" />
                  {isUploadingPortuguesa ? "..." : "Portuguesa"}
                </span>
              </Button>
            </label>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    onUploadPalmar(Array.from(files));
                    e.target.value = "";
                  }
                }}
                data-testid="input-upload-palmar"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                data-testid="button-upload-palmar"
                className="gap-1"
                asChild
              >
                <span>
                  <Upload className="h-3 w-3" />
                  {isUploading ? "..." : "Palmar"}
                </span>
              </Button>
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Reportes:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf || isPdfDisabled}
            data-testid="button-generate-pdf"
            className="gap-1"
          >
            <FileDown className="h-3 w-3" />
            PDF Semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAllPdf}
            disabled={isGeneratingPdf || isPdfDisabled}
            data-testid="button-generate-all-pdf"
            className="gap-1"
          >
            <FileDown className="h-3 w-3" />
            PDF Todas
          </Button>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Datos:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBackupDialog(true)}
              disabled={isBackingUp}
              data-testid="button-backup"
              className="gap-1"
            >
              <Database className="h-3 w-3" />
              {isBackingUp ? "..." : "Respaldar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestoreDialog(true)}
              disabled={isRestoring}
              data-testid="button-restore"
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              {isRestoring ? "..." : "Restaurar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
