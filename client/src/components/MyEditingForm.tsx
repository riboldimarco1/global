import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Save, CalendarIcon, Calculator } from "lucide-react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Column } from "./MyGrid";

// Mapeo de nombres de campos a tipos de parámetros
const fieldToParametroTipo: Record<string, string> = {
  unidad: "unidades",
  tablon: "tablones",
  actividad: "actividades",
  almacen: "almacenes",
  banco: "bancos",
  carga: "cargas",
  categoria: "categorias",
  chofer: "chofer",
  ciclo: "ciclo",
  clave: "claves",
  cliente: "clientes",
  cultivo: "cultivo",
  destino: "destino",
  finca: "fincas",
  operacion: "formadepago",
  insumo: "insumos",
  origen: "origen",
  personal: "personal",
  placa: "placa",
  producto: "productos",
  proveedor: "proveedores",
};

interface Parametro {
  id: string;
  tipo: string | null;
  nombre: string | null;
  unidad: string | null;
  abilitado: boolean | null;
}

interface MyCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (value: number) => void;
  initialValue?: string;
}

function MyCalculator({ isOpen, onClose, onResult, initialValue = "" }: MyCalculatorProps) {
  const [display, setDisplay] = useState(initialValue || "0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplay(initialValue || "0");
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    const current = parseFloat(display);
    if (previousValue !== null && operation && !waitingForNewValue) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }
    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleAccept = () => {
    const value = parseFloat(display);
    onResult(isNaN(value) ? 0 : value);
    onClose();
  };

  const buttons = [
    ["C", "/", "*", "-"],
    ["7", "8", "9", "+"],
    ["4", "5", "6", "="],
    ["1", "2", "3", ""],
    ["0", ".", "", ""],
  ];

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid="calculator-overlay"
    >
      <div 
        className="bg-background border-2 border-purple-500/50 rounded-lg shadow-2xl p-4 min-w-[250px]"
        onClick={(e) => e.stopPropagation()}
        data-testid="calculator-window"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-purple-600">Calculadora</span>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="calculator-close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-muted p-2 rounded mb-2 text-right text-xl font-mono" data-testid="calculator-display">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {buttons.flat().map((btn, idx) => {
            if (btn === "") return <div key={idx} />;
            if (btn === "=") {
              return (
                <Button
                  key={idx}
                  variant="default"
                  className="row-span-2"
                  onClick={handleEquals}
                  data-testid={`calculator-btn-equals`}
                >
                  =
                </Button>
              );
            }
            return (
              <Button
                key={idx}
                variant={btn === "C" ? "destructive" : ["/", "*", "-", "+"].includes(btn) ? "secondary" : "outline"}
                onClick={() => {
                  if (btn === "C") handleClear();
                  else if (["/", "*", "-", "+"].includes(btn)) handleOperation(btn);
                  else if (btn === ".") handleDecimal();
                  else handleNumber(btn);
                }}
                data-testid={`calculator-btn-${btn}`}
              >
                {btn}
              </Button>
            );
          })}
        </div>
        <Button 
          className="w-full mt-2"
          onClick={handleAccept}
          data-testid="calculator-accept"
        >
          Aceptar
        </Button>
      </div>
    </div>
  );
}

interface MyEditingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  columns: Column[];
  title?: string;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
}

