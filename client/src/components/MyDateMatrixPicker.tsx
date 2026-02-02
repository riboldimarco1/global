import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, X } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const START_YEAR = 2010;
const STORAGE_KEY = "date-matrix-picker-size";

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
  const yyyy = String(year);
  return `${yyyy}-${mm}-${dd}`;
}

function parseYearMonth(dateStr: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  return { year, month };
}

function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [yyyy, mm, dd] = parts;
  const yy = yyyy.slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function parseDisplayDate(displayDate: string): string | null {
  if (!displayDate) return null;
  const match = displayDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yy, 10) + 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function autoFormatDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function MyDateMatrixPicker({ value, onChange, className }: MyDateMatrixPickerProps) {
  const [open, setOpen] = useState(false);
  const [firstSelection, setFirstSelection] = useState<{ year: number; month: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ year: number; month: number } | null>(null);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= START_YEAR; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  // Calculate minimum size to fit all years
  const ROW_HEIGHT = 28;
  const HEADER_HEIGHT = 120; // Header + toolbar + input fields
  const MIN_WIDTH = 750;
  const minHeight = Math.min(years.length * ROW_HEIGHT + HEADER_HEIGHT, window.innerHeight * 0.9);
  const minWidth = Math.min(MIN_WIDTH, window.innerWidth * 0.95);
  
  const [size, setSize] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure minimum size to fit all content
        return {
          width: Math.max(parsed.width, minWidth),
          height: Math.max(parsed.height, minHeight)
        };
      }
    } catch {}
    return { width: minWidth, height: minHeight };
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const startSelection = useMemo(() => parseYearMonth(value.start), [value.start]);
  const endSelection = useMemo(() => parseYearMonth(value.end), [value.end]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
    } catch {}
  }, [size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      const newWidth = Math.max(minWidth, resizeStart.current.width + deltaX);
      const newHeight = Math.max(minHeight, resizeStart.current.height + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, minHeight]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      setPosition({
        x: dragStart.current.posX + deltaX,
        y: dragStart.current.posY + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Reset position when opening
  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
      setManualStart(formatDateForDisplay(value.start));
      setManualEnd(formatDateForDisplay(value.end));
    }
  }, [open, value.start, value.end]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    setIsDragging(true);
  };

  const handleManualDateChange = useCallback((field: "start" | "end", inputValue: string) => {
    const formatted = autoFormatDate(inputValue);
    if (field === "start") {
      setManualStart(formatted);
    } else {
      setManualEnd(formatted);
    }
    const parsed = parseDisplayDate(formatted);
    if (parsed) {
      if (field === "start") {
        onChange({ start: parsed, end: value.end || parsed });
      } else {
        onChange({ start: value.start || parsed, end: parsed });
      }
      setFirstSelection(null);
    }
  }, [onChange, value.start, value.end]);

  const handleCurrentYear = useCallback(() => {
    const year = new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    onChange({ start, end });
    setManualStart(formatDateForDisplay(start));
    setManualEnd(formatDateForDisplay(end));
    setOpen(false);
  }, [onChange]);

  const handleOneYearAgo = useCallback(() => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const start = `${oneYearAgo.getFullYear()}-${String(oneYearAgo.getMonth() + 1).padStart(2, "0")}-${String(oneYearAgo.getDate()).padStart(2, "0")}`;
    const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onChange({ start, end });
    setManualStart(formatDateForDisplay(start));
    setManualEnd(formatDateForDisplay(end));
    setOpen(false);
  }, [onChange]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    setIsResizing(true);
  };

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
  }, [onChange]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setFirstSelection(null);
    setHoverCell(null);
  }, []);

  const displayText = useMemo(() => {
    if (value.start && value.end) {
      return `${formatDateForDisplay(value.start)} - ${formatDateForDisplay(value.end)}`;
    }
    if (value.start) {
      return `Desde ${formatDateForDisplay(value.start)}`;
    }
    return "Período";
  }, [value]);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className={`h-7 gap-1 text-xs ${className || ""}`}
        onClick={() => setOpen(true)}
        data-testid="date-matrix-trigger"
      >
        <Calendar className="h-3 w-3" />
        <span className="truncate max-w-[120px]">{displayText}</span>
      </Button>

      {open && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30"
          onClick={handleClose}
          data-testid="date-matrix-overlay"
        >
          <div 
            ref={windowRef}
            className="relative bg-card border rounded-lg shadow-xl flex flex-col"
            style={{
              width: size.width,
              height: size.height,
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="date-matrix-window"
          >
            <div 
              className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-t-lg border-b cursor-move select-none"
              onMouseDown={handleDragStart}
            >
              <span className="text-sm font-medium">Seleccionar Período</span>
              <div className="flex items-center gap-2">
                {(value.start || value.end) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={handleClear}
                    data-testid="date-matrix-clear"
                  >
                    Limpiar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleClose}
                  data-testid="date-matrix-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="px-3 py-1.5 text-xs text-muted-foreground text-center border-b bg-muted/30">
              {firstSelection 
                ? `Mes seleccionado: ${MONTHS[firstSelection.month]} ${firstSelection.year} - Haga click en otro mes para completar el rango` 
                : "Click: iniciar selección de rango | Doble click: seleccionar mes único"}
            </div>

            <div className="flex items-center gap-4 px-3 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Fecha inicial:</label>
                <input
                  type="text"
                  value={manualStart}
                  onChange={(e) => handleManualDateChange("start", e.target.value)}
                  placeholder="dd/mm/aa"
                  className="w-24 h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="date-input-start"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Fecha final:</label>
                <input
                  type="text"
                  value={manualEnd}
                  onChange={(e) => handleManualDateChange("end", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setOpen(false); }}
                  placeholder="dd/mm/aa"
                  className="w-24 h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="date-input-end"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCurrentYear}
                  data-testid="date-current-year"
                >
                  Año actual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleOneYearAgo}
                  data-testid="date-one-year-ago"
                >
                  Hace un año
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-2">
              <table className="border-collapse text-sm w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 bg-card z-20 px-3 py-2 font-semibold text-muted-foreground border-b text-left">
                      Año
                    </th>
                    {MONTHS.map((month, idx) => (
                      <th 
                        key={idx} 
                        className="sticky top-0 bg-card z-10 px-2 py-2 font-medium text-muted-foreground border-b whitespace-nowrap text-center"
                      >
                        {month.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {years.map((year) => (
                    <tr key={year} className="hover:bg-muted/20">
                      <td className="sticky left-0 bg-card z-10 px-3 py-1.5 font-semibold text-primary border-r">
                        {year}
                      </td>
                      {MONTHS.map((_, monthIdx) => {
                        const inRange = isInRange(year, monthIdx);
                        const inPreview = isPreviewRange(year, monthIdx);
                        const isFirst = firstSelection?.year === year && firstSelection?.month === monthIdx;
                        
                        return (
                          <td
                            key={monthIdx}
                            className={`px-2 py-1.5 text-center cursor-pointer select-none transition-all
                              ${inRange ? "bg-primary/25 text-primary font-semibold" : ""}
                              ${inPreview && !inRange ? "bg-primary/15" : ""}
                              ${isFirst ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary ring-offset-1" : ""}
                              ${!inRange && !inPreview && !isFirst ? "hover:bg-muted" : ""}
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

            <div
              className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100"
              onMouseDown={handleResizeStart}
              data-testid="date-matrix-resize"
            >
              <svg className="w-full h-full text-muted-foreground" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22,22H20V20H22V22M22,18H20V16H22V18M18,22H16V20H18V22M18,18H16V16H18V18M14,22H12V20H14V22M22,14H20V12H22V14Z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
