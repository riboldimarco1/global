import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

export function useRealtimeSync() {
  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      if (!isMountedRef.current) return;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.type;
          
          if (eventType === "bancos:create" || eventType === "bancos:update" || eventType === "bancos_updated") {
            queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
          }
          
          if (eventType === "administracion:create" || eventType === "administracion:update" || eventType === "administracion_updated") {
            queryClient.invalidateQueries({ queryKey: ["/api/administracion"] });
          }
          
          if (eventType === "transferencias:create" || eventType === "transferencias:update" || eventType === "transferencias_updated") {
            queryClient.invalidateQueries({ queryKey: ["/api/transferencias"] });
          }
        } catch (e) {
          // Ignorar mensajes no JSON
        }
      };
      
      ws.onclose = () => {
        if (isMountedRef.current) {
          setTimeout(connect, 3000);
        }
      };
      
      ws.onerror = () => {
        ws.close();
      };
    };
    
    connect();
    
    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
}
