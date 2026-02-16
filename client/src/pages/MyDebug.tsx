import { useState, useEffect, useRef } from "react";
import { MyWindow } from "@/components/My";
import { Bug, Trash2, AlertCircle, Zap, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ApiCall {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  description: string;
  status: number | null;
  duration: number | null;
  error?: string;
  response?: string;
  responseTotal?: number;
  responseCount?: number;
}

interface DebugStep {
  id: number;
  timestamp: string;
  mensaje: string;
  tipo: "info" | "success" | "error";
  datos?: Record<string, any>;
}

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "console" | "fetch" | "promise";
  message: string;
}

const endpointDescriptions: Record<string, Record<string, string>> = {
  "GET": {
    "/api/health": "Verificar servidor",
    "/api/bancos": "Obtener movimientos bancarios",
    "/api/bancos/lista": "Obtener lista de bancos",
    "/api/administracion": "Obtener registros de administración",
    "/api/almacen": "Obtener movimientos de almacén",
    "/api/cosecha": "Obtener registros de cosecha",
    "/api/cheques": "Obtener lista de cheques",
    "/api/transferencias": "Obtener transferencias",
    "/api/parametros": "Obtener parámetros del sistema",
    "/api/tasa-cambio": "Obtener tasa de cambio",
    "/api/defaults": "Obtener configuración de usuario",
  },
  "POST": {
    "/api/login": "Validar credenciales",
    "/api/bancos": "Crear movimiento bancario",
    "/api/bancos/recalcular-saldos": "Recalcular saldos de bancos",
    "/api/administracion": "Crear registro administración",
    "/api/almacen": "Crear movimiento almacén",
    "/api/cosecha": "Crear registro cosecha",
    "/api/cheques": "Crear cheque",
    "/api/transferencias": "Crear transferencia",
    "/api/parametros": "Crear parámetro",
    "/api/bulk-delete": "Eliminar múltiples registros",
    "/api/import-dbf-global": "Importar archivos DBF",
  },
  "PUT": {
    "/api/bancos": "Actualizar movimiento bancario",
    "/api/administracion": "Actualizar administración",
    "/api/almacen": "Actualizar almacén",
    "/api/cosecha": "Actualizar cosecha",
    "/api/cheques": "Actualizar cheque",
    "/api/transferencias": "Actualizar transferencia",
    "/api/parametros": "Actualizar parámetro",
    "/api/defaults": "Guardar configuración de usuario",
  },
  "DELETE": {
    "/api/bancos": "Eliminar movimiento bancario",
    "/api/administracion": "Eliminar administración",
    "/api/almacen": "Eliminar almacén",
    "/api/cosecha": "Eliminar cosecha",
    "/api/cheques": "Eliminar cheque",
    "/api/transferencias": "Eliminar transferencia",
    "/api/parametros": "Eliminar parámetro",
  },
  "PATCH": {
    "/api/parametros": "Actualizar parámetro",
    "/api/bancos": "Actualizar campo bancario",
    "/api/administracion": "Actualizar campo administración",
  }
};

function getEndpointDescription(method: string, url: string): string {
  const pathOnly = url.split("?")[0];
  const methodMap = endpointDescriptions[method.toUpperCase()];
  if (!methodMap) return pathOnly;
  
  if (methodMap[pathOnly]) return methodMap[pathOnly];
  
  const segments = pathOnly.split("/");
  if (segments.length > 3) {
    const lastSeg = segments[segments.length - 1];
    if (/^[a-f0-9-]{8,}$/i.test(lastSeg) || /^\d+$/.test(lastSeg) || 
        /^\d{4}-\d{2}-\d{2}$/.test(lastSeg) || /^[a-z0-9_-]{6,}$/i.test(lastSeg)) {
      const basePath = segments.slice(0, -1).join("/");
      if (methodMap[basePath]) return methodMap[basePath];
    }
  }
  
  return pathOnly.replace("/api/", "");
}

