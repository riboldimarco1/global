import { useState, useCallback, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const START_YEAR = 2010;

interface DateRange {
  start: string;
  end: string;
}

interface MyDateMatrixPickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(day: number, month: number, year: number): string {
  const dd = String(day).padStart(2, "0");
  const mm = String(month + 1).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  return { year, month };
}

export function MyDateMatrixPicker({ value, onChange, className }: MyDateMatrixPickerProps) {
  const [open, setOpen] = useState(false);
  const [firstSelection, setFirstSelection] = useState<{ year: number; month: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ year: number; month: number } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const result = [];
    for (let y = START_YEAR; y <= currentYear; y++) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  const startSelection = useMemo(() => parseYearMonth(value.start), [value.start]);
  const endSelection = useMemo(() => parseYearMonth(value.end), [value.end]);

  const isInRange = useCallback((year: number, month: number) => {
    if (!startSelection || !endSelection) return false;
    const cellValue = year * 12 + month;
    const startValue = startSelection.year * 12 + startSelection.month;
    const endValue = endSelection.year * 12 + endSelection.month;
    return cellValue >= startValue && cellValue <= endValue;
  }, [startSelection, endSelection]);

  const isPreviewRange = useCallback((year: number, month: number) => {
    if (!firstSelection || !hoverCell) return false;
    const cellValue = year * 12 + month;
    const firstValue = firstSelection.year * 12 + firstSelection.month;
    const hoverValue = hoverCell.year * 12 + hoverCell.month;
    const minVal = Math.min(firstValue, hoverValue);
    const maxVal = Math.max(firstValue, hoverValue);
    return cellValue >= minVal && cellValue <= maxVal;
  }, [firstSelection, hoverCell]);

  const handleCellClick = useCallback((year: number, month: number) => {
    if (!firstSelection) {
      setFirstSelection({ year, month });
    } else {
      const first = firstSelection;
      const second = { year, month };
      
      const firstValue = first.year * 12 + first.month;
      const secondValue = second.year * 12 + second.month;
      
      const [start, end] = firstValue <= secondValue ? [first, second] : [second, first];
      
      const startDate = formatDate(1, start.month, start.year);
      const lastDay = getLastDayOfMonth(end.year, end.month);
      const endDate = formatDate(lastDay, end.month, end.year);
      
      onChange({ start: startDate, end: endDate });
      setFirstSelection(null);
      setHoverCell(null);
      setOpen(false);
    }
  }, [firstSelection, onChange]);

  const handleDoubleClick = useCallback((year: number, month: number) => {
    const startDate = formatDate(1, month, year);
    const lastDay = getLastDayOfMonth(year, month);
    const endDate = formatDate(lastDay, month, year);
    
    onChange({ start: startDate, end: endDate });
    setFirstSelection(null);
    setHoverCell(null);
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange({ start: "", end: "" });
    setFirstSelection(null);
    setHoverCell(null);
    setOpen(false);
  }, [onChange]);

  const displayText = useMemo(() => {
    if (value.start && value.end) {
      return `${value.start} - ${value.end}`;
    }
    if (value.start) {
      return `Desde ${value.start}`;
    }
    return "Período";
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`h-7 gap-1 text-xs ${className || ""}`}
          data-testid="date-matrix-trigger"
        >
          <Calendar className="h-3 w-3" />
          <span className="truncate max-w-[120px]">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        align="start"
        data-testid="date-matrix-popover"
      >
        <div className="text-xs text-muted-foreground mb-2 text-center">
          {firstSelection 
            ? "Haga click en otro mes para completar el rango" 
            : "Click: seleccionar rango | Doble click: mes único"}
        </div>
        
        <div className="overflow-auto max-h-[400px]">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background z-10 px-2 py-1 font-semibold text-muted-foreground border-b">
                  Año
                </th>
                {MONTHS.map((month, idx) => (
                  <th 
                    key={idx} 
                    className="px-1 py-1 font-medium text-muted-foreground border-b whitespace-nowrap"
                  >
                    {month.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr key={year}>
                  <td className="sticky left-0 bg-background z-10 px-2 py-0.5 font-semibold text-primary border-r">
                    {year}
                  </td>
                  {MONTHS.map((_, monthIdx) => {
                    const inRange = isInRange(year, monthIdx);
                    const inPreview = isPreviewRange(year, monthIdx);
                    const isFirst = firstSelection?.year === year && firstSelection?.month === monthIdx;
                    
                    return (
                      <td
                        key={monthIdx}
                        className={`px-1 py-0.5 text-center cursor-pointer select-none transition-colors
                          ${inRange ? "bg-primary/20 text-primary font-medium" : ""}
                          ${inPreview && !inRange ? "bg-primary/10" : ""}
                          ${isFirst ? "bg-primary text-primary-foreground font-medium" : ""}
                          hover:bg-primary/30
                        `}
                        onClick={() => handleCellClick(year, monthIdx)}
                        onDoubleClick={() => handleDoubleClick(year, monthIdx)}
                        onMouseEnter={() => firstSelection && setHoverCell({ year, month: monthIdx })}
                        onMouseLeave={() => setHoverCell(null)}
                        data-testid={`date-cell-${year}-${monthIdx}`}
                      >
                        {MONTHS[monthIdx].slice(0, 3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(value.start || value.end) && (
          <div className="mt-2 flex justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={handleClear}
              data-testid="date-matrix-clear"
            >
              Limpiar selección
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
