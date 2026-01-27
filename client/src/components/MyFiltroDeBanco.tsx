import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Landmark } from "lucide-react";

interface Parametro {
  id: string;
  nombre: string;
  tipo: string;
  habilitado?: boolean;
}

interface MyFiltroDeBancoProps {
  value: string;
  onChange: (value: string) => void;
  showLabel?: boolean;
  testId?: string;
  className?: string;
}

export default function MyFiltroDeBanco({
  value,
  onChange,
  showLabel = true,
  testId = "filtro-banco",
  className = "",
}: MyFiltroDeBancoProps) {
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros?tipo=bancos&habilitado=si"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const bancos = parametros.map(p => p.nombre).sort();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-2 p-2 bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-lg ${className}`}
          data-testid={`container-${testId}`}
        >
          {showLabel && (
            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
              <Landmark className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Banco</span>
            </div>
          )}
          <Select value={value} onValueChange={onChange} onOpenChange={(open) => open && refetch()}>
            <SelectTrigger
              className="h-8 w-[180px] text-xs"
              data-testid={testId}
            >
              <SelectValue placeholder="Seleccionar banco" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              <SelectItem value="all">Todos los bancos</SelectItem>
              {bancos.map((banco) => (
                <SelectItem key={banco} value={banco}>
                  {banco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
        MyFiltroDeBanco
      </TooltipContent>
    </Tooltip>
  );
}
