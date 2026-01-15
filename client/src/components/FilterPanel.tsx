import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, Building2, Tractor, Filter } from "lucide-react";
import { getWeekDateRange, formatDateSpanish, getAvailableWeeks } from "@/lib/weekUtils";
import type { Central } from "@shared/schema";

interface FilterPanelProps {
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  selectedCentral: string;
  onCentralChange: (central: string) => void;
  centrales: Central[];
  selectedFinca: string;
  onFincaChange: (finca: string) => void;
  fincas: string[];
}

export function FilterPanel({ 
  selectedWeek, 
  onWeekChange, 
  selectedCentral,
  onCentralChange,
  centrales,
  selectedFinca,
  onFincaChange,
  fincas,
}: FilterPanelProps) {
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
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
              <SelectItem value="0" data-testid="option-week-todas">
                Todas las semanas
              </SelectItem>
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

          {selectedWeek > 0 && (
            <Badge variant="secondary" className="gap-1 px-3 py-1.5">
              <Calendar className="h-3 w-3" />
              <span data-testid="text-date-range">
                {formatDateSpanish(start)} - {formatDateSpanish(end)}
              </span>
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedCentral} 
              onValueChange={onCentralChange}
            >
              <SelectTrigger className="w-[130px]" data-testid="select-central">
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

          <div className="flex items-center gap-2">
            <Tractor className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedFinca} 
              onValueChange={onFincaChange}
            >
              <SelectTrigger className="w-[130px]" data-testid="select-finca-filter">
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
      </CardContent>
    </Card>
  );
}
