import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Landmark } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { hasBancoAccess, getStoredUsername } from "@/lib/auth";

interface Parametro {
  id: string;
  nombre: string;
  tipo: string;
  habilitado?: boolean;
  transferencia?: boolean;
}

type MonedaFilter = "todos" | "bolivares" | "dolares" | "euros" | "caja";

interface MyFiltroDeBancoProps {
  value: string;
  onChange: (value: string) => void;
  showLabel?: boolean;
  testId?: string;
  className?: string;
  monedaFilter?: MonedaFilter;
  soloTransferencia?: boolean;
  allowAll?: boolean;
}

function filterBancosByMoneda(bancos: Parametro[], moneda: MonedaFilter): Parametro[] {
  if (moneda === "todos") return bancos;
  
  return bancos.filter(banco => {
    const nombre = (banco.nombre || "").toLowerCase();
    
    if (moneda === "dolares") {
      return nombre.includes("dolar") || nombre.includes("dólar");
    }
    if (moneda === "euros") {
      return nombre.includes("euro");
    }
    if (moneda === "caja") {
      return nombre.includes("caja");
    }
    if (moneda === "bolivares") {
      const hasDolar = nombre.includes("dolar") || nombre.includes("dólar");
      const hasEuro = nombre.includes("euro");
      const hasCaja = nombre.includes("caja");
      return !hasDolar && !hasEuro && !hasCaja;
    }
    return true;
  });
}

export default function MyFiltroDeBanco({
  value,
  onChange,
  showLabel = true,
  testId = "filtro-banco",
  className = "",
  monedaFilter = "todos",
  soloTransferencia = false,
  allowAll = false,
}: MyFiltroDeBancoProps) {
  const { data: parametros = [], refetch } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros?tipo=bancos&habilitado=si"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const [currentUser, setCurrentUser] = useState(() => getStoredUsername());
  
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(getStoredUsername());
    };
    
    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    
    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);
  
  const bancos = useMemo(() => {
    let filtered = parametros
      .filter(p => p.nombre && hasBancoAccess(p.nombre));
    
    if (soloTransferencia) {
      filtered = filtered.filter(p => p.transferencia === true);
    }
    
    filtered = filtered.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
    return filterBancosByMoneda(filtered, monedaFilter);
  }, [parametros, currentUser, monedaFilter, soloTransferencia]);

  useEffect(() => {
    if (bancos.length === 0) return;
    if (value === "all") {
      if (!allowAll) {
        onChange(bancos[0].nombre);
      }
      return;
    }
    const exists = bancos.some(b => b.nombre === value);
    if (!exists) {
      onChange(allowAll ? "all" : bancos[0].nombre);
    }
  }, [value, bancos.length, allowAll]);

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
                <SelectItem key={banco.id} value={banco.nombre}>
                  {banco.nombre}
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
