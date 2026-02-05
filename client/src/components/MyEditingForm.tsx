import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTableData } from "@/contexts/TableDataContext";
import { useStyleMode } from "@/contexts/StyleModeContext";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MyButtonStyle } from "@/components/MyButtonStyle";
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
import { X, Save, CalendarIcon, Calculator, Trash2 } from "lucide-react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Column } from "./MyGrid";

// Mapeo de nombres de campos a tipos de parámetros
const fieldToParametroTipo: Record<string, string> = {
  unidad: "unidad",
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
  equipo: "equiposred",
  plan: "planes",
};


// Componente de fecha con estado local para edición en formato dd/mm/aa
interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

function DateInput({ value, onChange, onBlur, name, placeholder = "dd/mm/aa", "data-testid": testId, className, inputRef }: DateInputProps) {
  // Convertir yyyy-MM-dd a dd/mm/aa para mostrar
  const isoToDisplay = (isoValue: string): string => {
    if (!isoValue) return "";
    const match = String(isoValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    return isoValue;
  };
  
  // Convertir dd/mm/aa a yyyy-MM-dd
  const displayToIso = (displayValue: string): string | null => {
    const match = displayValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const [, day, month, year] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const [localValue, setLocalValue] = useState(isoToDisplay(value));
  
  // Sincronizar cuando el valor externo cambie (ej: desde el calendario)
  useEffect(() => {
    const newDisplay = isoToDisplay(value);
    setLocalValue(newDisplay);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    const prevLen = localValue?.length || 0;
    const isDeleting = newVal.length < prevLen;
    
    if (isDeleting) {
      // Al borrar, permitir normalmente
      setLocalValue(newVal);
      const isoVal = displayToIso(newVal);
      if (isoVal) onChange(isoVal);
      return;
    }
    
    // Al escribir: extraer solo dígitos y formatear con barras
    const digitsOnly = newVal.replace(/[^\d]/g, "").slice(0, 6);
    let formatted = "";
    for (let i = 0; i < digitsOnly.length; i++) {
      if (i === 2 || i === 4) formatted += "/";
      formatted += digitsOnly[i];
    }
    
    setLocalValue(formatted);
    const isoVal = displayToIso(formatted);
    if (isoVal) onChange(isoVal);
  };

  const handleBlur = () => {
    // En blur, validar y normalizar
    const isoVal = displayToIso(localValue);
    if (isoVal) {
      onChange(isoVal);
      setLocalValue(isoToDisplay(isoVal));
    } else if (localValue && !displayToIso(localValue)) {
      // Si el valor local no es válido, restaurar al valor del formulario
      setLocalValue(isoToDisplay(value));
    }
    onBlur?.();
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={className}
      data-testid={testId}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      name={name}
      ref={inputRef}
    />
  );
}

// Componente de número con formato de miles y validación de 2 decimales
interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  "data-testid"?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  disabled?: boolean;
}

function NumberInput({ value, onChange, onBlur, name, placeholder, "data-testid": testId, className, inputRef, disabled }: NumberInputProps) {
  // Formatear número con separador de miles (punto) y decimales con coma
  const formatNumber = (num: number | string): string => {
    if (num === "" || num === null || num === undefined) return "";
    const numValue = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(numValue)) return "";
    
    // Formatear con separador de miles (.) y decimales (,)
    const parts = numValue.toFixed(2).split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const decPart = parts[1];
    
    // Si los decimales son 00, no mostrarlos
    if (decPart === "00") {
      return intPart;
    }
    // Si termina en 0, mostrar solo un decimal
    if (decPart.endsWith("0")) {
      return `${intPart},${decPart[0]}`;
    }
    return `${intPart},${decPart}`;
  };
  
  // Parsear número de entrada a valor numérico
  // Acepta tanto coma como punto como separador decimal
  const parseInputNumber = (input: string): string => {
    if (!input) return "";
    // Si hay una coma, asumimos que es el separador decimal (formato español)
    // y los puntos son separadores de miles
    if (input.includes(",")) {
      const cleaned = input.replace(/\./g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return isNaN(num) ? "" : String(num);
    }
    // Si solo hay punto, verificar si es decimal o miles
    // Contamos los puntos - si hay más de uno, son separadores de miles
    const dots = (input.match(/\./g) || []).length;
    if (dots > 1) {
      // Múltiples puntos = separadores de miles
      const cleaned = input.replace(/\./g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? "" : String(num);
    }
    // Un solo punto = separador decimal
    const num = parseFloat(input);
    return isNaN(num) ? "" : String(num);
  };

  const [localValue, setLocalValue] = useState(formatNumber(value));
  const [isEditing, setIsEditing] = useState(false);
  
  // Sincronizar cuando el valor externo cambie (solo si no estamos editando)
  useEffect(() => {
    if (!isEditing) {
      const formatted = formatNumber(value);
      setLocalValue(formatted);
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    // Al enfocar, mostrar el valor sin formato de miles para edición fácil
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue !== 0) {
      // Mostrar con coma decimal pero sin separador de miles
      const formatted = numValue.toFixed(2).replace(".", ",");
      // Remover .00 o ,00 innecesarios
      setLocalValue(formatted.replace(/,00$/, "").replace(/(\,\d)0$/, "$1"));
    } else {
      // Si el valor es 0, limpiar el campo para facilitar la entrada
      setLocalValue("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Solo permitir dígitos, coma y punto
    let cleaned = input.replace(/[^\d.,]/g, "");
    
    // Solo permitir un separador decimal (coma o punto)
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");
    
    if (hasComma && hasDot) {
      // Si tiene ambos, mantener solo el primero encontrado
      const firstSep = cleaned.indexOf(",") < cleaned.indexOf(".") ? "," : ".";
      if (firstSep === ",") {
        cleaned = cleaned.replace(/\./g, "");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    }
    
    // Limitar a 2 decimales
    const sepIndex = Math.max(cleaned.indexOf(","), cleaned.indexOf("."));
    if (sepIndex !== -1) {
      const beforeSep = cleaned.substring(0, sepIndex);
      const afterSep = cleaned.substring(sepIndex + 1).replace(/[.,]/g, "").slice(0, 2);
      cleaned = beforeSep + (hasComma ? "," : ".") + afterSep;
    }
    
    setLocalValue(cleaned);
    
    // Llamar onChange con el valor numérico parseado
    const numericValue = parseInputNumber(cleaned);
    if (numericValue !== "") {
      onChange(numericValue);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    // En blur, formatear correctamente
    const numericValue = parseInputNumber(localValue);
    if (numericValue) {
      onChange(numericValue);
      setLocalValue(formatNumber(numericValue));
    } else if (localValue === "") {
      onChange("");
      setLocalValue("");
    } else {
      // Si no es válido, restaurar al valor anterior
      setLocalValue(formatNumber(value));
    }
    onBlur?.();
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      className={className}
      data-testid={testId}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      name={name}
      ref={inputRef}
      disabled={disabled}
    />
  );
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

type FormMode = "new" | "edit" | "delete";

interface MyEditingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  onDelete?: (data: Record<string, any>) => Promise<void>;
  columns: Column[];
  title?: string;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
  initialData?: Record<string, any> | null;
  isEditing?: boolean;
  currentTabName?: string;
  mode?: FormMode;
  onRecordSaved?: (record: Record<string, any>) => void;
}

export default function MyEditingForm({
  isOpen,
  onClose,
  onSave,
  onDelete,
  columns,
  title = "Agregar Registro",
  filtroDeUnidad = "",
  filtroDeBanco = "",
  initialData = null,
  isEditing = false,
  currentTabName = "",
  mode = "new",
  onRecordSaved,
}: MyEditingFormProps) {
  const [calculatorField, setCalculatorField] = useState<string | null>(null);
  const [calculatorInitialValue, setCalculatorInitialValue] = useState<string>("");
  const [openCalendar, setOpenCalendar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tasaCambio, setTasaCambio] = useState<number | null>(null);
  const [lastEditedCurrencyField, setLastEditedCurrencyField] = useState<"monto" | "dolares" | null>(null);
  const { toast } = useToast();
  const { showPop } = useMyPop();
  const { isAlegre } = useStyleMode();
  const windowStyle = isAlegre ? "window-3d" : "border-2";

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const formRef = useRef<HTMLDivElement>(null);
  
  // Estado para opciones cargadas del API
  const [loadedOptions, setLoadedOptions] = useState<Record<string, {id: string | number, nombre: string}[]>>({});
  const [operacionesMap, setOperacionesMap] = useState<Record<string, string>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Usar el contexto de tabla para obtener tableName y onRefresh
  const { tableName, onRefresh } = useTableData();

  // Reset position when form opens
  useEffect(() => {
    if (isOpen) {
      setPosition(null);
      setIsDragging(false);
    }
  }, [isOpen]);
  
  // Cargar opciones del API cuando el form se abre
  useEffect(() => {
    if (!isOpen) return;
    
    // Identificar qué tipos de parámetros necesitan las columnas
    const tiposNecesarios = new Set<string>();
    columns.forEach(col => {
      // Para almacen, el campo suministro usa tipo "suministro" de parametros
      if (tableName === "almacen" && col.key.toLowerCase() === "suministro") {
        tiposNecesarios.add("suministro");
      } else {
        const tipo = fieldToParametroTipo[col.key.toLowerCase()];
        if (tipo) {
          tiposNecesarios.add(tipo);
        }
      }
    });
    
    // Siempre cargar formadepago para obtener operadores
    tiposNecesarios.add("formadepago");
    
    // Cargar cada tipo en paralelo
    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      const newOptions: Record<string, {id: string | number, nombre: string}[]> = {};
      const newOperacionesMap: Record<string, string> = {};
      
      await Promise.all(
        Array.from(tiposNecesarios).map(async (tipo) => {
          try {
            const skipUnidadFilter = tipo === "suministro";
            const url = filtroDeUnidad && filtroDeUnidad !== "all" && !skipUnidadFilter
              ? `/api/parametros?tipo=${tipo}&unidad=${encodeURIComponent(filtroDeUnidad)}`
              : `/api/parametros?tipo=${tipo}`;
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              const records = data.records || data;
              const opcionesRaw = records
                .filter((p: any) => p.nombre && p.habilitado !== false)
                .map((p: any) => ({ id: p.id, nombre: p.nombre }))
                .sort((a: {nombre: string}, b: {nombre: string}) => (a.nombre || "").localeCompare(b.nombre || ""));
              // Filtrar duplicados por nombre - el usuario no puede distinguir opciones con el mismo nombre
              const nombresVistos = new Set<string>();
              const opciones = opcionesRaw.filter((opt: {id: string | number, nombre: string}) => {
                if (nombresVistos.has(opt.nombre)) return false;
                nombresVistos.add(opt.nombre);
                return true;
              });
              newOptions[tipo] = opciones;
              
              // Si es formadepago, guardar el mapeo nombre->operador
              if (tipo === "formadepago") {
                records.forEach((p: any) => {
                  if (p.nombre && p.operador) {
                    newOperacionesMap[p.nombre] = p.operador;
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error cargando opciones para ${tipo}:`, error);
          }
        })
      );
      
      setLoadedOptions(newOptions);
      setOperacionesMap(newOperacionesMap);
      setIsLoadingOptions(false);
    };
    
    fetchOptions();
  }, [isOpen, columns, filtroDeUnidad, tableName]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!formRef.current) return;
    e.preventDefault();
    const rect = formRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    // Set initial position based on current location to avoid jump
    setPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
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
  
  // Función para obtener operador de una operación
  const getOperadorDeOperacion = useCallback((nombreOperacion: string): string | null => {
    return operacionesMap[nombreOperacion] || null;
  }, [operacionesMap]);

  // Función memoizada para obtener las opciones de un campo
  const getFieldOptions = useCallback((fieldKey: string): {id: string | number, nombre: string}[] | null => {
    // Campo operador tiene opciones fijas
    if (fieldKey.toLowerCase() === "operador") {
      return [{ id: "suma", nombre: "suma" }, { id: "resta", nombre: "resta" }];
    }
    const tipoParametro = fieldToParametroTipo[fieldKey.toLowerCase()];
    if (tipoParametro) {
      const options = loadedOptions[tipoParametro] || [];
      return options.length > 0 ? options : null;
    }
    return null;
  }, [loadedOptions]);

  // Filtrar columnas: excluir id, propietario, campos de habilitado, y campos calculados
  // Para agrodata: excluir utility
  // Para almacen: excluir utility y unidad (unidad se auto-rellena desde filtrodeunidad)
  const filteredColumns = columns.filter(col => 
    col.key !== "id" && 
    col.key !== "propietario" && 
    col.key !== "habilitado" &&
    col.key !== "saldo" &&
    col.key !== "saldo_conciliado" &&
    !(tableName === "agrodata" && col.key === "utility") &&
    !(tableName === "almacen" && (col.key === "utility" || col.key === "unidad"))
  );
  
  // Reordenar columnas para bancos: banco, operacion, operador primero
  const editableColumns = tableName === "bancos" 
    ? [...filteredColumns].sort((a, b) => {
        const order: Record<string, number> = { 
          fecha: 0, banco: 1, operacion: 2, operador: 3 
        };
        const orderA = order[a.key] ?? 100;
        const orderB = order[b.key] ?? 100;
        return orderA - orderB;
      })
    : filteredColumns;
  
  // En modo delete, todos los campos están deshabilitados
  const isDeleteMode = mode === "delete";
  
  // Campos deshabilitados para bancos (o todos en modo delete)
  // propietario siempre está deshabilitado
  // Para bancos: banco, operador, propietario, saldo, saldo_conciliado y campos booleanos están deshabilitados
  // Para administracion: campos booleanos y unidad están deshabilitados
  // Además, se pueden pasar campos adicionales deshabilitados desde initialData._disabledFields
  // Regla general: si filtroDeUnidad tiene valor (no "all"), el campo "unidad" está deshabilitado
  // Regla general: si filtroDeBanco tiene valor (no "all"), el campo "banco" está deshabilitado
  const baseDisabledFields = isDeleteMode 
    ? editableColumns.map(col => col.key)
    : (tableName === "bancos" 
        ? ["banco", "operador", "propietario", "saldo", "saldo_conciliado", "conciliado", "utility", "relacionado"] 
        : tableName === "administracion"
          ? ["propietario", "capital", "anticipo", "relacionado", "utility", "unidad"]
          : tableName === "agrodata"
            ? ["propietario", "latencia"]
            : ["propietario"]);
  const extraDisabledFields = (initialData?._disabledFields as string[]) || [];
  
  // Auto-disable unidad/banco fields based on filters
  const filterDisabledFields: string[] = [];
  if (filtroDeUnidad && filtroDeUnidad !== "all") {
    filterDisabledFields.push("unidad");
  }
  if (filtroDeBanco && filtroDeBanco !== "all") {
    filterDisabledFields.push("banco");
  }
  
  const disabledFields = Array.from(new Set([...baseDisabledFields, ...extraDisabledFields, ...filterDisabledFields]));

  // Función para obtener valores por defecto según el campo
  const getDefaultValue = (col: Column, currentValues?: Record<string, any>): string => {
    // Para habilitado en parametros, por defecto "true"
    if (col.key === "habilitado" && tableName === "parametros") {
      return "true";
    }
    // Para campos booleanos, por defecto "false"
    if (col.type === "boolean") {
      return "false";
    }
    // Para fecha, usar fecha de hoy
    if (col.type === "date") {
      return format(new Date(), "yyyy-MM-dd");
    }
    // Para campos numéricos, por defecto 0
    if (col.type === "number") {
      return "0";
    }
    // Para unidad, usar el filtro de unidad si está disponible
    if (col.key === "unidad" && filtroDeUnidad && filtroDeUnidad !== "all") {
      return filtroDeUnidad;
    }
    // Para banco, usar el filtro de banco si está disponible
    if (col.key === "banco" && filtroDeBanco && filtroDeBanco !== "all") {
      return filtroDeBanco;
    }
    // Para operador, derivar de la operación seleccionada
    if (col.key === "operador" && tableName === "bancos") {
      const operacionValue = currentValues?.operacion || "";
      if (operacionValue) {
        const operadorDerivado = getOperadorDeOperacion(operacionValue);
        return operadorDerivado || "";
      }
      return "";
    }
    return "";
  };

  const defaultValues = editableColumns.reduce((acc, col) => {
    if (initialData && initialData[col.key] !== undefined && initialData[col.key] !== null) {
      if (col.type === "boolean") {
        acc[col.key] = String(initialData[col.key]);
      } else if (col.type === "date" && initialData[col.key]) {
        // Usar el valor directamente como string - nunca convertir a Date
        acc[col.key] = String(initialData[col.key]);
      } else {
        acc[col.key] = String(initialData[col.key]);
      }
    } else {
      // Usar valores por defecto para nuevo registro
      acc[col.key] = getDefaultValue(col, initialData || {});
    }
    return acc;
  }, {} as Record<string, any>);
  
  // Para bancos, derivar operador de la operación existente
  if (tableName === "bancos" && initialData?.operacion) {
    const operadorDerivado = getOperadorDeOperacion(initialData.operacion);
    if (operadorDerivado) {
      defaultValues.operador = operadorDerivado;
    }
  }

  const form = useForm({
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      const newValues = editableColumns.reduce((acc, col) => {
        if (initialData && initialData[col.key] !== undefined && initialData[col.key] !== null) {
          if (col.type === "boolean") {
            acc[col.key] = String(initialData[col.key]);
          } else if (col.type === "date" && initialData[col.key]) {
            // Usar el valor directamente como string - nunca convertir a Date
            acc[col.key] = String(initialData[col.key]);
          } else {
            acc[col.key] = String(initialData[col.key]);
          }
        } else {
          // Usar valores por defecto para nuevo registro
          acc[col.key] = getDefaultValue(col, initialData || {});
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Para bancos, derivar operador de la operación existente o por defecto
      if (tableName === "bancos") {
        const operacionValue = newValues.operacion || initialData?.operacion;
        if (operacionValue) {
          const operadorDerivado = getOperadorDeOperacion(operacionValue);
          if (operadorDerivado) {
            newValues.operador = operadorDerivado;
          }
        }
      }
      
      form.reset(newValues);
    }
  }, [isOpen, initialData, filtroDeBanco, filtroDeUnidad]);

  // Actualizar operador cuando operacionesMap se carga (para bancos)
  useEffect(() => {
    if (!isOpen || tableName !== "bancos" || Object.keys(operacionesMap).length === 0) return;
    
    const currentOperacion = form.getValues("operacion");
    if (currentOperacion) {
      const operadorDerivado = operacionesMap[currentOperacion];
      if (operadorDerivado) {
        form.setValue("operador", operadorDerivado, { shouldDirty: false });
      }
    }
  }, [isOpen, tableName, operacionesMap, form]);

  // Determinar si esta tabla tiene campos de moneda (monto y montodolares o montodol)
  const hasMontoBs = editableColumns.some(col => col.key === "monto");
  const hasMontoDolares = editableColumns.some(col => col.key === "montodolares" || col.key === "montodol");
  const montoDolaresKey = editableColumns.find(col => col.key === "montodolares")?.key || 
                          editableColumns.find(col => col.key === "montodol")?.key || "";

  // Observar cambios en fecha y banco para buscar la tasa de cambio
  const watchedFecha = useWatch({ control: form.control, name: "fecha" });
  const watchedBanco = useWatch({ control: form.control, name: "banco" });
  
  // Detectar si el banco es en moneda extranjera (dólares o euros) - no hacer conversión automática
  // Prioridad: 1) valor del campo banco en el form, 2) initialData.banco, 3) filtroDeBanco
  const bancoActual = watchedBanco || initialData?.banco || filtroDeBanco || "";
  const bancoLower = (typeof bancoActual === "string" ? bancoActual : "").toLowerCase();
  const esBancoEnMonedaExtranjera = bancoLower.includes("dolar") || bancoLower.includes("dólar") || bancoLower.includes("euro");
  
  // Solo hacer conversión automática si el banco es en bolívares
  const needsCurrencyConversion = hasMontoBs && hasMontoDolares && !esBancoEnMonedaExtranjera;

  // Reset lastEditedCurrencyField cuando el form se abre/resetea
  useEffect(() => {
    if (isOpen) {
      setLastEditedCurrencyField(null);
      setTasaCambio(null);
    }
  }, [isOpen, initialData?.id]);

  // Buscar tasa de cambio cuando cambia la fecha
  useEffect(() => {
    if (!isOpen || !needsCurrencyConversion || !watchedFecha) return;
    
    const fetchTasa = async () => {
      try {
        const response = await fetch(`/api/tasa-cambio/${watchedFecha}`);
        if (response.ok) {
          const data = await response.json();
          const tasa = typeof data.tasa === "number" ? data.tasa : parseFloat(data.tasa);
          setTasaCambio(isNaN(tasa) ? null : tasa);
        } else {
          setTasaCambio(null);
        }
      } catch (error) {
        console.error("Error fetching tasa de cambio:", error);
        setTasaCambio(null);
      }
    };
    fetchTasa();
  }, [isOpen, watchedFecha, needsCurrencyConversion]);

  // Recalcular cuando llega una nueva tasa de cambio (solo si el usuario ya editó un campo)
  useEffect(() => {
    if (!isOpen || !needsCurrencyConversion || tasaCambio === null || tasaCambio <= 0) return;
    if (lastEditedCurrencyField === null) return; // No recalcular si el usuario no ha editado nada
    
    const currentMonto = form.getValues("monto");
    const currentMontoDolares = form.getValues(montoDolaresKey);
    
    // Si el último campo editado fue monto, recalcular dólares
    if (lastEditedCurrencyField === "monto") {
      const numMonto = parseFloat(currentMonto);
      if (!isNaN(numMonto) && numMonto > 0) {
        const usdValue = numMonto / tasaCambio;
        form.setValue(montoDolaresKey, usdValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }
    } 
    // Si el último campo editado fue dólares, recalcular bolívares
    else if (lastEditedCurrencyField === "dolares") {
      const numDolares = parseFloat(currentMontoDolares);
      if (!isNaN(numDolares) && numDolares > 0) {
        const bsValue = numDolares * tasaCambio;
        form.setValue("monto", bsValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }
    }
  }, [tasaCambio, isOpen, needsCurrencyConversion, lastEditedCurrencyField, montoDolaresKey, form]);

  // Handler para cuando cambia el monto en bolívares
  const handleMontoChange = useCallback((value: string, fieldOnChange: (value: string) => void) => {
    fieldOnChange(value);
    if (!needsCurrencyConversion) return;
    
    setLastEditedCurrencyField("monto");
    const numValue = parseFloat(value);
    
    // Si el campo está vacío o es cero, limpiar el campo opuesto
    if (isNaN(numValue) || value === "" || numValue === 0) {
      return; // No limpiar el otro campo, solo no calcular
    }
    
    if (tasaCambio === null || tasaCambio <= 0) {
      showPop({
        title: "Sin tasa de cambio",
        message: "No hay tasa de cambio registrada para esta fecha. El cálculo será 0.",
      });
      form.setValue(montoDolaresKey, "0", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      return;
    }
    
    const usdValue = numValue / tasaCambio;
    form.setValue(montoDolaresKey, usdValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [needsCurrencyConversion, tasaCambio, montoDolaresKey, form, showPop]);

  // Handler para cuando cambia el monto en dólares
  const handleMontoDolaresChange = useCallback((value: string, fieldOnChange: (value: string) => void) => {
    fieldOnChange(value);
    if (!needsCurrencyConversion) return;
    
    setLastEditedCurrencyField("dolares");
    const numValue = parseFloat(value);
    
    // Si el campo está vacío o es cero, no calcular
    if (isNaN(numValue) || value === "" || numValue === 0) {
      return; // No limpiar el otro campo, solo no calcular
    }
    
    if (tasaCambio === null || tasaCambio <= 0) {
      showPop({
        title: "Sin tasa de cambio",
        message: "No hay tasa de cambio registrada para esta fecha. El cálculo será 0.",
      });
      form.setValue("monto", "0", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      return;
    }
    
    const bsValue = numValue * tasaCambio;
    form.setValue("monto", bsValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }, [needsCurrencyConversion, tasaCambio, form, showPop]);

  if (!isOpen) return null;

  // Función para obtener fecha actual en formato ISO (yyyy-mm-dd)
  const getCurrentDateFormatted = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onSubmit = async (data: Record<string, any>) => {
    console.log("MyEditingForm onSubmit called with data:", data);
    const processedData = { ...data };
    
    // Validar campos de tipo IP
    const ipColumns = editableColumns.filter(col => col.type === "ip");
    for (const col of ipColumns) {
      const ipValue = processedData[col.key];
      if (ipValue && ipValue.trim() !== "") {
        const parts = ipValue.split(".");
        const isValidIp = parts.length === 4 && parts.every((p: string) => {
          const num = parseInt(p, 10);
          return !isNaN(num) && num >= 0 && num <= 255 && p === num.toString();
        });
        if (!isValidIp) {
          showPop({
            title: "IP inválida",
            message: `El campo "${col.label}" debe tener formato: 0-255.0-255.0-255.0-255`,
          });
          return;
        }
      }
    }
    
    // Determinar si es edición (tiene id en initialData) o nuevo/copia
    const isEditMode = isEditing && initialData?.id;
    
    // Auto-completar campos que no están en las columnas del grid
    // Para EDICIÓN: preservar valores originales de initialData
    // Para NUEVO/COPIA: usar valores por defecto (tab, filtros, fecha actual)
    
    // tipo: preservar original en edición, o usar nombre del tab
    if (!processedData.tipo || processedData.tipo === "") {
      if (isEditMode && initialData?.tipo) {
        processedData.tipo = initialData.tipo;
      } else if (currentTabName) {
        processedData.tipo = currentTabName;
      }
    }
    
    // unidad: preservar original en edición, o usar filtroDeUnidad
    if (!processedData.unidad || processedData.unidad === "") {
      if (isEditMode && initialData?.unidad) {
        processedData.unidad = initialData.unidad;
      } else if (filtroDeUnidad && filtroDeUnidad !== "all") {
        processedData.unidad = filtroDeUnidad;
      }
    }
    
    // fecha: preservar original en edición, o usar fecha actual
    if (!processedData.fecha || processedData.fecha === "") {
      if (isEditMode && initialData?.fecha) {
        processedData.fecha = initialData.fecha;
      } else {
        processedData.fecha = getCurrentDateFormatted();
      }
    }
    
    // banco: preservar original en edición, o usar filtroDeBanco
    if (!processedData.banco || processedData.banco === "") {
      if (isEditMode && initialData?.banco) {
        processedData.banco = initialData.banco;
      } else if (filtroDeBanco && filtroDeBanco !== "all") {
        processedData.banco = filtroDeBanco;
      }
    }
    
    // Para bancos, asegurar que operador esté incluido
    if (tableName === "bancos") {
      // Asegurar operador derivado de operacion
      if (processedData.operacion) {
        const operadorDerivado = getOperadorDeOperacion(processedData.operacion);
        if (operadorDerivado) {
          processedData.operador = operadorDerivado;
        }
      }
    }
    
    // Preservar codrel de initialData para relación bidireccional
    if (initialData?.codrel && !processedData.codrel) {
      processedData.codrel = initialData.codrel;
    }
    
    // Si administración tiene codrel, marcar relacionado=true en el guardado inicial
    if (tableName === "administracion" && processedData.codrel) {
      processedData.relacionado = true;
    }
    
    // Para parametros, habilitado=true por defecto si no está definido
    if (tableName === "parametros" && processedData.habilitado === undefined) {
      processedData.habilitado = true;
    }
    
    // Asignar el usuario actual + fecha + hora al campo propietario
    const currentUsername = getStoredUsername();
    if (currentUsername) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      processedData.propietario = `${currentUsername} ${day}/${month}/${year} ${hours}:${minutes}`;
    }
    
    // Advertencia: si la tabla tiene campo tipo y está vacío, mostrar popup
    const hasTipoColumn = editableColumns.some(col => col.key === "tipo");
    if (hasTipoColumn && (!processedData.tipo || processedData.tipo === "")) {
      showPop({
        title: "Advertencia",
        message: "El campo 'tipo' está vacío. El registro se guardará sin tipo.",
      });
    }
    
    // Validación: operacion es obligatorio para bancos (operador se autocompleta)
    if (tableName === "bancos" && (!processedData.operacion || processedData.operacion === "")) {
      showPop({
        title: "Campo requerido",
        message: "El campo Operación es obligatorio",
      });
      return;
    }
    
    editableColumns.forEach(col => {
      if (col.type === "number") {
        const val = processedData[col.key];
        if (val === "" || val === undefined || val === null) {
          processedData[col.key] = 0;
        } else {
          processedData[col.key] = Number(val);
        }
      }
      if (col.type === "boolean") {
        processedData[col.key] = processedData[col.key] === true || processedData[col.key] === "true";
      }
      // Mantener fechas en formato ISO (yyyy-mm-dd) para compatibilidad con PostgreSQL
    });
    console.log("MyEditingForm processedData:", processedData);
    
    // Si tenemos tableName del contexto, hacer POST o PUT según si es edición
    if (tableName) {
      setIsSaving(true);
      try {
        const isEditing = initialData && initialData.id;
        const method = isEditing ? "PUT" : "POST";
        const url = isEditing ? `/api/${tableName}/${initialData.id}` : `/api/${tableName}`;
        
        console.log(`MyEditingForm ${method} a ${url}`, processedData);
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(processedData),
        });
        if (response.ok) {
          const savedRecord = await response.json();
          console.log("Registro guardado:", savedRecord);
          
          // Secuencia de relación bidireccional para administración con codrel
          // Paso 1: Ya se guardó administración con relacionado=true y codrel en processedData
          if (tableName === "administracion" && processedData.codrel) {
            try {
              console.log("Paso 1: Administración guardada con relacionado=true y codrel");
              
              // Paso 3: PUT directo solo con los campos de relación (evita GET y no recalcula saldos)
              const bancosUpdateResponse = await fetch(`/api/bancos/${processedData.codrel}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  codrel: savedRecord.id,
                  relacionado: true,
                }),
              });
              if (bancosUpdateResponse.ok) {
                console.log("Paso 3: Bancos actualizado con codrel y relacionado=true");
                // Paso 4: Disparar evento personalizado para refrescar la ventana de bancos
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("refreshBancos"));
                  console.log("Paso 4: Evento refreshBancos disparado");
                }, 100);
              }
            } catch (relationError) {
              console.error("Error en relación bidireccional:", relationError);
            }
          }
          
          // Notificar que el registro se guardó (para limpiar bancoId en Administración)
          if (onRecordSaved) {
            onRecordSaved(savedRecord);
          }
          // Para bancos, hacer refresh completo porque los saldos de otros registros cambian
          if (tableName === "bancos") {
            onRefresh(); // Refresh completo para recargar todos los saldos
          } else {
            onRefresh(savedRecord);
          }
        } else {
          const errorText = await response.text();
          console.error("Error al guardar:", response.statusText, errorText);
        }
      } catch (error) {
        console.error("Error al guardar:", error);
      } finally {
        setIsSaving(false);
      }
    } else {
      // Fallback: usar onSave si no hay tableName
      console.log("MyEditingForm calling onSave with:", processedData);
      onSave(processedData);
    }
    form.reset();
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Calculate form style based on position
  const formStyle: React.CSSProperties = position
    ? {
        position: "fixed",
        left: position.x,
        top: position.y,
        transform: "none",
      }
    : {};

  return (
    <>
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30"
        onClick={handleClose}
        data-testid="floating-form-overlay"
      >
        <div 
          ref={formRef}
          className={`bg-background rounded-lg shadow-2xl min-w-[400px] max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col ${windowStyle} ${
            isDeleteMode ? "border-red-500/50" : "border-green-500/50"
          }`}
          style={formStyle}
          onClick={(e) => e.stopPropagation()}
          data-testid="floating-form-window"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`flex items-center justify-between px-4 py-2 border-b rounded-t-lg shrink-0 cursor-move select-none ${
                  isDeleteMode 
                    ? "bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-500/30"
                    : "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30"
                }`}
                onMouseDown={handleMouseDown}
              >
                <h3 className={`text-sm font-semibold ${isDeleteMode ? "text-red-600" : "text-foreground"}`} data-testid="text-form-title">{title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  onMouseDown={(e) => e.stopPropagation()}
                  data-testid="floating-form-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className={isDeleteMode ? "bg-red-600 text-white text-xs" : "bg-indigo-600 text-white text-xs"}>
              {isDeleteMode ? "Confirmar eliminación" : "MyEditingForm"}
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
                        <FormItem className="flex items-center gap-2">
                          <FormLabel className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px] text-right">
                            {col.label}
                          </FormLabel>
                          <FormControl className="flex-1">
                            {col.type === "boolean" ? (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={disabledFields.includes(col.key)}
                              >
                                <SelectTrigger data-testid={`input-${col.key}`} disabled={disabledFields.includes(col.key)}>
                                  <SelectValue placeholder={col.label} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Sí</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : col.type === "date" ? (
                              <div className="flex gap-1">
                                <DateInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  inputRef={field.ref}
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
                                <NumberInput
                                  placeholder={col.label}
                                  value={field.value}
                                  onChange={(value) => {
                                    if (col.key === "monto" && needsCurrencyConversion) {
                                      handleMontoChange(value, field.onChange);
                                    } else if ((col.key === "montodolares" || col.key === "montodol") && needsCurrencyConversion) {
                                      handleMontoDolaresChange(value, field.onChange);
                                    } else {
                                      field.onChange(value);
                                    }
                                  }}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  inputRef={field.ref}
                                  className="flex-1"
                                  data-testid={`input-${col.key}`}
                                  disabled={disabledFields.includes(col.key)}
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
                                placeholder={col.label}
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "");
                                  field.onChange(value);
                                }}
                                disabled={disabledFields.includes(col.key)}
                                data-testid={`input-${col.key}`}
                              />
                            ) : col.type === "ip" ? (
                              <Input
                                type="text"
                                placeholder="192.168.1.1"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                maxLength={15}
                                disabled={disabledFields.includes(col.key)}
                                data-testid={`input-${col.key}`}
                              />
                            ) : col.type === "mac" ? (
                              <Input
                                type="text"
                                placeholder="AA:BB:CC:DD:EE:FF"
                                value={field.value || ""}
                                onChange={(e) => {
                                  let value = e.target.value.toUpperCase();
                                  value = value.replace(/[^0-9A-F:]/g, "");
                                  const raw = value.replace(/:/g, "");
                                  if (raw.length <= 12) {
                                    const formatted = raw.match(/.{1,2}/g)?.join(":") || raw;
                                    field.onChange(formatted);
                                  }
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                maxLength={17}
                                disabled={disabledFields.includes(col.key)}
                                data-testid={`input-${col.key}`}
                              />
                            ) : (() => {
                              const fieldOptions = getFieldOptions(col.key);
                              const isDisabled = disabledFields.includes(col.key);
                              const tipoParametro = fieldToParametroTipo[col.key.toLowerCase()];
                              const shouldBeSelect = tipoParametro || col.key.toLowerCase() === "operador";
                              
                              // Campo estado para agrodata: solo opciones "cortado" y "activo"
                              if (col.key === "estado" && tableName === "agrodata") {
                                const estadoOptions = ["cortado", "activo"];
                                return (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={field.onChange}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger data-testid={`select-${col.key}`} disabled={isDisabled}>
                                      <SelectValue placeholder={col.label} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {estadoOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              
                              // Campo movimiento para almacen: solo "entrada" y "salida"
                              if (col.key === "movimiento" && tableName === "almacen") {
                                const movimientoOptions = ["entrada", "salida"];
                                return (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={field.onChange}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger data-testid={`select-${col.key}`} disabled={isDisabled}>
                                      <SelectValue placeholder={col.label} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {movimientoOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              
                              // Campo suministro para almacen: usa tipo "suministro" de parametros
                              if (col.key === "suministro" && tableName === "almacen") {
                                const suministroOptions = loadedOptions["suministro"] || [];
                                if (isLoadingOptions) {
                                  return (
                                    <Select disabled>
                                      <SelectTrigger data-testid={`select-${col.key}`}>
                                        <SelectValue placeholder={col.label} />
                                      </SelectTrigger>
                                      <SelectContent />
                                    </Select>
                                  );
                                }
                                return (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={field.onChange}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger data-testid={`select-${col.key}`} disabled={isDisabled}>
                                      <SelectValue placeholder={col.label} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {suministroOptions.map((option, idx) => (
                                        <SelectItem key={`${option.id}-${idx}`} value={option.nombre}>
                                          {option.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              
                              // Si debería ser un select pero todavía está cargando
                              if (shouldBeSelect && isLoadingOptions) {
                                return (
                                  <Select disabled>
                                    <SelectTrigger data-testid={`select-${col.key}`}>
                                      <SelectValue placeholder={col.label} />
                                    </SelectTrigger>
                                    <SelectContent />
                                  </Select>
                                );
                              }
                              
                              if (fieldOptions && fieldOptions.length > 0) {
                                return (
                                  <Select
                                    value={field.value || ""}
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      // Si es operacion, actualizar operador automáticamente
                                      if (col.key === "operacion" && tableName === "bancos") {
                                        const operador = getOperadorDeOperacion(value);
                                        form.setValue("operador", operador || "");
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    <SelectTrigger data-testid={`select-${col.key}`} disabled={isDisabled}>
                                      <SelectValue placeholder={col.label} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {fieldOptions.map((option, idx) => (
                                        <SelectItem key={`${option.id}-${idx}`} value={option.nombre}>
                                          {option.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                );
                              }
                              return (
                                <Input
                                  type="text"
                                  placeholder={col.label}
                                  {...field}
                                  disabled={isDisabled}
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
                  <MyButtonStyle
                    color="gray"
                    onClick={handleClose}
                    data-testid="button-form-cancel"
                  >
                    Cancelar
                  </MyButtonStyle>
                  {isDeleteMode ? (
                    <MyButtonStyle
                      color="red"
                      className="gap-1"
                      data-testid="button-form-delete"
                      loading={isSaving}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onDelete && initialData) {
                          setIsSaving(true);
                          try {
                            await onDelete(initialData);
                            onClose();
                          } catch (error) {
                            console.error("Error al eliminar:", error);
                          } finally {
                            setIsSaving(false);
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isSaving ? "Eliminando..." : "Eliminar"}
                    </MyButtonStyle>
                  ) : (
                    <>
                      <MyButtonStyle
                        color="green"
                        className="gap-1 relative z-[10005]"
                        data-testid="button-form-save"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("Save button clicked");
                          form.handleSubmit(onSubmit)();
                        }}
                      >
                        <Save className="h-4 w-4" />
                        Guardar
                      </MyButtonStyle>
                    </>
                  )}
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
            const strValue = String(value);
            form.setValue(calculatorField, strValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            
            // Disparar conversión de moneda si aplica
            if (needsCurrencyConversion) {
              const numValue = parseFloat(strValue);
              const isValidValue = !isNaN(numValue) && numValue > 0;
              
              if (calculatorField === "monto") {
                setLastEditedCurrencyField("monto");
                if (isValidValue) {
                  if (tasaCambio && tasaCambio > 0) {
                    const usdValue = numValue / tasaCambio;
                    form.setValue(montoDolaresKey, usdValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                  } else {
                    form.setValue(montoDolaresKey, "0", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                    showPop({
                      title: "Sin tasa de cambio",
                      message: "No hay tasa de cambio registrada para esta fecha. El cálculo será 0.",
                    });
                  }
                }
              } else if (calculatorField === "montodolares" || calculatorField === "montodol") {
                setLastEditedCurrencyField("dolares");
                if (isValidValue) {
                  if (tasaCambio && tasaCambio > 0) {
                    const bsValue = numValue * tasaCambio;
                    form.setValue("monto", bsValue.toFixed(2), { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                  } else {
                    form.setValue("monto", "0", { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                    showPop({
                      title: "Sin tasa de cambio",
                      message: "No hay tasa de cambio registrada para esta fecha. El cálculo será 0.",
                    });
                  }
                }
              }
            }
          }
        }}
      />
    </>
  );
}
