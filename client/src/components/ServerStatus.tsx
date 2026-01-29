import { useState, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

interface ServerStatusProps {
  checkInterval?: number;
}

export function ServerStatus({ checkInterval = 10000 }: ServerStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    if (checking) return;
    
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/api/health", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setChecking(false);
      setLastCheck(new Date());
    }
  }, [checking]);

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
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover-elevate transition-colors"
          data-testid="button-server-status"
        >
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-xs font-medium ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isConnected ? "OK" : "Error"}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-sm">
          <p className="font-medium">{statusText}</p>
          <p className="text-xs text-muted-foreground">{timeText}</p>
          <p className="text-xs text-muted-foreground mt-1">Clic para verificar ahora</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
