import { useState, useEffect, useRef, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

interface ServerStatusProps {
  checkInterval?: number;
}

export function ServerStatus({ checkInterval = 10000 }: ServerStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const checkingRef = useRef(false);

  const checkHealth = useCallback(async () => {
    if (checkingRef.current) return;
    
    checkingRef.current = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/api/health", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    } finally {
      checkingRef.current = false;
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    
    const interval = setInterval(checkHealth, checkInterval);
    
    return () => clearInterval(interval);
  }, [checkHealth, checkInterval]);

  const statusText = isConnected ? "Servidor conectado" : "Servidor desconectado";
  const timeText = lastCheck 
    ? `Última verificación: ${lastCheck.toLocaleTimeString()}`
    : "Verificando...";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={checkHealth}
          className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover-elevate transition-colors"
          data-testid="button-server-status"
        >
          {isConnected ? (
            <span className="p-1 rounded-md border-2 bg-green-600 border-green-700 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-white" />
            </span>
          ) : (
            <span className="p-1 rounded-md border-2 bg-red-600 border-red-700 flex items-center justify-center">
              <WifiOff className="h-4 w-4 text-white" />
            </span>
          )}
          <span className={`text-xs font-bold ${isConnected ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`}>
            {isConnected ? "OK" : "Error"}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={`${isConnected ? "bg-green-600" : "bg-red-600"} text-white`}>
        <div className="text-sm">
          <p className="font-medium">{statusText}</p>
          <p className="text-xs opacity-80">{timeText}</p>
          <p className="text-xs opacity-80 mt-1">Clic para verificar ahora</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
