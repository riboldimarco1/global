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
          const eventType = data.type as string;

          if (eventType === "server_error") {
            window.dispatchEvent(new CustomEvent("server:error", { detail: data.data }));
            return;
          }
          
          if (eventType === "data_imported") {
            queryClient.invalidateQueries();
            window.dispatchEvent(new CustomEvent("realtime:refresh", { detail: { table: "all" } }));
            return;
          }

          const updateMatch = eventType.match(/^(.+)_updated$/);
          if (updateMatch) {
            const table = updateMatch[1];
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey[0];
                return typeof key === "string" && (
                  key === `/api/${table}` || key.startsWith(`/api/${table}?`)
                );
              }
            });
            window.dispatchEvent(new CustomEvent("realtime:refresh", { detail: { table } }));
            return;
          }

          const crudMatch = eventType.match(/^(.+):(create|update|delete)$/);
          if (crudMatch) {
            const table = crudMatch[1];
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey[0];
                return typeof key === "string" && (
                  key === `/api/${table}` || key.startsWith(`/api/${table}?`)
                );
              }
            });
            window.dispatchEvent(new CustomEvent("realtime:refresh", { detail: { table } }));
            return;
          }
        } catch (e) {
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
