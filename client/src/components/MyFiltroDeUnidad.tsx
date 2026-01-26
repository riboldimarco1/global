import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2 } from "lucide-react";

interface Parametro {
  id: string;
  tipo: string;
  nombre: string;
  habilitado: string | boolean;
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
  tipo = "unidad",
  label = "Unidad",
  showLabel = true,
  className = "",
  testId = "filtro-unidad",
  valueType = "id",
}: MyFiltroDeUnidadProps) {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const TIPO_MAP: Record<string, string> = {
    unidad: "unidad",
  };
  const mappedTipo = TIPO_MAP[tipo] || tipo;

  const matchesTipo = (pTipo: string, targetTipo: string): boolean => {
    const variations = new Set<string>();
    variations.add(targetTipo);
    if (targetTipo.endsWith("es")) {
      variations.add(targetTipo.slice(0, -2));
      variations.add(targetTipo.slice(0, -1));
    } else if (targetTipo.endsWith("s")) {
      variations.add(targetTipo.slice(0, -1));
    } else {
      variations.add(targetTipo + "s");
      variations.add(targetTipo + "es");
    }
    return variations.has(pTipo);
  };

  const unidades = parametros.filter(
    (p) => matchesTipo(p.tipo, mappedTipo) && (p.habilitado === true || p.habilitado === "t")
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
            <SelectContent className="max-h-[200px]">
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
