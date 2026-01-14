import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, ChevronLeft, ChevronRight, Calendar, Building2, Tractor, Upload } from "lucide-react";
import { getWeekDateRange, formatDateSpanish, getAvailableWeeks } from "@/lib/weekUtils";
import type { Central } from "@shared/schema";

interface WeekFilterProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  selectedCentral: string;
  onCentralChange: (central: string) => void;
  centrales: Central[];
  selectedFinca: string;
  onFincaChange: (finca: string) => void;
  fincas: string[];
  onGeneratePdf: () => void;
  onGenerateAllPdf: () => void;
  onUploadPalmar: (files: File[]) => void;
  onUploadPortuguesa: (files: File[]) => void;
  isUploading?: boolean;
  isUploadingPortuguesa?: boolean;
  isGeneratingPdf: boolean;
  isPdfDisabled?: boolean;
  totalsChartButton?: React.ReactNode;
  dailyChartButton?: React.ReactNode;
  cumulativeChartButton?: React.ReactNode;
  gradeChartButton?: React.ReactNode;
}

export function WeekFilter({ 
  selectedWeek, 
  onWeekChange, 
  selectedCentral,
  onCentralChange,
  centrales,
  selectedFinca,
  onFincaChange,
  fincas,
  onGeneratePdf, 
  onGenerateAllPdf,
  onUploadPalmar,
  onUploadPortuguesa,
  isUploading = false,
  isUploadingPortuguesa = false,
  isGeneratingPdf,
  isPdfDisabled = false,
  totalsChartButton,
  dailyChartButton,
  cumulativeChartButton,
  gradeChartButton,
}: WeekFilterProps) {
  const availableWeeks = getAvailableWeeks();
  const { start, end } = getWeekDateRange(selectedWeek);

  const handlePrevWeek = () => {
    if (selectedWeek > 1) {
      onWeekChange(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < availableWeeks.length) {
      onWeekChange(selectedWeek + 1);
    }
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevWeek}
            disabled={selectedWeek <= 1}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select 
            value={selectedWeek.toString()} 
            onValueChange={(val) => onWeekChange(parseInt(val))}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-week">
              <SelectValue placeholder="Seleccionar semana" />
            </SelectTrigger>
            <SelectContent>
              {availableWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()} data-testid={`option-week-${week}`}>
                  Semana {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            disabled={selectedWeek >= availableWeeks.length}
            data-testid="button-next-week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Badge variant="secondary" className="gap-1 px-3 py-1.5">
            <Calendar className="h-3 w-3" />
            <span data-testid="text-date-range">
              {formatDateSpanish(start)} - {formatDateSpanish(end)}
            </span>
          </Badge>

          <div className="flex items-center gap-2 ml-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedCentral} 
              onValueChange={onCentralChange}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-central">
                <SelectValue placeholder="Central" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" data-testid="option-central-todas">
                  Todas
                </SelectItem>
                {centrales.map((central) => (
                  <SelectItem key={central.id} value={central.nombre} data-testid={`option-central-${central.nombre}`}>
                    {central.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <Tractor className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedFinca} 
              onValueChange={onFincaChange}
            >
              <SelectTrigger className="w-[140px]" data-testid="select-finca-filter">
                <SelectValue placeholder="Finca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" data-testid="option-finca-todas">
                  Todas
                </SelectItem>
                {fincas.map((finca) => (
                  <SelectItem key={finca} value={finca} data-testid={`option-finca-${finca}`}>
                    {finca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalsChartButton}
          {dailyChartButton}
          {cumulativeChartButton}
          {gradeChartButton}
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
              disabled={isUploadingPortuguesa}
              data-testid="button-upload-portuguesa"
              className="gap-2"
              asChild
            >
              <span>
                <Upload className="h-4 w-4" />
                {isUploadingPortuguesa ? "Cargando..." : "Cargar Portuguesa"}
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
              disabled={isUploading}
              data-testid="button-upload-palmar"
              className="gap-2"
              asChild
            >
              <span>
                <Upload className="h-4 w-4" />
                {isUploading ? "Cargando..." : "Cargar Palmar"}
              </span>
            </Button>
          </label>
          <Button
            variant="outline"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf || isPdfDisabled}
            data-testid="button-generate-pdf"
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            PDF Semana
          </Button>
          <Button
            variant="outline"
            onClick={onGenerateAllPdf}
            disabled={isGeneratingPdf || isPdfDisabled}
            data-testid="button-generate-all-pdf"
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            PDF Todas
          </Button>
        </div>
      </div>
    </div>
  );
}
