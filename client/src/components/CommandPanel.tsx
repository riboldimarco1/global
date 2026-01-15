import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Upload, BarChart3, Database, RotateCcw } from "lucide-react";

interface CommandPanelProps {
  onGeneratePdf: () => void;
  onGenerateAllPdf: () => void;
  onUploadPalmar: (files: File[]) => void;
  onUploadPortuguesa: (files: File[]) => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
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
  return (
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
              onClick={onBackup}
              disabled={isBackingUp}
              data-testid="button-backup"
              className="gap-1"
            >
              <Database className="h-3 w-3" />
              {isBackingUp ? "..." : "Respaldar"}
            </Button>
            <label>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onRestore(file);
                    e.target.value = "";
                  }
                }}
                data-testid="input-restore"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isRestoring}
                data-testid="button-restore"
                className="gap-1"
                asChild
              >
                <span>
                  <RotateCcw className="h-3 w-3" />
                  {isRestoring ? "..." : "Restaurar"}
                </span>
              </Button>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
