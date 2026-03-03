import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Redo2, RefreshCw, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MyWindow from "./MyWindow";

interface AuditEntry {
  id: string;
  timestamp: string;
  tabla: string;
  operacion: string;
  registro_id: string;
  datos_anteriores: any;
  datos_nuevos: any;
  usuario: string;
  deshecho: boolean;
}

interface HistorialCRUDProps {
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

const operacionLabels: Record<string, string> = {
  insert: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

const operacionColors: Record<string, string> = {
  insert: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getDescripcion(entry: AuditEntry): string {
  const data = entry.datos_nuevos || entry.datos_anteriores;
  if (!data) return `ID: ${entry.registro_id}`;
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  const desc = parsed.descripcion || parsed.nombre || parsed.banco || parsed.suministro || parsed.concepto || "";
  if (desc) return String(desc).substring(0, 50);
  return `ID: ${entry.registro_id}`;
}

export default function HistorialCRUD({ onClose, onFocus, zIndex }: HistorialCRUDProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/herramientas/historial-crud");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const handleDeshacer = async (entry: AuditEntry) => {
    setActionId(entry.id);
    try {
      await apiRequest("POST", `/api/herramientas/deshacer/${entry.id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/${entry.tabla}`] });
      fetchHistorial();
    } catch {
    } finally {
      setActionId(null);
    }
  };

  const handleRehacer = async (entry: AuditEntry) => {
    setActionId(entry.id);
    try {
      await apiRequest("POST", `/api/herramientas/rehacer/${entry.id}`);
      queryClient.invalidateQueries({ queryKey: [`/api/${entry.tabla}`] });
      fetchHistorial();
    } catch {
    } finally {
      setActionId(null);
    }
  };

  return (
    <MyWindow
      id="historial-crud"
      title="Historial de Operaciones"
      icon={<Undo2 className="h-4 w-4" />}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      initialSize={{ width: 700, height: 500 }}
      minSize={{ width: 500, height: 300 }}
      initialPosition={{ x: 250, y: 80 }}
    >
      <div className="flex flex-col h-full" data-testid="historial-crud-container">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {entries.length} operación{entries.length !== 1 ? "es" : ""} reciente{entries.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={fetchHistorial}
            disabled={loading}
            data-testid="button-refresh-historial"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No hay operaciones recientes
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Fecha/Hora</th>
                  <th className="text-left px-2 py-1.5 font-medium">Tabla</th>
                  <th className="text-left px-2 py-1.5 font-medium">Operación</th>
                  <th className="text-left px-2 py-1.5 font-medium">Descripción</th>
                  <th className="text-left px-2 py-1.5 font-medium">Usuario</th>
                  <th className="text-center px-2 py-1.5 font-medium w-24">Acción</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-border/50 hover:bg-muted/30 ${entry.deshecho ? "opacity-50" : ""}`}
                    data-testid={`row-historial-${entry.id}`}
                  >
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                    <td className="px-2 py-1.5 capitalize">{entry.tabla}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${operacionColors[entry.operacion] || ""}`}>
                        {operacionLabels[entry.operacion] || entry.operacion}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 max-w-[200px] truncate" title={getDescripcion(entry)}>
                      {getDescripcion(entry)}
                    </td>
                    <td className="px-2 py-1.5">{entry.usuario || "-"}</td>
                    <td className="px-2 py-1.5 text-center">
                      {entry.deshecho ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[10px] gap-1 px-2"
                          onClick={() => handleRehacer(entry)}
                          disabled={actionId === entry.id}
                          data-testid={`button-rehacer-${entry.id}`}
                        >
                          {actionId === entry.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Redo2 className="h-3 w-3" />
                          )}
                          Rehacer
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[10px] gap-1 px-2"
                          onClick={() => handleDeshacer(entry)}
                          disabled={actionId === entry.id}
                          data-testid={`button-deshacer-${entry.id}`}
                        >
                          {actionId === entry.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Undo2 className="h-3 w-3" />
                          )}
                          Deshacer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MyWindow>
  );
}