import { useState, useEffect, useRef } from "react";
import { MyWindow } from "@/components/My";
import { Bug, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebugContext } from "@/contexts/DebugContext";

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "error" | "fetch" | "unhandled" | "api";
  message: string;
}

let errorIdCounter = 0;
const errorStore: ErrorEntry[] = [];
const listeners: Set<(errors: ErrorEntry[]) => void> = new Set();

function addError(type: ErrorEntry["type"], message: string) {
  const entry: ErrorEntry = {
    id: errorIdCounter++,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message: message.substring(0, 500),
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
    
    try {
      const response = await originalFetch(...args);
      const duration = Math.round(performance.now() - startTime);
      
      if (!response.ok) {
        let errorDetail = "";
        try {
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          errorDetail = text.substring(0, 200);
        } catch {}
        addError("fetch", `${method} ${response.status} ${response.statusText} - ${url} ${errorDetail}`);
      } else {
        addError("api", `${method} ${response.status} - ${url} (${duration}ms)`);
      }
      return response;
    } catch (error) {
      addError("fetch", `${method} Network error: ${url} - ${error}`);
      throw error;
    }
  };
}

interface DebugProps {
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  openModules?: Set<string>;
}

export default function Debug({ onClose, onFocus, zIndex = 50, openModules }: DebugProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([...errorStore]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeWindowDebug, allWindowsDebug } = useDebugContext();

  useEffect(() => {
    initErrorCapture();
    listeners.add(setErrors);
    return () => { listeners.delete(setErrors); };
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

  const windowsList = Object.keys(allWindowsDebug);

  return (
    <MyWindow
      id="debug-window"
      title="Debug"
      icon={<Bug className="h-4 w-4" />}
      initialPosition={{ x: 300, y: 100 }}
      initialSize={{ width: 500, height: 500 }}
      minSize={{ width: 350, height: 300 }}
      maxSize={{ width: 800, height: 700 }}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-red-500/60"
    >
      <div className="flex flex-col h-full p-2 gap-2">
        <div className="bg-muted/50 rounded p-2 text-xs space-y-1 border">
          <div className="font-bold text-sm mb-1 flex items-center gap-2">
            <Bug className="h-3 w-3" />
            Info del Sistema
          </div>
          <div>
            <span className="text-muted-foreground">Ventanas con datos (autoLoadTable):</span>{" "}
            {windowsList.length > 0 ? windowsList.join(", ") : "ninguna"}
          </div>
          <div>
            <span className="text-muted-foreground">Módulos abiertos:</span>{" "}
            {openModules && openModules.size > 0 ? Array.from(openModules).join(", ") : "ninguno"}
          </div>
          {activeWindowDebug && (
            <div className="mt-2 pt-2 border-t border-muted-foreground/20">
              <div className="font-semibold text-primary mb-1">Ventana activa: {activeWindowDebug.windowId}</div>
              <div><span className="text-muted-foreground">tableName:</span> {activeWindowDebug.tableName}</div>
              <div><span className="text-muted-foreground">tableData.length:</span> {activeWindowDebug.tableDataLength}</div>
              <div><span className="text-muted-foreground">totalLoaded:</span> {activeWindowDebug.totalLoaded}</div>
              <div><span className="text-muted-foreground">hasMore:</span> {String(activeWindowDebug.hasMore)}</div>
              <div><span className="text-muted-foreground">isLoading:</span> {String(activeWindowDebug.isLoading)}</div>
              <div><span className="text-muted-foreground">isLoadingMore:</span> {String(activeWindowDebug.isLoadingMore)}</div>
            </div>
          )}
          {!activeWindowDebug && (
            <div className="text-muted-foreground italic">No hay ventanas con autoLoadTable activo</div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <span className="text-primary">API Log ({errors.length})</span>
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
              <div key={err.id} className="mb-1 border-b border-gray-800 pb-1">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500">{err.timestamp}</span>
                  <span className={`font-bold ${getTypeColor(err.type)}`}>
                    [{getTypeLabel(err.type)}]
                  </span>
                </div>
                <div className="text-gray-300 break-all pl-2">
                  {err.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MyWindow>
  );
}
