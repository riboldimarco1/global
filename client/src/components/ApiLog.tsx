import { useState, useEffect, useRef } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "error" | "fetch" | "unhandled" | "api";
  message: string;
  requestBody?: string;
  responseBody?: string;
}

let logIdCounter = 0;
const logStore: LogEntry[] = [];
const listeners: Set<(logs: LogEntry[]) => void> = new Set();

function addLog(type: LogEntry["type"], message: string, requestBody?: string, responseBody?: string) {
  const entry: LogEntry = {
    id: logIdCounter++,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message: message.substring(0, 500),
    requestBody: requestBody?.substring(0, 1000),
    responseBody: responseBody?.substring(0, 1000),
  };
  logStore.push(entry);
  if (logStore.length > 100) logStore.shift();
  listeners.forEach(fn => fn([...logStore]));
}

let initialized = false;
function initLogCapture() {
  if (initialized) return;
  initialized = true;

  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === "object" ? JSON.stringify(arg) : String(arg)
    ).join(" ");
    addLog("error", message);
  };

  window.addEventListener("error", (event: ErrorEvent) => {
    addLog("unhandled", `${event.message} at ${event.filename}:${event.lineno}`);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const message = event.reason?.message || String(event.reason);
    addLog("unhandled", `Promise rejected: ${message}`);
  });

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const input = args[0];
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const options = args[1] as RequestInit | undefined;
    const method = options?.method || "GET";
    const startTime = performance.now();
    
    let requestBody = "";
    if (options?.body) {
      try {
        requestBody = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      } catch {
        requestBody = String(options.body);
      }
    }
    
    try {
      const response = await originalFetch(...args);
      const duration = Math.round(performance.now() - startTime);
      
      let responseBody = "";
      try {
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        responseBody = text;
      } catch {}
      
      if (!response.ok) {
        addLog("fetch", `${method} ${response.status} ${response.statusText} - ${url}`, requestBody, responseBody);
      } else if (!url.includes("/api/health")) {
        addLog("api", `${method} ${response.status} - ${url} (${duration}ms)`, requestBody, responseBody);
      }
      return response;
    } catch (error) {
      addLog("fetch", `${method} Network error: ${url} - ${error}`, requestBody);
      throw error;
    }
  };
}

export default function ApiLog() {
  const [logs, setLogs] = useState<LogEntry[]>([...logStore]);
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initLogCapture();
    listeners.add(setLogs);
    return () => { listeners.delete(setLogs); };
  }, []);

  useEffect(() => {
    if (containerRef.current && isExpanded) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const clearLogs = () => {
    logStore.length = 0;
    setLogs([]);
  };

  const getTypeColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "error": return "text-red-400";
      case "fetch": return "text-orange-400";
      case "unhandled": return "text-yellow-400";
      case "api": return "text-green-400";
    }
  };

  const getTypeLabel = (type: LogEntry["type"]) => {
    switch (type) {
      case "error": return "ERR";
      case "fetch": return "FAIL";
      case "unhandled": return "UNH";
      case "api": return "API";
    }
  };

  return (
    <div 
      className="fixed bottom-2 right-2 z-[9999] bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
      style={{ width: isExpanded ? 400 : 120, userSelect: 'text' }}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xs font-bold">API Log</span>
          <span className="text-gray-500 text-[10px]">({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {isExpanded && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-gray-400 hover:text-white"
              onClick={clearLogs}
              data-testid="button-clear-api-log"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-gray-400 hover:text-white"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-api-log"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div 
          ref={containerRef}
          className="overflow-y-auto p-2 font-mono text-[10px] cursor-text"
          style={{ maxHeight: 200, userSelect: 'text' }}
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-2">Sin actividad</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="mb-1 pb-1 border-b border-gray-800" style={{ userSelect: 'text' }}>
                <div className="flex items-start gap-1">
                  <span className="text-gray-600">{log.timestamp}</span>
                  <span className={`font-bold ${getTypeColor(log.type)}`}>
                    [{getTypeLabel(log.type)}]
                  </span>
                </div>
                <div className="text-gray-300 break-all pl-1">
                  {log.message}
                </div>
                {log.requestBody && (
                  <details className="pl-1 mt-0.5">
                    <summary className="text-blue-400 cursor-pointer hover:text-blue-300">
                      Petición
                    </summary>
                    <pre className="text-blue-300 mt-0.5 p-1 bg-gray-800 rounded overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap" style={{ userSelect: 'text' }}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(log.requestBody || "");
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return log.requestBody;
                        }
                      })()}
                    </pre>
                  </details>
                )}
                {log.responseBody && (
                  <details className="pl-1 mt-0.5">
                    <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                      Respuesta
                    </summary>
                    <pre className="text-gray-400 mt-0.5 p-1 bg-gray-800 rounded overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap" style={{ userSelect: 'text' }}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(log.responseBody || "");
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return log.responseBody;
                        }
                      })()}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
