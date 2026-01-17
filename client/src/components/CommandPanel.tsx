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
  isWeeklyPdfDisabled?: boolean;
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
  isWeeklyPdfDisabled = false,
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
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader className="bg-primary/10 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b border-primary/20">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              Crear Respaldo
            </DialogTitle>
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
                className="bg-background border-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBackup} disabled={!backupName.trim() || isBackingUp} className="gap-1">
              <Database className="h-4 w-4" />
              {isBackingUp ? "Creando..." : "Crear Respaldo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="sm:max-w-md bg-card border-amber-500/20">
          <DialogHeader className="bg-amber-500/10 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b border-amber-500/20">
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <RotateCcw className="h-5 w-5" />
              Restaurar Respaldo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seleccionar respaldo</Label>
              {backups.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg">
                  <Database className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay respaldos disponibles</p>
                </div>
              ) : (
                <Select value={selectedBackupId} onValueChange={setSelectedBackupId}>
                  <SelectTrigger data-testid="select-backup" className="bg-background border-amber-500/30">
                    <SelectValue placeholder="Seleccione un respaldo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
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
          <DialogFooter className="gap-2 sm:gap-0 bg-amber-500/5 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRestore} 
              disabled={!selectedBackupId || isRestoring}
              className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RotateCcw className="h-4 w-4" />
              {isRestoring ? "Restaurando..." : "Restaurar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Gráficas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {totalsChartButton}
            {dailyChartButton}
            {cumulativeChartButton}
            {gradeChartButton}
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Cargar Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-4 w-4" />
            Reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGeneratePdf}
              disabled={isGeneratingPdf || isPdfDisabled || isWeeklyPdfDisabled}
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
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
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
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
