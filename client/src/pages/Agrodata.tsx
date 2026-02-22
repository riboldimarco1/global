import { useState, useMemo, useEffect, useCallback, useRef, MutableRefObject } from "react";
import { Database, Wifi, X, CheckCircle, XCircle, Loader2, Download, WifiOff, Settings } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import AgrodataParametros from "@/components/AgrodataParametros";

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
  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;
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
        console.log("[PING-WS] Mensaje recibido:", message);
        
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
          onPingCompleteRef.current();
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
  }, [isOpen, sessionId]);

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

  const cancelPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "ping_cancel",
        sessionId,
      }));
    }
    setIsPinging(false);
    setPingResults(prev => prev.map(r => 
      r.status === "pinging" ? { ...r, status: "pending" } : r
    ));
    toast({ title: "Cancelado", description: "Ping cancelado" });
  }, [sessionId, toast]);

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
              <Wifi className="h-4 w-4 text-green-800 dark:text-green-300" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-800 dark:text-red-300" />
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
                  {result.status === "pinging" && <Loader2 className="h-4 w-4 animate-spin text-yellow-800 dark:text-yellow-200" />}
                  {result.status === "success" && <CheckCircle className="h-4 w-4 text-green-800 dark:text-green-300" />}
                  {result.status === "error" && <XCircle className="h-4 w-4 text-red-800 dark:text-red-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{result.nombre}</div>
                  <div className="text-xs text-muted-foreground">{result.ip || "Sin IP"}</div>
                </div>
                <div className="text-right text-xs">
                  {result.status === "success" && (
                    <div className="text-green-800 dark:text-green-300">{result.latencia}</div>
                  )}
                  {result.status === "error" && (
                    <div className="text-red-800 dark:text-red-300">{result.latencia || "timeout"}</div>
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
          <div className="flex gap-2">
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
              onClick={isPinging ? cancelPing : onClose}
              data-testid="button-ping-window-cancel"
            >
              Cancelar
            </MyButtonStyle>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NetworkStatusWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

function NetworkStatusWindow({ isOpen, onClose }: NetworkStatusWindowProps) {
  const { data: agrodataResponse, isLoading } = useQuery<{ data: Record<string, any>[]; total: number; hasMore: boolean }>({
    queryKey: ["/api/agrodata"],
    enabled: isOpen,
  });

  const stats = useMemo(() => {
    const records = agrodataResponse?.data || [];
    const total = records.length;
    const activos = records.filter(r => r.estado === "activo").length;
    const cortados = records.filter(r => r.estado === "cortado").length;
    const otros = total - activos - cortados;
    
    const byEquipo: Record<string, { activos: number; cortados: number }> = {};
    records.forEach(r => {
      const equipo = r.equipo || "Sin equipo";
      if (!byEquipo[equipo]) byEquipo[equipo] = { activos: 0, cortados: 0 };
      if (r.estado === "activo") byEquipo[equipo].activos++;
      else byEquipo[equipo].cortados++;
    });

    const byPlan: Record<string, { activos: number; cortados: number }> = {};
    records.forEach(r => {
      const plan = r.plan || "Sin plan";
      if (!byPlan[plan]) byPlan[plan] = { activos: 0, cortados: 0 };
      if (r.estado === "activo") byPlan[plan].activos++;
      else byPlan[plan].cortados++;
    });

    return { total, activos, cortados, otros, byEquipo, byPlan };
  }, [agrodataResponse]);

  if (!isOpen) return null;

  const activosPct = stats.total > 0 ? (stats.activos / stats.total) * 100 : 0;
  const cortadosPct = stats.total > 0 ? (stats.cortados / stats.total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-background border rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b bg-purple-500/10">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-800 dark:text-purple-300" />
            <span className="font-medium text-sm">Estado de la Red</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
              <div className="text-3xl font-bold text-blue-800 dark:text-blue-300">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Equipos</div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-3xl font-bold text-green-800 dark:text-green-300">{stats.activos}</div>
              <div className="text-sm text-muted-foreground">Activos</div>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-3xl font-bold text-red-800 dark:text-red-300">{stats.cortados}</div>
              <div className="text-sm text-muted-foreground">Cortados</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="text-sm font-medium mb-2">Estado General</div>
            <div className="h-6 rounded-full overflow-hidden bg-muted flex">
              <div 
                className="bg-green-500 h-full transition-all" 
                style={{ width: `${activosPct}%` }}
                title={`Activos: ${stats.activos} (${activosPct.toFixed(1)}%)`}
              />
              <div 
                className="bg-red-500 h-full transition-all" 
                style={{ width: `${cortadosPct}%` }}
                title={`Cortados: ${stats.cortados} (${cortadosPct.toFixed(1)}%)`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Activos: {activosPct.toFixed(1)}%</span>
              <span>Cortados: {cortadosPct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="text-sm font-medium mb-2">Por Equipo</div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {Object.entries(stats.byEquipo).sort((a, b) => (b[1].activos + b[1].cortados) - (a[1].activos + a[1].cortados)).map(([equipo, counts]) => {
                  const total = counts.activos + counts.cortados;
                  const pctActivo = total > 0 ? (counts.activos / total) * 100 : 0;
                  return (
                    <div key={equipo} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="truncate">{equipo}</span>
                        <span className="text-green-800 dark:text-green-300">{counts.activos}</span>
                        <span className="text-red-800 dark:text-red-300">{counts.cortados}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-red-200 dark:bg-red-900/30">
                        <div className="bg-green-500 h-full" style={{ width: `${pctActivo}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="text-sm font-medium mb-2">Por Plan</div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {Object.entries(stats.byPlan).sort((a, b) => (b[1].activos + b[1].cortados) - (a[1].activos + a[1].cortados)).map(([plan, counts]) => {
                  const total = counts.activos + counts.cortados;
                  const pctActivo = total > 0 ? (counts.activos / total) * 100 : 0;
                  return (
                    <div key={plan} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="truncate">{plan}</span>
                        <span className="text-green-800 dark:text-green-300">{counts.activos}</span>
                        <span className="text-red-800 dark:text-red-300">{counts.cortados}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-red-200 dark:bg-red-900/30">
                        <div className="bg-green-500 h-full" style={{ width: `${pctActivo}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-3 border-t">
          <MyButtonStyle color="gray" onClick={onClose} data-testid="button-network-status-close">
            Cerrar
          </MyButtonStyle>
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
  onPingOne: (record: Record<string, any>) => void;
  onNetworkStatus: () => void;
  refreshRef?: MutableRefObject<(() => void) | null>;
}

function AgrodataContent({
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  onPing,
  onPingOne,
  onNetworkStatus,
  refreshRef,
}: AgrodataContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { toast } = useToast();

  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = onRefresh;
    }
    return () => {
      if (refreshRef) {
        refreshRef.current = null;
      }
    };
  }, [refreshRef, onRefresh]);

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

  const selectedRow = useMemo(() => {
    return tableData.find(r => r.id === selectedRowId);
  }, [tableData, selectedRowId]);

  const handleOpenInBrowser = () => {
    if (!selectedRow || !selectedRow.ip) {
      toast({ title: "Error", description: "Selecciona un registro con IP válida", variant: "destructive" });
      return;
    }
    window.open(`http://${selectedRow.ip}`, "_blank");
  };

  const handlePingOne = () => {
    if (!selectedRow || !selectedRow.ip) {
      toast({ title: "Error", description: "Selecciona un registro con IP válida", variant: "destructive" });
      return;
    }
    onPingOne(selectedRow);
  };

  return (
    <div className="flex flex-col h-full min-h-0 flex-1">
      <div className="flex-1 overflow-hidden p-2 border rounded-md bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border-cyan-500/20">
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
          onRecordSaved={(record) => { setSelectedRowId(record.id); }}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          showCalcular={false}
          showExcel={false}
          showGraficas={false}
          showReportes={false}
          showPing={true}
          onPing={handlePingClick}
          showOpenInBrowser={true}
          onOpenInBrowser={handleOpenInBrowser}
          showPingOne={true}
          onPingOne={handlePingOne}
          showNetworkStatus={true}
          onNetworkStatus={onNetworkStatus}
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
  const { isAlegre, rainbowEnabled } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>([
    ...DEFAULT_BOOLEAN_FILTERS,
    { field: "estado", label: "Estado", value: "all" },
  ]);
  const [pingWindowOpen, setPingWindowOpen] = useState(false);
  const [pingRecords, setPingRecords] = useState<Record<string, any>[]>([]);
  const [networkStatusOpen, setNetworkStatusOpen] = useState(false);
  const refreshRef = useRef<(() => void) | null>(null);

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

  const handlePingOne = (record: Record<string, any>) => {
    if (!record.ip) {
      toast({ title: "Error", description: "El registro no tiene IP", variant: "destructive" });
      return;
    }
    setPingRecords([record]);
    setPingWindowOpen(true);
  };

  const handlePingComplete = () => {
    if (refreshRef.current) {
      refreshRef.current();
    }
    queryClient.invalidateQueries({ queryKey: ["/api/agrodata"] });
  };

  const handleNetworkStatus = () => {
    setNetworkStatusOpen(true);
  };

  const [mainTab, setMainTab] = useState<"total" | "parametros">("total");

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
        icon={<Database className="h-4 w-4 text-cyan-800 dark:text-cyan-300" />}
        tutorialId="agrodata"
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
        <div className="flex flex-col h-full min-h-0 flex-1 p-3">
          {mainTab !== "parametros" && (
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <MyFilter
                onClearFilters={() => {
                  setBooleanFilters([
                    ...DEFAULT_BOOLEAN_FILTERS,
                    { field: "estado", label: "Estado", value: "all" },
                  ]);
                  setTextFilters([
                    { field: "nombre", label: "Nombre", value: "", options: [] },
                    { field: "equipo", label: "Equipo", value: "", options: [] },
                    { field: "plan", label: "Plan", value: "", options: [] },
                    { field: "ip", label: "IP", value: "" },
                    { field: "descripcion", label: "Descripción", value: "" },
                  ]);
                }}
                booleanFilters={booleanFilters}
                onBooleanFilterChange={handleBooleanFilterChange}
                textFilters={textFiltersWithOptions}
                onTextFilterChange={handleTextFilterChange}
              />
            </div>
          )}

          <div className="flex items-center gap-1 mb-2">
            {([
              { id: "total" as const, label: "Total", icon: <Database className="h-3.5 w-3.5" />, color: "red" as const },
              { id: "parametros" as const, label: "Parámetros", icon: <Settings className="h-3.5 w-3.5" />, color: "orange" as const },
            ]).map((tab) => {
              const isActive = mainTab === tab.id;
              const effectiveColor = rainbowEnabled ? tab.color : ("slate" as const);
              const cls = tabColorClasses[effectiveColor];
              return (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all animate-flash cursor-pointer select-none ${
                    isActive
                      ? `${cls.activeBg} ${cls.border} ${cls.text} ring-2 ring-white scale-105 ${cls.shadow}`
                      : `${cls.bg} ${cls.border} ${cls.text}`
                  }`}
                  data-testid={`tab-agrodata-${tab.id}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mainTab === "total" ? (
              <AgrodataContent
                booleanFilters={booleanFilters}
                onBooleanFilterChange={handleBooleanFilterChange}
                textFilters={textFiltersWithOptions}
                onTextFilterChange={handleTextFilterChange}
                onPing={handlePing}
                onPingOne={handlePingOne}
                onNetworkStatus={handleNetworkStatus}
                refreshRef={refreshRef}
              />
            ) : (
              <AgrodataParametros />
            )}
          </div>
        </div>
      </MyWindow>

      <PingWindow
        isOpen={pingWindowOpen}
        onClose={() => setPingWindowOpen(false)}
        records={pingRecords}
        onPingComplete={handlePingComplete}
      />

      <NetworkStatusWindow
        isOpen={networkStatusOpen}
        onClose={() => setNetworkStatusOpen(false)}
      />
    </>
  );
}
