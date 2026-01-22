import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  label?: string;
  showLabel?: boolean;
  className?: string;
  testId?: string;
  valueType?: ValueType;
}

export default function MyFiltroDeUnidad({
  value,
  onChange,
  label = "Unidad",
  showLabel = true,
  className = "",
  testId = "filtro-unidad",
  valueType = "id",
}: MyFiltroDeUnidadProps) {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

  const unidades = parametros.filter(
    (p) => p.tipo === "unidades" && (p.abilitado === true || p.abilitado === "t")
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
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <Label className="text-xs flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm" data-testid={`${testId}-trigger`}>
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
  );
}
