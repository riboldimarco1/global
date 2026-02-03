import { useState, useMemo, useEffect, useCallback } from "react";
import { Database, Wifi, X, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen && records.length > 0) {
      setPingResults(records.map(r => ({
        id: r.id,
        nombre: r.nombre || r.ip || "Sin nombre",
        ip: r.ip,
        status: "pending",
      })));
      setCurrentIndex(0);
      setIsPinging(true);
    }
  }, [isOpen, records]);

  const doPing = useCallback(async (index: number) => {
    if (index >= pingResults.length) {
      setIsPinging(false);
      onPingComplete();
      return;
    }

    const record = pingResults[index];
    
    setPingResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: "pinging" } : r
    ));

    try {
      const response = await fetch(`/api/agrodata/ping/${record.id}`, {
        method: "POST",
      });
      
      if (response.ok) {
        const result = await response.json();
        setPingResults(prev => prev.map((r, i) => 
          i === index ? { 
            ...r, 
            status: result.success ? "success" : "error",
            latencia: result.latencia,
            mac: result.mac,
            estado: result.estado,
          } : r
        ));
      } else {
        setPingResults(prev => prev.map((r, i) => 
          i === index ? { ...r, status: "error" } : r
        ));
      }
    } catch {
      setPingResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: "error" } : r
      ));
    }

    setCurrentIndex(index + 1);
  }, [pingResults, onPingComplete]);

  useEffect(() => {
    if (isPinging && currentIndex < pingResults.length) {
      const timer = setTimeout(() => {
        doPing(currentIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPinging, currentIndex, pingResults.length, doPing]);

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
            <Wifi className="h-4 w-4 text-teal-600" />
            <span className="font-medium">Ping a registros</span>
            <span className="text-xs text-muted-foreground">
              ({pingResults.filter(r => r.status === "success" || r.status === "error").length}/{pingResults.length})
            </span>
          </div>
          {!isPinging && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="button-ping-window-close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
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

        <div className="flex justify-end gap-2 p-3 border-t">
          <MyButtonStyle 
            color="gray" 
            onClick={onClose}
            disabled={isPinging}
            data-testid="button-ping-window-footer-close"
          >
            {isPinging ? "Procesando..." : "Cerrar"}
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
