import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, BarChart3, Database, RotateCcw } from "lucide-react";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { useStyleMode } from "@/contexts/StyleModeContext";

interface BackupInfo {
  id: string;
  nombre: string;
  fecha: string;
}

interface CommandPanelProps {
  onUploadPalmar: (files: File[]) => void;
  onUploadPortuguesa: (files: File[]) => void;
  onBackup: (nombre: string) => void;
  onRestore: (backupId: string) => void;
  backups: BackupInfo[];
  isUploading?: boolean;
  isUploadingPortuguesa?: boolean;
  isBackingUp?: boolean;
  isRestoring?: boolean;
  totalsChartButton?: React.ReactNode;
  dailyChartButton?: React.ReactNode;
  cumulativeChartButton?: React.ReactNode;
  gradeChartButton?: React.ReactNode;
  reportButton?: React.ReactNode;
  weeklyReportButton?: React.ReactNode;
  isAdmin?: boolean;
}

export function CommandPanel({ 
  onUploadPalmar,
  onUploadPortuguesa,
  onBackup,
  onRestore,
  backups,
  isUploading = false,
  isUploadingPortuguesa = false,
  isBackingUp = false,
  isRestoring = false,
  totalsChartButton,
  dailyChartButton,
  cumulativeChartButton,
  gradeChartButton,
  reportButton,
  weeklyReportButton,
  isAdmin = false,
}: CommandPanelProps) {
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

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
        <DialogContent className={`sm:max-w-md bg-card border-primary/20 ${windowStyle}`}>
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
            <MyButtonStyle color="gray" onClick={() => setShowBackupDialog(false)}>
              Cancelar
            </MyButtonStyle>
            <MyButtonStyle color="blue" onClick={handleCreateBackup} disabled={!backupName.trim()} loading={isBackingUp}>
              <Database className="h-4 w-4" />
              {isBackingUp ? "Creando..." : "Crear Respaldo"}
            </MyButtonStyle>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className={`sm:max-w-md bg-card border-amber-500/20 ${windowStyle}`}>
          <DialogHeader className="bg-amber-500/10 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg border-b border-amber-500/20">
            <DialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
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
            <MyButtonStyle color="gray" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </MyButtonStyle>
            <MyButtonStyle 
              color="yellow"
              onClick={handleRestore} 
              disabled={!selectedBackupId}
              loading={isRestoring}
            >
              <RotateCcw className="h-4 w-4" />
              {isRestoring ? "Restaurando..." : "Restaurar"}
            </MyButtonStyle>
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
            {reportButton}
            {weeklyReportButton}
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
                <MyButtonStyle
                  color="cyan"
                  loading={isUploadingPortuguesa}
                  data-testid="button-upload-portuguesa"
                  className="cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  {isUploadingPortuguesa ? "..." : "Portuguesa"}
                </MyButtonStyle>
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
                <MyButtonStyle
                  color="cyan"
                  loading={isUploading}
                  data-testid="button-upload-palmar"
                  className="cursor-pointer"
                >
                  <Upload className="h-3 w-3" />
                  {isUploading ? "..." : "Palmar"}
                </MyButtonStyle>
              </label>
            </div>
          </CardContent>
        </Card>
      )}


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
              <MyButtonStyle
                color="blue"
                onClick={() => setShowBackupDialog(true)}
                loading={isBackingUp}
                data-testid="button-backup"
              >
                <Database className="h-3 w-3" />
                {isBackingUp ? "..." : "Respaldar"}
              </MyButtonStyle>
              <MyButtonStyle
                color="yellow"
                onClick={() => setShowRestoreDialog(true)}
                loading={isRestoring}
                data-testid="button-restore"
              >
                <RotateCcw className="h-3 w-3" />
                {isRestoring ? "..." : "Restaurar"}
              </MyButtonStyle>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
