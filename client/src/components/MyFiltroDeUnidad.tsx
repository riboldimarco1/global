import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2 } from "lucide-react";

interface Parametro {
  id: string;
  tipo: string;
  nombre: string;
  abilitado: string | boolean;
}

type ValueType = "id" | "nombre";

interface MyFiltroDeUnidadProps {
  value: string;
  onChange: (value: string) => void;
  tipo?: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  testId?: string;
  valueType?: ValueType;
}

export default function MyFiltroDeUnidad({
  value,
  onChange,
  tipo = "unidades",
  label = "Unidad",
  showLabel = true,
  className = "",
  testId = "filtro-unidad",
  valueType = "id",
}: MyFiltroDeUnidadProps) {
  const denormalizedTypes = ["almacen", "cosecha", "cheques", "transferencias"];
  
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    enabled: !denormalizedTypes.includes(tipo),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: almacenUnidades = [] } = useQuery<string[]>({
    queryKey: ["/api/almacen/unidades"],
    enabled: tipo === "almacen",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: cosechaUnidades = [] } = useQuery<string[]>({
    queryKey: ["/api/cosecha/unidades"],
    enabled: tipo === "cosecha",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: chequesUnidades = [] } = useQuery<string[]>({
    queryKey: ["/api/cheques/unidades"],
    enabled: tipo === "cheques",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: transferenciasUnidades = [] } = useQuery<string[]>({
    queryKey: ["/api/transferencias/unidades"],
    enabled: tipo === "transferencias",
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const unidades = tipo === "almacen" 
    ? almacenUnidades.map(u => ({ id: u, nombre: u, tipo: "almacen", abilitado: true }))
    : tipo === "cosecha"
    ? cosechaUnidades.map(u => ({ id: u, nombre: u, tipo: "cosecha", abilitado: true }))
    : tipo === "cheques"
    ? chequesUnidades.map(u => ({ id: u, nombre: u, tipo: "cheques", abilitado: true }))
    : tipo === "transferencias"
    ? transferenciasUnidades.map(u => ({ id: u, nombre: u, tipo: "transferencias", abilitado: true }))
    : parametros.filter(
        (p) => p.tipo === tipo && (p.abilitado === true || p.abilitado === "t")
      );

  const getValue = (unidad: Parametro) => {
    return valueType === "nombre" ? unidad.nombre : String(unidad.id);
  };

  const getDisplayValue = () => {
    if (value === "all") return "Todas las unidades";
    const found = unidades.find(u => getValue(u) === value);
    return found?.nombre || value;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-2 p-2 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-md ${className}`}
          data-testid="container-my-filtro-unidad"
        >
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-4 w-4" />
            {showLabel && (
              <Label className="text-xs font-semibold cursor-default whitespace-nowrap">
                {label}
              </Label>
            )}
          </div>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger 
              className="h-8 text-sm min-w-[160px] border-emerald-500/30 bg-background" 
              data-testid={`${testId}-trigger`}
            >
              <SelectValue placeholder="Seleccionar unidad">
                {getDisplayValue()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid={`${testId}-option-all`}>
                Todas las unidades
              </SelectItem>
              {unidades.map((unidad) => (
                <SelectItem
                  key={unidad.id}
                  value={getValue(unidad)}
                  data-testid={`${testId}-option-${unidad.id}`}
                >
                  {unidad.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-indigo-600 text-white text-xs">
        MyFiltroDeUnidad
      </TooltipContent>
    </Tooltip>
  );
}
