import { useState, useEffect, useRef } from "react";
import { MyWindow } from "@/components/My";
import { Bug, Trash2, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebugContext } from "@/contexts/DebugContext";

interface ErrorEntry {
  id: number;
  timestamp: string;
  type: "error" | "fetch" | "unhandled" | "api";
  message: string;
  requestBody?: string;
  responseBody?: string;
}

interface RegistroRecalculado {
  id: string;
  fecha: string;
  monto: number;
  operador: string;
  conciliado: boolean;
  saldo: number;
  saldo_conciliado: number;
}

interface RecalculoEvent {
  id: number;
  timestamp: string;
  bancoNombre: string;
  registroModificadoId: string;
  registros: RegistroRecalculado[];
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
      } else if (!url.includes("/api/health")) {
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
  openModules?: Set<string>;
  minimizedIndex?: number;
}

interface DebugStep {
  id: number;
  timestamp: string;
  mensaje: string;
  tipo: "info" | "success" | "error";
  datos?: any;
}

let recalculoIdCounter = 0;
let stepIdCounter = 0;

export default function Debug({ onClose, onFocus, zIndex = 50, openModules, minimizedIndex = 7 }: DebugProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([...errorStore]);
  const [recalculos, setRecalculos] = useState<RecalculoEvent[]>([]);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const recalculosRef = useRef<HTMLDivElement>(null);
  const { activeWindowDebug, allWindowsDebug } = useDebugContext();

  useEffect(() => {
    initErrorCapture();
    listeners.add(setErrors);
    return () => { listeners.delete(setErrors); };
  }, []);

  useEffect(() => {
    const handleRecalculo = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { bancoNombre, registros, registroModificadoId } = customEvent.detail;
      const newEvent: RecalculoEvent = {
        id: recalculoIdCounter++,
        timestamp: new Date().toLocaleTimeString(),
        bancoNombre,
        registroModificadoId,
        registros
      };
      setRecalculos(prev => [...prev.slice(-9), newEvent]); // Keep last 10
    };
    
    window.addEventListener("bancosRecalculados", handleRecalculo);
    return () => window.removeEventListener("bancosRecalculados", handleRecalculo);
  }, []);

  useEffect(() => {
    const handleDebugStep = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { mensaje, tipo, datos, timestamp } = customEvent.detail;
      const newStep: DebugStep = {
        id: stepIdCounter++,
        timestamp,
        mensaje,
        tipo,
        datos
      };
      setDebugSteps(prev => [...prev.slice(-19), newStep]); // Keep last 20
    };
    
    window.addEventListener("debugStep", handleDebugStep);
    return () => window.removeEventListener("debugStep", handleDebugStep);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [errors]);

  useEffect(() => {
    if (recalculosRef.current) {
      recalculosRef.current.scrollTop = recalculosRef.current.scrollHeight;
    }
  }, [recalculos]);

  useEffect(() => {
    if (stepsRef.current) {
      stepsRef.current.scrollTop = stepsRef.current.scrollHeight;
    }
  }, [debugSteps]);

  const clearErrors = () => {
    errorStore.length = 0;
    setErrors([]);
  };

  const clearRecalculos = () => {
    setRecalculos([]);
  };

  const clearSteps = () => {
    setDebugSteps([]);
  };

  const getStepColor = (tipo: DebugStep["tipo"]) => {
    switch (tipo) {
      case "info": return "text-blue-400";
      case "success": return "text-green-400";
      case "error": return "text-red-400";
    }
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
      minimizedIndex={minimizedIndex}
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

        {/* Sección de Pasos de Proceso */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <Activity className="h-3 w-3 text-purple-400" />
            <span className="text-purple-400">Pasos de Proceso ({debugSteps.length})</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={clearSteps}
            data-testid="button-clear-steps"
          >
            <Trash2 className="h-3 w-3" />
            Limpiar
          </Button>
        </div>

        <div 
          ref={stepsRef}
          className="max-h-32 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-purple-700/50 cursor-text"
          style={{ userSelect: 'text' }}
        >
          {debugSteps.length === 0 ? (
            <div className="text-gray-500 text-center py-2">Cambia "conciliado" en Bancos para ver pasos del proceso</div>
          ) : (
            debugSteps.map(step => (
              <div key={step.id} className="py-0.5 border-b border-gray-800/50">
                <span className="text-gray-500">{step.timestamp}</span>
                <span className={`ml-2 ${getStepColor(step.tipo)}`}>
                  {step.tipo === "info" ? "[INFO]" : step.tipo === "success" ? "[OK]" : "[ERR]"}
                </span>
                <span className="text-gray-300 ml-2">{step.mensaje}</span>
                {step.datos && (
                  <span className="text-gray-500 ml-2 text-[10px]">
                    {JSON.stringify(step.datos)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sección de Recálculos de Bancos */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm flex items-center gap-2">
            <RefreshCw className="h-3 w-3 text-cyan-400" />
            <span className="text-cyan-400">Recálculos Bancos ({recalculos.length})</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={clearRecalculos}
            data-testid="button-clear-recalculos"
          >
            <Trash2 className="h-3 w-3" />
            Limpiar
          </Button>
        </div>

        <div 
          ref={recalculosRef}
          className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-cyan-700/50 cursor-text"
          style={{ userSelect: 'text' }}
        >
          {recalculos.length === 0 ? (
            <div className="text-gray-500 text-center py-2">Cambia "conciliado" en Bancos para ver recálculos</div>
          ) : (
            recalculos.map(rec => (
              <details key={rec.id} className="mb-2 border-b border-gray-800 pb-2">
                <summary className="cursor-pointer hover:text-cyan-300">
                  <span className="text-gray-500">{rec.timestamp}</span>
                  <span className="text-cyan-400 ml-2">[{rec.bancoNombre}]</span>
                  <span className="text-gray-300 ml-2">{rec.registros.length} registros recalculados</span>
                </summary>
                <div className="pl-4 mt-1 space-y-1">
                  <div className="text-gray-400 text-[10px] mb-1">Registro modificado: ID {rec.registroModificadoId}</div>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left py-1">ID</th>
                        <th className="text-left py-1">Fecha</th>
                        <th className="text-right py-1">Monto</th>
                        <th className="text-center py-1">Op</th>
                        <th className="text-center py-1">Conc</th>
                        <th className="text-right py-1">Saldo</th>
                        <th className="text-right py-1">Saldo Conc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rec.registros.map(r => (
                        <tr key={r.id} className={`border-b border-gray-800 ${r.id === rec.registroModificadoId ? 'bg-cyan-900/30' : ''}`}>
                          <td className="text-gray-400 py-0.5">{r.id}</td>
                          <td className="text-gray-300 py-0.5">{r.fecha}</td>
                          <td className="text-right text-gray-300 py-0.5">{r.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                          <td className="text-center text-gray-400 py-0.5">{r.operador === 'suma' ? '+' : '-'}</td>
                          <td className="text-center py-0.5">{r.conciliado ? 'Si' : ''}</td>
                          <td className="text-right text-green-400 py-0.5">{r.saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                          <td className="text-right text-blue-400 py-0.5">{r.saldo_conciliado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))
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
          className="flex-1 overflow-y-auto bg-gray-900 rounded p-2 font-mono text-xs border border-gray-700 cursor-text"
          style={{ userSelect: 'text' }}
        >
          {errors.length === 0 ? (
            <div className="text-gray-500 text-center py-4">Sin actividad API</div>
          ) : (
            errors.map(err => (
              <div key={err.id} className="mb-2 border-b border-gray-800 pb-2" style={{ userSelect: 'text' }}>
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
                    <pre className="text-blue-300 text-[10px] mt-1 p-1 bg-gray-800 rounded overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap" style={{ userSelect: 'text' }}>
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
                    <pre className="text-gray-400 text-[10px] mt-1 p-1 bg-gray-800 rounded overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap" style={{ userSelect: 'text' }}>
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
