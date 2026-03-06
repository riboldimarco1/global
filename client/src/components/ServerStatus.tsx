import { useState, useEffect, useRef, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";
import { requestTiming } from "@/lib/queryClient";

interface ServerStatusProps {
  checkInterval?: number;
}

export function ServerStatus({ checkInterval = 10000 }: ServerStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const checkingRef = useRef(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [latencyUrl, setLatencyUrl] = useState("");

  useEffect(() => {
    return requestTiming.subscribe((ms, url) => {
      setLatencyMs(ms);
      setLatencyUrl(url);
    });
  }, []);

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

  const latencyColor = latencyMs === null
    ? ""
    : latencyMs < 200
      ? "text-green-800 dark:text-green-300"
      : latencyMs < 500
        ? "text-yellow-800 dark:text-yellow-300"
        : "text-red-800 dark:text-red-300";

  const shortUrl = latencyUrl
    ? latencyUrl.replace(/^\/api\//, "").split("?")[0]
    : "";

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
          {latencyMs !== null && (
            <span className={`text-xs font-bold ${latencyColor}`} data-testid="text-latency">
              {latencyMs}ms
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={`${isConnected ? "bg-green-600" : "bg-red-600"} text-white`}>
        <div className="text-sm">
          <p className="font-medium">{statusText}</p>
          <p className="text-xs opacity-80">{timeText}</p>
          {latencyMs !== null && (
            <p className="text-xs opacity-80 mt-1">
              Última petición: {latencyMs}ms — {shortUrl}
            </p>
          )}
          <p className="text-xs opacity-80 mt-1">Clic para verificar ahora</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