const apiCalls: ApiCall[] = [];
const errors: ErrorEntry[] = [];
const debugSteps: DebugStep[] = [];
const apiListeners: Set<(calls: ApiCall[]) => void> = new Set();
const errorListeners: Set<(errors: ErrorEntry[]) => void> = new Set();
const stepListeners: Set<(steps: DebugStep[]) => void> = new Set();
let apiIdCounter = 0;
let errorIdCounter = 0;
let stepIdCounter = 0;

function addApiCall(call: Omit<ApiCall, "id">) {
  const entry = { ...call, id: apiIdCounter++ };
  apiCalls.push(entry);
  if (apiCalls.length > 100) apiCalls.shift();
  apiListeners.forEach(fn => fn([...apiCalls]));
}

function addError(type: ErrorEntry["type"], message: string) {
  const entry: ErrorEntry = {
    id: errorIdCounter++,
    timestamp: new Date().toLocaleTimeString(),
    type,
    message: message.substring(0, 300),
  };
  errors.push(entry);
  if (errors.length > 50) errors.shift();
  errorListeners.forEach(fn => fn([...errors]));
  window.dispatchEvent(new CustomEvent("debugError", { detail: entry }));
}

let initialized = false;
function initCapture() {
  if (initialized) return;
  initialized = true;

  const originalError = console.error;
  console.error = (...args) => {
    originalError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === "object" ? JSON.stringify(arg) : String(arg)
    ).join(" ");
    addError("console", message);
  };

  window.addEventListener("error", (event: ErrorEvent) => {
    addError("console", `${event.message} at ${event.filename}:${event.lineno}`);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const message = event.reason?.message || String(event.reason);
    addError("promise", `Promise rejected: ${message}`);
  });

  window.addEventListener("debugStep", ((event: CustomEvent) => {
    const { mensaje, tipo, datos, timestamp } = event.detail;
    const entry: DebugStep = {
      id: stepIdCounter++,
      timestamp: timestamp || new Date().toLocaleTimeString(),
      mensaje,
      tipo: tipo || "info",
      datos,
    };
    debugSteps.push(entry);
    if (debugSteps.length > 100) debugSteps.shift();
    stepListeners.forEach(fn => fn([...debugSteps]));
  }) as EventListener);

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const input = args[0];
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    const options = args[1] as RequestInit | undefined;
    const method = options?.method || "GET";
    const startTime = performance.now();
    
    if (url.includes("/api/health")) {
      return originalFetch(...args);
    }
    
    const description = getEndpointDescription(method, url);
    
    try {
      const response = await originalFetch(...args);
      const duration = Math.round(performance.now() - startTime);
      
      let responseInfo: { response?: string; responseTotal?: number; responseCount?: number } = {};
      
      if (url.includes("/api/")) {
        try {
          const cloned = response.clone();
          const json = await cloned.json();
          if (json && typeof json === "object") {
            if (json.total !== undefined) {
              responseInfo.responseTotal = json.total;
            }
            if (Array.isArray(json.data)) {
              responseInfo.responseCount = json.data.length;
            } else if (Array.isArray(json)) {
              responseInfo.responseCount = json.length;
            }
            const preview = JSON.stringify(json).slice(0, 200);
            responseInfo.response = preview + (preview.length >= 200 ? "..." : "");
          }
        } catch {
        }
      }
      
      addApiCall({
        timestamp: new Date().toLocaleTimeString(),
        method,
        url,
        description,
        status: response.status,
        duration,
        ...responseInfo,
      });
      
      if (!response.ok) {
        addError("fetch", `${method} ${response.status} - ${url}`);
      }
      
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      addApiCall({
        timestamp: new Date().toLocaleTimeString(),
        method,
        url,
        description,
        status: null,
        duration,
        error: String(error),
      });
      addError("fetch", `${method} Network error: ${url}`);
      throw error;
    }
  };
}

interface MyDebugProps {
  onClose?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
}

const STORAGE_KEY_POSITION = "mydebug_position";
const STORAGE_KEY_SIZE = "mydebug_size";

function loadPersistedPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_POSITION);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { x: 300, y: 100 };
}

function loadPersistedSize(): { width: number; height: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SIZE);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { width: 550, height: 600 };
}

export function MyDebug({ onClose, onFocus, zIndex, minimizedIndex }: MyDebugProps) {
  const { toast } = useToast();
  const [calls, setCalls] = useState<ApiCall[]>([...apiCalls]);
  const [errorList, setErrorList] = useState<ErrorEntry[]>([...errors]);
  const [steps, setSteps] = useState<DebugStep[]>([...debugSteps]);
  const [copied, setCopied] = useState(false);
  const callsRef = useRef<HTMLDivElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  
  const [initialPosition] = useState(loadPersistedPosition);
  const [initialSize] = useState(loadPersistedSize);
  
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;
    let retryCount = 0;
    
    const saveState = () => {
      const windowEl = document.getElementById("mydebug-window");
      if (!windowEl) return;
      
      const rect = windowEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const pos = { x: Math.round(rect.left), y: Math.round(rect.top) };
        const size = { width: Math.round(rect.width), height: Math.round(rect.height) };
        localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(pos));
        localStorage.setItem(STORAGE_KEY_SIZE, JSON.stringify(size));
      }
    };
    
    const debouncedSave = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(saveState, 200);
    };
    
    const attachObserver = () => {
      if (!mounted || retryCount > 20) return;
      const windowEl = document.getElementById("mydebug-window");
      if (windowEl) {
        observer = new MutationObserver(debouncedSave);
        observer.observe(windowEl, { attributes: true, attributeFilter: ["style"] });
      } else {
        retryCount++;
        setTimeout(attachObserver, 100);
      }
    };
    
    attachObserver();
    
    return () => {
      mounted = false;
      if (observer) observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    initCapture();
    
    apiListeners.add(setCalls);
    errorListeners.add(setErrorList);
    stepListeners.add(setSteps);
    
    return () => {
      apiListeners.delete(setCalls);
      errorListeners.delete(setErrorList);
      stepListeners.delete(setSteps);
    };
  }, []);

  useEffect(() => {
    if (callsRef.current) {
      callsRef.current.scrollTop = callsRef.current.scrollHeight;
    }
  }, [calls]);

  useEffect(() => {
    if (errorsRef.current) {
      errorsRef.current.scrollTop = errorsRef.current.scrollHeight;
    }
  }, [errorList]);

  useEffect(() => {
    if (stepsRef.current) {
      stepsRef.current.scrollTop = stepsRef.current.scrollHeight;
    }
  }, [steps]);

  const clearSteps = () => {
    debugSteps.length = 0;
    setSteps([]);
  };

  const clearCalls = () => {
    apiCalls.length = 0;
    setCalls([]);
  };

  const clearErrors = () => {
    errors.length = 0;
    setErrorList([]);
  };

  const copyAllText = async () => {
    let text = "=== API CALLS ===\n";
    calls.forEach(call => {
      text += `${call.timestamp} ${call.method} ${call.description} ${call.status || "ERR"} ${call.duration || 0}ms\n`;
      text += `  ${call.url}\n`;
      if (call.responseTotal !== undefined || call.responseCount !== undefined) {
        text += `  total: ${call.responseTotal ?? "-"}, recibidos: ${call.responseCount ?? "-"}\n`;
      }
    });
    
    text += "\n=== ERRORS ===\n";
    errorList.forEach(err => {
      text += `${err.timestamp} [${err.type}] ${err.message}\n`;
    });
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copiado", description: "Todo el texto copiado al portapapeles" });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo copiar al portapapeles" });
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "text-green-400";
      case "POST": return "text-blue-400";
      case "PUT": return "text-yellow-400";
      case "PATCH": return "text-orange-400";
      case "DELETE": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  return (
    <MyWindow
      id="mydebug-window"
      title="MyDebug"
      icon={<Bug className="h-4 w-4" />}
      tutorialId="debug"
      initialPosition={initialPosition}
      initialSize={initialSize}
      minSize={{ width: 400, height: 400 }}
      maxSize={{ width: 900, height: 900 }}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-red-500/60"
      minimizedIndex={minimizedIndex}
    >
      <div className="flex flex-col h-full p-2 gap-3 overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="font-bold text-sm flex items-center gap-2">
              <Zap className="h-3 w-3 text-blue-400" />
              <span className="text-blue-400">API Calls ({calls.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1"
                onClick={copyAllText}
                data-testid="button-copy-all"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1"
                onClick={clearCalls}
                data-testid="button-clear-calls"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div 
            ref={callsRef}
            className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-blue-700/50"
          >
            {calls.length === 0 ? (
              <div className="text-gray-500 text-center py-2">No hay llamadas API</div>
            ) : (
              calls.map(call => (
                <div key={call.id} className="mb-2 border-b border-gray-700/50 pb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">{call.timestamp}</span>
                    <span className={`font-bold w-14 ${getMethodColor(call.method)}`}>{call.method}</span>
                    <span className="text-cyan-300 flex-1">{call.description}</span>
                    {call.status && (
                      <span className={call.status >= 400 ? "text-red-400" : "text-green-400"}>
                        {call.status}
                      </span>
                    )}
                    {call.duration && (
                      <span className="text-gray-500">{call.duration}ms</span>
                    )}
                    {call.error && (
                      <span className="text-red-400">ERR</span>
                    )}
                  </div>
                  <div className="ml-[4.5rem] text-[10px] text-gray-400 break-all">
                    {call.url}
                  </div>
                  {(call.responseTotal !== undefined || call.responseCount !== undefined) && (
                    <div className="ml-[4.5rem] text-[10px] text-gray-400 flex gap-3">
                      {call.responseTotal !== undefined && (
                        <span>total: <span className="text-yellow-400 font-bold">{call.responseTotal.toLocaleString()}</span></span>
                      )}
                      {call.responseCount !== undefined && (
                        <span>recibidos: <span className="text-green-400">{call.responseCount}</span></span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {steps.length > 0 && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <div className="font-bold text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-purple-400" />
                <span className="text-purple-400">Debug Steps ({steps.length})</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs gap-1"
                onClick={clearSteps}
                data-testid="button-clear-steps"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div
              ref={stepsRef}
              className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-purple-700/50"
            >
              {steps.map(step => (
                <div key={step.id} className="mb-2 border-b border-gray-700/50 pb-1">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">{step.timestamp}</span>
                    <span className={
                      step.tipo === "success" ? "text-green-400" :
                      step.tipo === "error" ? "text-red-400" :
                      "text-blue-400"
                    }>
                      {step.tipo === "success" ? "OK" : step.tipo === "error" ? "ERR" : ">>>"}
                    </span>
                    <span className="text-cyan-300 flex-1">{step.mensaje}</span>
                  </div>
                  {step.datos && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {Object.entries(step.datos).map(([key, value]) => (
                        <div key={key} className="text-[10px] flex gap-1">
                          <span className="text-yellow-400">{key}:</span>
                          <span className="text-gray-300 break-all">
                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="font-bold text-sm flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-red-400" />
              <span className="text-red-400">Errors ({errorList.length})</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs gap-1"
              onClick={clearErrors}
              data-testid="button-clear-errors"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div 
            ref={errorsRef}
            className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-red-700/50"
          >
            {errorList.length === 0 ? (
              <div className="text-gray-500 text-center py-2">No hay errores</div>
            ) : (
              errorList.map(err => (
                <div key={err.id} className="mb-1">
                  <span className="text-gray-500">{err.timestamp}</span>
                  <span className={`ml-2 ${
                    err.type === "console" ? "text-yellow-400" : 
                    err.type === "fetch" ? "text-orange-400" : "text-red-400"
                  }`}>
                    [{err.type}]
                  </span>
                  <span className="ml-2 text-gray-300">{err.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MyWindow>
  );
}

export default MyDebug;
