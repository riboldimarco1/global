import { useState, useEffect, useRef } from "react";
import { MyWindow } from "@/components/My";
import { Bug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "error" | "fetch" | "unhandled" | "api";
  message: string;
  requestBody?: string;
  responseBody?: string;
}

let errorIdCounter = 0;
const errorStore: ErrorEntry[] = [];
const listeners: Set<(errors: ErrorEntry[]) => void> = new Set();

function addError(type: ErrorEntry["type"], message: string, requestBody?: string, responseBody?: string) {
  const entry: ErrorEntry = {
    id: errorIdCounter++,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message: message.substring(0, 500),
    requestBody: requestBody?.substring(0, 1000),
    responseBody: responseBody?.substring(0, 1000),
  };
  errorStore.push(entry);
  if (errorStore.length > 50) errorStore.shift();
  listeners.forEach(fn => fn([...errorStore]));
}

let initialized = false;
function initErrorCapture() {
  if (initialized) return;
  initialized = true;

  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === "object" ? JSON.stringify(arg) : String(arg)
    ).join(" ");
    addError("error", message);
  };

  window.addEventListener("error", (event: ErrorEvent) => {
    addError("unhandled", `${event.message} at ${event.filename}:${event.lineno}`);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const message = event.reason?.message || String(event.reason);
    addError("unhandled", `Promise rejected: ${message}`);
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
        addError("fetch", `${method} ${response.status} ${response.statusText} - ${url}`, requestBody, responseBody);
      } else {
        addError("api", `${method} ${response.status} - ${url} (${duration}ms)`, requestBody, responseBody);
      }
      return response;
    } catch (error) {
      addError("fetch", `${method} Network error: ${url} - ${error}`, requestBody);
      throw error;
    }
  };
}

interface DebugProps {
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
}

export default function Debug({ onClose, onFocus, zIndex = 50, minimizedIndex = 7 }: DebugProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([...errorStore].filter(e => e.type === "api" || e.type === "fetch"));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initErrorCapture();
    const handleUpdate = (entries: ErrorEntry[]) => setErrors(entries.filter(e => e.type === "api" || e.type === "fetch"));
    listeners.add(handleUpdate);
    return () => { listeners.delete(handleUpdate); };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [errors]);

  const clearErrors = () => {
    errorStore.length = 0;
    setErrors([]);
  };

  const getTypeColor = (type: ErrorEntry["type"]) => {
    switch (type) {
      case "error": return "text-red-400";
      case "fetch": return "text-orange-400";
      case "unhandled": return "text-yellow-400";
      case "api": return "text-green-400";
    }
  };

  const getTypeLabel = (type: ErrorEntry["type"]) => {
    switch (type) {
      case "error": return "ERR";
      case "fetch": return "FAIL";
      case "unhandled": return "UNH";
      case "api": return "API";
    }
  };

  return (
    <MyWindow
      id="debug-window"
      title="API Log"
      icon={<Bug className="h-4 w-4" />}
      initialPosition={{ x: 300, y: 100 }}
      initialSize={{ width: 500, height: 500 }}
      minSize={{ width: 350, height: 300 }}
      maxSize={{ width: 800, height: 700 }}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-red-500/60"
      minimizedIndex={minimizedIndex}
      allowTextSelection={true}
    >
      <div className="flex flex-col h-full p-2 gap-2">
        <div className="flex items-center justify-between shrink-0">
          <div className="font-bold text-sm flex items-center gap-2">
            <Bug className="h-4 w-4 text-red-500" />
            API Log ({errors.length})
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={clearErrors}
            data-testid="button-clear-debug-errors"
          >
            <Trash2 className="h-3 w-3" />
            Limpiar
          </Button>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-gray-700 select-text cursor-text"
        >
          {errors.length === 0 ? (
            <div className="text-gray-500 text-center py-4">Sin actividad API</div>
          ) : (
            errors.map(err => (
              <div key={err.id} className="mb-2 border-b border-gray-800 pb-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500">{err.timestamp}</span>
                  <span className={`font-bold ${getTypeColor(err.type)}`}>
                    [{getTypeLabel(err.type)}]
                  </span>
                </div>
                <div className="text-gray-300 break-all pl-2">
                  {err.message}
                </div>
                {err.requestBody && (
                  <details className="pl-2 mt-1">
                    <summary className="text-blue-400 cursor-pointer hover:text-blue-300 text-[10px]">
                      Ver petición
                    </summary>
                    <pre className="text-blue-300 text-[10px] mt-1 p-1 bg-gray-800 rounded overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {(() => {
                        try {
                          const parsed = JSON.parse(err.requestBody || "");
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return err.requestBody;
                        }
                      })()}
                    </pre>
                  </details>
                )}
                {err.responseBody && (
                  <details className="pl-2 mt-1">
                    <summary className="text-gray-400 cursor-pointer hover:text-gray-300 text-[10px]">
                      Ver respuesta
                    </summary>
                    <pre className="text-gray-400 text-[10px] mt-1 p-1 bg-gray-800 rounded overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {(() => {
                        try {
                          const parsed = JSON.parse(err.responseBody || "");
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return err.responseBody;
                        }
                      })()}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MyWindow>
  );
}
