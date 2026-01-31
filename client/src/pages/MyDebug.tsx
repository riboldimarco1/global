import { useState, useEffect, useRef } from "react";
import { MyWindow } from "@/components/My";
import { Bug, Trash2, AlertCircle, Zap, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiCall {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  description: string;
  status: number | null;
  duration: number | null;
  error?: string;
}

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "console" | "fetch" | "promise";
  message: string;
}

interface ServerLogEntry {
  id: number;
  time: string;
  operation: string;
  details?: string;
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
    "/api/grid-defaults": "Obtener configuración de grillas",
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
    "/api/export": "Exportar datos JSON",
    "/api/import-data": "Importar datos JSON/ZIP",
    "/api/import-dbf-global": "Importar archivos DBF",
    "/api/grid-defaults": "Guardar configuración de grilla",
  },
  "PUT": {
    "/api/bancos": "Actualizar movimiento bancario",
    "/api/administracion": "Actualizar administración",
    "/api/almacen": "Actualizar almacén",
    "/api/cosecha": "Actualizar cosecha",
    "/api/cheques": "Actualizar cheque",
    "/api/transferencias": "Actualizar transferencia",
    "/api/parametros": "Actualizar parámetro",
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
const serverLogs: ServerLogEntry[] = [];
const apiListeners: Set<(calls: ApiCall[]) => void> = new Set();
const errorListeners: Set<(errors: ErrorEntry[]) => void> = new Set();
const serverLogListeners: Set<(logs: ServerLogEntry[]) => void> = new Set();
let apiIdCounter = 0;
let errorIdCounter = 0;
let serverLogIdCounter = 0;

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
  // Disparar evento global para abrir MyDebug automáticamente
  window.dispatchEvent(new CustomEvent("debugError", { detail: entry }));
}

function addServerLog(log: Omit<ServerLogEntry, "id">) {
  const entry = { ...log, id: serverLogIdCounter++ };
  serverLogs.push(entry);
  if (serverLogs.length > 100) serverLogs.shift();
  serverLogListeners.forEach(fn => fn([...serverLogs]));
}

let wsInitialized = false;
function initWebSocket() {
  if (wsInitialized) return;
  wsInitialized = true;
  
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  function connect() {
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "server_log" && data.data) {
          addServerLog({
            time: data.data.time || new Date().toLocaleTimeString(),
            operation: data.data.operation,
            details: data.data.details
          });
        }
      } catch (e) {
        // Ignorar mensajes no JSON
      }
    };
    
    ws.onclose = () => {
      setTimeout(connect, 3000);
    };
    
    ws.onerror = () => {
      ws.close();
    };
  }
  
  connect();
}

let initialized = false;
function initCapture() {
  if (initialized) return;
  initialized = true;
  
  initWebSocket();

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
      
      addApiCall({
        timestamp: new Date().toLocaleTimeString(),
        method,
        url: url.split("?")[0],
        description,
        status: response.status,
        duration,
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
        url: url.split("?")[0],
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

export function MyDebug({ onClose, onFocus, zIndex, minimizedIndex }: MyDebugProps) {
  const [calls, setCalls] = useState<ApiCall[]>([...apiCalls]);
  const [errorList, setErrorList] = useState<ErrorEntry[]>([...errors]);
  const [svrLogs, setSvrLogs] = useState<ServerLogEntry[]>([...serverLogs]);
  const callsRef = useRef<HTMLDivElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const svrLogsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initCapture();
    
    apiListeners.add(setCalls);
    errorListeners.add(setErrorList);
    serverLogListeners.add(setSvrLogs);
    
    return () => {
      apiListeners.delete(setCalls);
      errorListeners.delete(setErrorList);
      serverLogListeners.delete(setSvrLogs);
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
    if (svrLogsRef.current) {
      svrLogsRef.current.scrollTop = svrLogsRef.current.scrollHeight;
    }
  }, [svrLogs]);

  const clearCalls = () => {
    apiCalls.length = 0;
    setCalls([]);
  };

  const clearErrors = () => {
    errors.length = 0;
    setErrorList([]);
  };

  const clearServerLogs = () => {
    serverLogs.length = 0;
    setSvrLogs([]);
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
      initialPosition={{ x: 300, y: 100 }}
      initialSize={{ width: 550, height: 600 }}
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
          <div 
            ref={callsRef}
            className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-blue-700/50"
          >
            {calls.length === 0 ? (
              <div className="text-gray-500 text-center py-2">No hay llamadas API</div>
            ) : (
              calls.map(call => (
                <div key={call.id} className="mb-1 flex items-start gap-2">
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
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="font-bold text-sm flex items-center gap-2">
              <Server className="h-3 w-3 text-purple-400" />
              <span className="text-purple-400">Server Logs ({svrLogs.length})</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs gap-1"
              onClick={clearServerLogs}
              data-testid="button-clear-server-logs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div 
            ref={svrLogsRef}
            className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-purple-700/50"
          >
            {svrLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-2">No hay logs del servidor</div>
            ) : (
              svrLogs.map(log => (
                <div key={log.id} className="mb-1 flex items-start gap-2">
                  <span className="text-gray-500">{log.time}</span>
                  <span className="text-purple-300 font-bold">{log.operation}</span>
                  {log.details && <span className="text-gray-300 flex-1">{log.details}</span>}
                </div>
              ))
            )}
          </div>
        </div>

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