export default function MyEditingForm({
  isOpen,
  onClose,
  onSave,
  columns,
  title = "Agregar Registro",
  filtroDeUnidad = "",
  filtroDeBanco = "",
}: MyEditingFormProps) {
  const [calculatorField, setCalculatorField] = useState<string | null>(null);
  const [calculatorInitialValue, setCalculatorInitialValue] = useState<string>("");
  const [openCalendar, setOpenCalendar] = useState<string | null>(null);

  // Query para obtener parámetros
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

  // Agrupar parámetros por tipo, filtrando por unidad si aplica
  const parametrosPorTipo = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    const activeFilter = filtroDeUnidad && filtroDeUnidad !== "all" ? filtroDeUnidad : null;
    
    parametros.forEach(p => {
      if (p.tipo && p.nombre && p.abilitado !== false) {
        // Si hay filtro de unidad activo y el parámetro tiene unidad, filtrar
        if (activeFilter && p.unidad && p.unidad !== activeFilter) {
          return;
        }
        if (!grouped[p.tipo]) {
          grouped[p.tipo] = [];
        }
        if (!grouped[p.tipo].includes(p.nombre)) {
          grouped[p.tipo].push(p.nombre);
        }
      }
    });
    // Ordenar cada grupo alfabéticamente
    Object.keys(grouped).forEach(tipo => {
      grouped[tipo].sort((a, b) => a.localeCompare(b));
    });
    return grouped;
  }, [parametros, filtroDeUnidad]);

  // Función para obtener las opciones de un campo si coincide con un tipo de parámetros
  const getFieldOptions = (fieldKey: string): string[] | null => {
    const tipoParametro = fieldToParametroTipo[fieldKey.toLowerCase()];
    if (tipoParametro && parametrosPorTipo[tipoParametro]) {
      return parametrosPorTipo[tipoParametro];
    }
    return null;
  };

  // Filtrar columnas: excluir id, prop, y campos de habilitado
  const editableColumns = columns.filter(col => 
    col.key !== "id" && col.key !== "prop" && col.key !== "abilitado" && col.key !== "habilitado"
  );

  const defaultValues = editableColumns.reduce((acc, col) => {
    acc[col.key] = col.type === "boolean" ? "" : col.type === "number" ? "" : "";
    return acc;
  }, {} as Record<string, any>);

  const form = useForm({
    defaultValues,
  });

  if (!isOpen) return null;

  const onSubmit = (data: Record<string, any>) => {
    console.log("MyEditingForm onSubmit called with data:", data);
    const processedData = { ...data };
    editableColumns.forEach(col => {
      if (col.type === "number" && processedData[col.key] !== "") {
        processedData[col.key] = Number(processedData[col.key]);
      }
      if (col.type === "boolean") {
        processedData[col.key] = processedData[col.key] === "true";
      }
    });
    console.log("MyEditingForm calling onSave with:", processedData);
    onSave(processedData);
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30"
        onClick={handleClose}
        data-testid="floating-form-overlay"
      >
        <div 
          className="bg-background border-2 border-green-500/50 rounded-lg shadow-2xl min-w-[400px] max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          data-testid="floating-form-window"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/30 rounded-t-lg shrink-0">
                <h3 className="text-sm font-semibold text-foreground" data-testid="text-form-title">{title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  data-testid="floating-form-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-indigo-600 text-white text-xs">
              MyEditingForm
            </TooltipContent>
          </Tooltip>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                  {editableColumns.map((col) => (
                    <FormField
                      key={col.key}
                      control={form.control}
                      name={col.key}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs" data-testid={`label-${col.key}`}>
                            {col.label}
                          </FormLabel>
                          <FormControl>
                            {col.type === "boolean" ? (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger data-testid={`input-${col.key}`}>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Sí</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : col.type === "date" ? (
                              <div className="flex gap-1">
                                <Input
                                  type="date"
                                  {...field}
                                  className="flex-1"
                                  data-testid={`input-${col.key}`}
                                />
                                <Popover open={openCalendar === col.key} onOpenChange={(open) => setOpenCalendar(open ? col.key : null)}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      data-testid={`calendar-btn-${col.key}`}
                                    >
                                      <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[10002]" align="end">
                                    <Calendar
                                      mode="single"
                                      selected={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          field.onChange(format(date, "yyyy-MM-dd"));
                                          setOpenCalendar(null);
                                        }
                                      }}
                                      locale={es}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : col.type === "number" ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  step="any"
                                  {...field}
                                  className="flex-1"
                                  data-testid={`input-${col.key}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setCalculatorInitialValue(field.value || "");
                                    setCalculatorField(col.key);
                                  }}
                                  data-testid={`calculator-btn-${col.key}`}
                                >
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : col.type === "numericText" ? (
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "");
                                  field.onChange(value);
                                }}
                                data-testid={`input-${col.key}`}
                              />
                            ) : (() => {
                              const fieldOptions = getFieldOptions(col.key);
                              if (fieldOptions && fieldOptions.length > 0) {
                                return (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger data-testid={`select-${col.key}`}>
                                      <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {fieldOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              return (
                                <Input
                                  type="text"
                                  {...field}
                                  data-testid={`input-${col.key}`}
                                />
                              );
                            })()}
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 px-4 py-3 border-t bg-muted/30 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    data-testid="button-form-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="gap-1"
                    data-testid="button-form-save"
                    onClick={() => {
                      console.log("Save button clicked");
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </form>
            </Form>
        </div>
      </div>
      <MyCalculator
        isOpen={calculatorField !== null}
        onClose={() => setCalculatorField(null)}
        initialValue={calculatorInitialValue}
        onResult={(value) => {
          if (calculatorField) {
            form.setValue(calculatorField, String(value));
          }
        }}
      />
    </>
  );
}
