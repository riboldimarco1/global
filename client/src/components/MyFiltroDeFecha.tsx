import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, RotateCcw, Check } from "lucide-react";

type FilterMode = 
  | "enero" | "febrero" | "marzo" | "abril" | "mayo" | "junio"
  | "julio" | "agosto" | "septiembre" | "octubre" | "noviembre" | "diciembre"
  | "ano_actual" | "hace_un_ano" | "cualquier_fecha";

const MONTHS: { value: FilterMode; label: string }[] = [
  { value: "enero", label: "Enero" },
  { value: "febrero", label: "Febrero" },
  { value: "marzo", label: "Marzo" },
  { value: "abril", label: "Abril" },
  { value: "mayo", label: "Mayo" },
  { value: "junio", label: "Junio" },
  { value: "julio", label: "Julio" },
  { value: "agosto", label: "Agosto" },
  { value: "septiembre", label: "Septiembre" },
  { value: "octubre", label: "Octubre" },
  { value: "noviembre", label: "Noviembre" },
  { value: "diciembre", label: "Diciembre" },
];

interface DateRange {
  start: string;
  end: string;
}

interface MyFiltroDeFechaProps {
  onChange: (range: DateRange) => void;
  onClose?: () => void;
  className?: string;
  testId?: string;
}

function getMonthIndex(mode: FilterMode): number {
  const idx = MONTHS.findIndex(m => m.value === mode);
  return idx >= 0 ? idx : -1;
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function MyFiltroDeFecha({
  onChange,
  onClose,
  className = "",
  testId = "filtro-fecha",
}: MyFiltroDeFechaProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [mode, setMode] = useState<FilterMode>("cualquier_fecha");
  const [fechaInicial, setFechaInicial] = useState("");
  const [fechaFinal, setFechaFinal] = useState("");

  const calculateRange = (): DateRange => {
    let start: string;
    let end: string;

    if (mode === "cualquier_fecha") {
      start = fechaInicial;
      end = fechaFinal;
    } else if (mode === "ano_actual") {
      const now = new Date();
      start = formatDateForInput(new Date(now.getFullYear(), 0, 1));
      end = formatDateForInput(now);
    } else if (mode === "hace_un_ano") {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      start = formatDateForInput(oneYearAgo);
      end = formatDateForInput(now);
    } else {
      const monthIdx = getMonthIndex(mode);
      if (monthIdx >= 0) {
        const firstDay = new Date(year, monthIdx, 1);
        const lastDay = new Date(year, monthIdx + 1, 0);
        start = formatDateForInput(firstDay);
        end = formatDateForInput(lastDay);
      } else {
        start = "";
        end = "";
      }
    }

    return { start, end };
  };

  const handleApply = () => {
    const range = calculateRange();
    onChange(range);
    onClose?.();
  };

  const handleReset = () => {
    setYear(currentYear);
    setMode("cualquier_fecha");
    setFechaInicial("");
    setFechaFinal("");
    onChange({ start: "", end: "" });
  };

  const incrementYear = () => setYear(y => y + 1);
  const decrementYear = () => setYear(y => y - 1);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex flex-col gap-2 p-3 bg-background border border-rose-500/30 rounded-lg shadow-lg ${className}`}
          data-testid={`container-${testId}`}
        >
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 border-b border-rose-500/20 pb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Filtro de Fecha</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">Año</Label>
            <div className="flex items-center border rounded bg-background">
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-20 h-7 text-sm text-center border-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid={`${testId}-year-input`}
              />
              <div className="flex flex-col border-l">
                <button
                  type="button"
                  onClick={incrementYear}
                  className="px-1 h-3.5 text-xs hover:bg-muted border-b"
                  data-testid={`${testId}-year-up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={decrementYear}
                  className="px-1 h-3.5 text-xs hover:bg-muted"
                  data-testid={`${testId}-year-down`}
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {MONTHS.map((month) => (
              <label 
                key={month.value} 
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-rose-500/10 px-1 rounded"
              >
                <input
                  type="radio"
                  name={`${testId}-mode`}
                  value={month.value}
                  checked={mode === month.value}
                  onChange={() => setMode(month.value)}
                  className="w-3 h-3"
                  data-testid={`${testId}-radio-${month.value}`}
                />
                {month.label}
              </label>
            ))}
            <div className="border-t border-rose-500/20 my-1" />
            <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-rose-500/10 px-1 rounded">
              <input
                type="radio"
                name={`${testId}-mode`}
                value="ano_actual"
                checked={mode === "ano_actual"}
                onChange={() => setMode("ano_actual")}
                className="w-3 h-3"
                data-testid={`${testId}-radio-ano-actual`}
              />
              Año actual
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-rose-500/10 px-1 rounded">
              <input
                type="radio"
                name={`${testId}-mode`}
                value="hace_un_ano"
                checked={mode === "hace_un_ano"}
                onChange={() => setMode("hace_un_ano")}
                className="w-3 h-3"
                data-testid={`${testId}-radio-hace-un-ano`}
              />
              Hace un año
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-rose-500/10 px-1 rounded">
              <input
                type="radio"
                name={`${testId}-mode`}
                value="cualquier_fecha"
                checked={mode === "cualquier_fecha"}
                onChange={() => setMode("cualquier_fecha")}
                className="w-3 h-3"
                data-testid={`${testId}-radio-cualquier-fecha`}
              />
              Cualquier fecha
            </label>
          </div>

          <div className="flex flex-col gap-2 border-t border-rose-500/20 pt-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium w-20">Fecha inicial:</Label>
              <div className="relative flex-1">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-500 pointer-events-none" />
                <Input
                  type="date"
                  value={fechaInicial}
                  onChange={(e) => {
                    setFechaInicial(e.target.value);
                    if (mode !== "cualquier_fecha") setMode("cualquier_fecha");
                  }}
                  className="h-7 text-xs pl-7 cursor-pointer"
                  data-testid={`${testId}-fecha-inicial`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium w-20">Fecha final:</Label>
              <div className="relative flex-1">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-500 pointer-events-none" />
                <Input
                  type="date"
                  value={fechaFinal}
                  onChange={(e) => {
                    setFechaFinal(e.target.value);
                    if (mode !== "cualquier_fecha") setMode("cualquier_fecha");
                  }}
                  className="h-7 text-xs pl-7 cursor-pointer"
                  data-testid={`${testId}-fecha-final`}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-rose-500/20">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-8 w-8 text-rose-600 hover:bg-rose-500/20"
              data-testid={`${testId}-reset`}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700"
              data-testid={`${testId}-apply`}
            >
              <Check className="h-3.5 w-3.5" />
              Filtrar
            </Button>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-indigo-600 text-white text-xs">
        MyFiltroDeFecha
      </TooltipContent>
    </Tooltip>
  );
}
