import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Database, Wifi, X, CheckCircle, XCircle, Loader2, Download, WifiOff } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";

type RowHandler = (row: Record<string, any>) => void;

const agrodataColumns: Column[] = [
  { key: "nombre", label: "Nombre", defaultWidth: 150 },
  { key: "equipo", label: "Equipo", defaultWidth: 120 },
  { key: "plan", label: "Plan", defaultWidth: 100 },
  { key: "ip", label: "IP", defaultWidth: 120, type: "ip" },
  { key: "mac", label: "MAC", defaultWidth: 140, type: "mac" },
  { key: "latencia", label: "Latencia", defaultWidth: 80 },
  { key: "estado", label: "Estado", defaultWidth: 90 },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface PingResult {
  id: string;
  nombre: string;
  ip: string | null;
  status: "pending" | "pinging" | "success" | "error";
  latencia?: string;
  mac?: string;
  estado?: string;
}

interface PingWindowProps {
  isOpen: boolean;
  onClose: () => void;
  records: Record<string, any>[];
  onPingComplete: () => void;
}

function PingWindow({ isOpen, onClose, records, onPingComplete }: PingWindowProps) {
  const [pingResults, setPingResults] = useState<PingResult[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [agentConnected, setAgentConnected] = useState(false);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "browser_hello", sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === "agent_status") {
          setAgentConnected(message.connected);
          if (message.agentToken) {
            setAgentToken(message.agentToken);
          }
        } else if (message.type === "ping_result" && message.result) {
          const { id, success, latencia, mac, estado } = message.result;
          setPingResults(prev => prev.map(r => 
            r.id === id ? {
              ...r,
              status: success ? "success" : "error",
              latencia,
              mac,
              estado,
            } : r
          ));
        } else if (message.type === "ping_complete") {
          setIsPinging(false);
          onPingComplete();
        } else if (message.type === "agent_error") {
          toast({ title: "Error", description: message.error, variant: "destructive" });
          setIsPinging(false);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      setAgentConnected(false);
    };

    ws.onclose = () => {
      setAgentConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isOpen, sessionId, onPingComplete, toast]);

  useEffect(() => {
    if (isOpen && records.length > 0) {
      setPingResults(records.map(r => ({
        id: r.id,
        nombre: r.nombre || r.ip || "Sin nombre",
        ip: r.ip,
        status: "pending",
      })));
    }
  }, [isOpen, records]);

  const startPing = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({ title: "Error", description: "No hay conexión con el servidor", variant: "destructive" });
      return;
    }

    if (!agentConnected) {
      toast({ title: "Error", description: "No hay agente conectado. Descarga y ejecuta el agente en tu PC.", variant: "destructive" });
      return;
    }

    setIsPinging(true);
    setPingResults(prev => prev.map(r => ({ ...r, status: "pending" })));

    const recordsToSend = records.map(r => ({
      id: r.id,
      ip: r.ip,
      nombre: r.nombre || r.ip || "Sin nombre",
    }));

    wsRef.current.send(JSON.stringify({
      type: "ping_request",
      sessionId,
      records: recordsToSend,
    }));

    setPingResults(prev => prev.map(r => ({ ...r, status: "pinging" })));
  }, [agentConnected, records, sessionId, toast]);


  const handleDownloadAgent = () => {
    window.open("/ping-agent.py", "_blank");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPinging) onClose();
      }}
      data-testid="overlay-ping-window"
    >
      <div className="bg-background border rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col" data-testid="dialog-ping-window">
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-teal-500/20 to-cyan-500/20">
          <div className="flex items-center gap-2">
            {agentConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="font-medium">Ping a registros</span>
            <span className="text-xs text-muted-foreground">
              ({pingResults.filter(r => r.status === "success" || r.status === "error").length}/{pingResults.length})
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${agentConnected ? "bg-green-500/20 text-green-700" : "bg-red-500/20 text-red-700"}`}>
              {agentConnected ? "Agente conectado" : "Sin agente"}
            </span>
          </div>
          {!isPinging && (
            <MyButtonStyle 
              color="gray"
              onClick={onClose}
              data-testid="button-ping-window-close"
              className="!p-1.5 !min-w-0"
            >
              <X className="h-4 w-4" />
            </MyButtonStyle>
          )}
        </div>

        {!agentConnected && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30">
            <div className="text-sm text-amber-800 dark:text-amber-200 mb-2">
              Para hacer ping necesitas el agente corriendo en tu PC:
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MyButtonStyle color="blue" onClick={handleDownloadAgent} data-testid="button-download-agent">
                  <Download className="h-4 w-4 mr-1" />
                  Descargar Agente
                </MyButtonStyle>
                <span className="text-xs text-muted-foreground">
                  Requiere Python y websocket-client
                </span>
              </div>
              {agentToken && (
                <div className="flex items-center gap-2 bg-background/50 p-2 rounded border">
                  <span className="text-xs text-muted-foreground">Ejecutar:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">
                    python ping-agent.py {window.location.origin} {agentToken}
                  </code>
                  <MyButtonStyle
                    color="gray"
                    onClick={() => {
                      navigator.clipboard.writeText(`python ping-agent.py ${window.location.origin} ${agentToken}`);
                      toast({ title: "Copiado", description: "Comando copiado al portapapeles" });
                    }}
                    data-testid="button-copy-command"
                    className="!py-1 !px-2"
                  >
                    Copiar
                  </MyButtonStyle>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-auto p-2">
          <div className="space-y-1">
            {pingResults.map((result, index) => (
              <div 
                key={result.id}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  result.status === "pinging" ? "bg-yellow-500/10 border border-yellow-500/30" :
                  result.status === "success" ? "bg-green-500/10" :
                  result.status === "error" ? "bg-red-500/10" :
                  "bg-muted/30"
                }`}
              >
                <div className="w-5 flex justify-center">
                  {result.status === "pending" && <span className="text-muted-foreground text-xs">{index + 1}</span>}
                  {result.status === "pinging" && <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />}
                  {result.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {result.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{result.nombre}</div>
                  <div className="text-xs text-muted-foreground">{result.ip || "Sin IP"}</div>
                </div>
                <div className="text-right text-xs">
                  {result.status === "success" && (
                    <div className="text-green-600">{result.latencia}</div>
                  )}
                  {result.status === "error" && (
                    <div className="text-red-600">{result.latencia || "timeout"}</div>
                  )}
                  {result.mac && (
                    <div className="text-muted-foreground">{result.mac}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-2 p-3 border-t">
          <div>
            {!agentConnected && (
              <MyButtonStyle color="blue" onClick={handleDownloadAgent} data-testid="button-download-agent-footer">
                <Download className="h-4 w-4 mr-1" />
                Descargar Agente
              </MyButtonStyle>
            )}
          </div>
          <div className="flex gap-2">
            {agentConnected && !isPinging && pingResults.length > 0 && (
              <MyButtonStyle color="green" onClick={startPing} data-testid="button-start-ping">
                {pingResults.some(r => r.status !== "pending") ? "Reintentar" : "Iniciar Ping"}
              </MyButtonStyle>
            )}
            <MyButtonStyle 
              color="red" 
              onClick={onClose}
              disabled={isPinging}
              data-testid="button-ping-window-cancel"
            >
              {isPinging ? "Procesando..." : "Cancelar"}
            </MyButtonStyle>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgrodataContentProps {
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  onPing: (records: Record<string, any>[]) => void;
}

function AgrodataContent({
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  onPing,
}: AgrodataContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

  const handleClearFilters = () => {
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  const filteredData = useMemo(() => {
    let result = tableData;

    textFilters.forEach((filter) => {
      if (filter.value) {
        result = result.filter((row) => {
          const val = row[filter.field];
          return val && String(val).toLowerCase().includes(filter.value.toLowerCase());
        });
      }
    });

    booleanFilters.forEach((filter) => {
      if (filter.value !== "all") {
        result = result.filter((row) => {
          if (filter.field === "estado") {
            const isActive = row[filter.field] === "activo";
            return filter.value === "true" ? isActive : !isActive;
          }
          const val = row[filter.field];
          return filter.value === "true" ? val === true : val === false;
        });
      }
    });

    return result;
  }, [tableData, textFilters, booleanFilters]);

  const handlePingClick = () => {
    onPing(filteredData);
  };

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFilter
          onClearFilters={handleClearFilters}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-cyan-500/20">
        <MyGrid
          tableId="agrodata-equipos"
          tableName="agrodata"
          columns={agrodataColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          showCalcular={false}
          showExcel={false}
          showGraficas={false}
          showReportes={false}
          showPing={true}
          onPing={handlePingClick}
        />
      </div>
    </div>
  );
}

interface AgrodataProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Agrodata({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: AgrodataProps) {
  const { toast } = useToast();
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>([
    ...DEFAULT_BOOLEAN_FILTERS,
    { field: "estado", label: "Estado", value: "all" },
  ]);
  const [pingWindowOpen, setPingWindowOpen] = useState(false);
  const [pingRecords, setPingRecords] = useState<Record<string, any>[]>([]);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro ${row.nombre || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/agrodata/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/agrodata"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const handlePing = (records: Record<string, any>[]) => {
    if (records.length === 0) {
      toast({ title: "Sin registros", description: "No hay registros para hacer ping" });
      return;
    }
    setPingRecords(records);
    setPingWindowOpen(true);
  };

  const handlePingComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/agrodata"] });
  };

  const parametrosOptions = useMultipleParametrosOptions(["equipo", "plan"], {});

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "nombre", label: "Nombre", value: "", options: [] },
    { field: "equipo", label: "Equipo", value: "", options: [] },
    { field: "plan", label: "Plan", value: "", options: [] },
    { field: "ip", label: "IP", value: "" },
    { field: "descripcion", label: "Descripción", value: "" },
  ]);

  const { data: agrodataNombres = [] } = useQuery<{ nombre: string }[]>({
    queryKey: ["/api/agrodata/nombres"],
    staleTime: 60000,
  });

  const nombreOptions = useMemo(() => {
    const unique = new Set(agrodataNombres.map(r => r.nombre).filter(Boolean));
    return Array.from(unique).sort();
  }, [agrodataNombres]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "nombre", label: "Nombre", value: textFilters.find(f => f.field === "nombre")?.value || "", options: nombreOptions },
    { field: "equipo", label: "Equipo", value: textFilters.find(f => f.field === "equipo")?.value || "", options: parametrosOptions.equipo || [] },
    { field: "plan", label: "Plan", value: textFilters.find(f => f.field === "plan")?.value || "", options: parametrosOptions.plan || [] },
    { field: "ip", label: "IP", value: textFilters.find(f => f.field === "ip")?.value || "" },
    { field: "descripcion", label: "Descripción", value: textFilters.find(f => f.field === "descripcion")?.value || "" },
  ], [parametrosOptions, textFilters, nombreOptions]);

  const handleBooleanFilterChange = (field: string, value: "all" | "true" | "false") => {
    setBooleanFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const handleTextFilterChange = (field: string, value: string) => {
    setTextFilters((prev) =>
      prev.map((f) => (f.field === field ? { ...f, value } : f))
    );
  };

  const queryParams: Record<string, string> = {};
  
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
    }
  }
  
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      if (filter.field === "estado") {
        queryParams[filter.field] = filter.value === "true" ? "activo" : "suspendido";
      } else {
        queryParams[filter.field] = filter.value;
      }
    }
  }

  return (
    <>
      <MyWindow
        id="agrodata"
        title="Agrodata"
        icon={<Database className="h-4 w-4 text-cyan-600" />}
        initialPosition={{ x: 200, y: 140 }}
        initialSize={{ width: 1100, height: 600 }}
        minSize={{ width: 700, height: 400 }}
        maxSize={{ width: 1500, height: 900 }}
        onClose={onBack}
        onFocus={onFocus}
        zIndex={zIndex}
        minimizedIndex={minimizedIndex}
        borderColor="border-cyan-500/40"
        autoLoadTable={true}
        queryParams={queryParams}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        isStandalone={isStandalone}
        popoutUrl="/standalone/agrodata"
      >
        <AgrodataContent
          booleanFilters={booleanFilters}
          onBooleanFilterChange={handleBooleanFilterChange}
          textFilters={textFiltersWithOptions}
          onTextFilterChange={handleTextFilterChange}
          onPing={handlePing}
        />
      </MyWindow>

      <PingWindow
        isOpen={pingWindowOpen}
        onClose={() => setPingWindowOpen(false)}
        records={pingRecords}
        onPingComplete={handlePingComplete}
      />
    </>
  );
}
