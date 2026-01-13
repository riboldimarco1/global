import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getWeekDateRange, formatDateSpanish, getAvailableWeeks } from "@/lib/weekUtils";

interface WeekFilterProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  onGeneratePdf: () => void;
  isGeneratingPdf: boolean;
  totalsChartButton?: React.ReactNode;
}

export function WeekFilter({ 
  selectedWeek, 
  onWeekChange, 
  onGeneratePdf, 
  isGeneratingPdf,
  totalsChartButton,
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

          <Badge variant="secondary" className="ml-2 gap-1 px-3 py-1.5">
            <Calendar className="h-3 w-3" />
            <span data-testid="text-date-range">
              {formatDateSpanish(start)} - {formatDateSpanish(end)}
            </span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalsChartButton}
          <Button
            variant="outline"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            data-testid="button-generate-pdf"
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
