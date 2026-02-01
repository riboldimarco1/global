import { useState, useMemo } from "react";
import { ArrowLeftRight, Send, Split, FileText, Printer, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RowHandler = (row: Record<string, any>) => void;

const transferenciasColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "beneficiario", label: "Beneficiario", defaultWidth: 150, type: "text" },
  { key: "monto", label: "Monto", defaultWidth: 90, align: "right", type: "number" },
  { key: "deuda", label: "Deuda", defaultWidth: 80, align: "right", type: "number" },
  { key: "resta", label: "Resta", defaultWidth: 80, align: "right", type: "number" },
  { key: "descuento", label: "Descuento", defaultWidth: 80, align: "right", type: "number" },
  { key: "banco", label: "Banco", defaultWidth: 100 },
  { key: "personal", label: "Personal", defaultWidth: 100, type: "text" },
  { key: "proveedor", label: "Proveedor", defaultWidth: 100, type: "text" },
  { key: "actividad", label: "Actividad", defaultWidth: 120 },
  { key: "insumo", label: "Insumo", defaultWidth: 100 },
  { key: "transferido", label: "Transf", defaultWidth: 55, type: "boolean" },
  { key: "contabilizado", label: "Cont", defaultWidth: 50, type: "boolean" },
  { key: "ejecutada", label: "Ejec", defaultWidth: 50, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 45, type: "boolean" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "transferido", label: "Transferido", value: "all" },
  { field: "contabilizado", label: "Contabilizado", value: "all" },
  { field: "ejecutada", label: "Ejecutada", value: "all" },
];

interface TransferenciasContentProps {
  unidadFilter: string;
  onUnidadChange: (unidad: string) => void;
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  bancoFilter: string;
}

function TransferenciasContent({
  unidadFilter,
  onUnidadChange,
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  bancoFilter,
}: TransferenciasContentProps) {
  const { toast } = useToast();
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [isEnviando, setIsEnviando] = useState(false);
  const [showEnviarDialog, setShowEnviarDialog] = useState(false);
  const [showBancoAlert, setShowBancoAlert] = useState(false);
  const [enviarFecha, setEnviarFecha] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yy = String(today.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  });
  const [enviarReferencia, setEnviarReferencia] = useState<number>(0);
  const [enviarTipo, setEnviarTipo] = useState<"uno" | "todos" | null>(null);

  const handleClearFilters = () => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  };

  const handleEnviarClick = () => {
    if (!bancoFilter || bancoFilter === "all" || bancoFilter === "") {
      setShowBancoAlert(true);
      return;
    }
    setShowEnviarDialog(true);
  };

  const handleEnviarConfirm = (tipo: "uno" | "todos") => {
    setEnviarTipo(tipo);
    setShowEnviarDialog(false);
    toast({ 
      title: tipo === "uno" ? "Un solo proveedor" : "Todos los proveedores", 
      description: `Fecha: ${enviarFecha}, Referencia: ${enviarReferencia}` 
    });
  };

  const filteredData = useMemo(() => {
    let result = tableData;

    if (descripcionFilter) {
      const search = descripcionFilter.toLowerCase();
      result = result.filter((row) =>
        row.descripcion?.toLowerCase().includes(search) ||
        row.beneficiario?.toLowerCase().includes(search)
      );
    }

    booleanFilters.forEach((filter) => {
      if (filter.value !== "all") {
        const boolValue = filter.value === "true";
        result = result.filter((row) => {
          const val = row[filter.field];
          if (typeof val === "boolean") return val === boolValue;
          if (typeof val === "string") return (val === "t") === boolValue;
          return true;
        });
      }
    });

    textFilters.forEach((filter) => {
      if (filter.value) {
        result = result.filter((row) => row[filter.field] === filter.value);
      }
    });

    // Filtrado cliente por fechas (click en celdas)
    if (clientDateFilter.start || clientDateFilter.end) {
      result = result.filter((row) => {
        const rowDate = row.fecha;
        if (!rowDate) return false;
        if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
        if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
        return true;
      });
    }

    return result;
  }, [tableData, descripcionFilter, booleanFilters, textFilters, clientDateFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="transferencias-filtro-unidad"
        />
        <MyFilter
          onClearFilters={handleClearFilters}
          onDateChange={onDateChange}
          dateFilter={dateFilter}
          descripcion={descripcionFilter}
          onDescripcionChange={onDescripcionChange}
          booleanFilters={booleanFilters}
          onBooleanFilterChange={onBooleanFilterChange}
          textFilters={textFilters}
          onTextFilterChange={onTextFilterChange}
          unidadFilter={unidadFilter}
          selectedRecordDate={selectedRowDate}
          clientDateFilter={clientDateFilter}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-rose-500/5 to-rose-600/10 border-rose-500/20">
        <MyGrid
          tableId="transferencias-movimientos"
          tableName="transferencias"
          columns={transferenciasColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onDateStartClick={(date) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: date }))}
          onDateEndClick={(date) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: date }))}
          extraButtons={
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => {}} disabled={isEnviando} data-testid="btn-enviar-bancos-admin">
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {isEnviando ? "Enviando..." : "Enviar"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar a bancos y administración</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => {}} data-testid="btn-repartir">
                    <Split className="h-3.5 w-3.5 mr-1" />
                    Repartir
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Repartir monto entre personas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleEnviarClick} data-testid="btn-generar-texto">
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Texto
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generar texto para copiar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => {}} data-testid="btn-imprimir-recibos">
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Recibos
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimir recibos individuales</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => {}} data-testid="btn-imprimir-lista">
                    <List className="h-3.5 w-3.5 mr-1" />
                    Lista
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Imprimir lista de transferencias</TooltipContent>
              </Tooltip>
            </div>
          }
        />
      </div>

      <Dialog open={showEnviarDialog} onOpenChange={setShowEnviarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Transferencias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enviar-fecha">Fecha de la operación</Label>
              <Input
                id="enviar-fecha"
                value={enviarFecha}
                onChange={(e) => setEnviarFecha(e.target.value)}
                placeholder="dd/mm/aa"
                data-testid="input-enviar-fecha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enviar-referencia">Referencia</Label>
              <Input
                id="enviar-referencia"
                type="number"
                value={enviarReferencia}
                onChange={(e) => setEnviarReferencia(parseInt(e.target.value) || 0)}
                placeholder="Número de referencia"
                data-testid="input-enviar-referencia"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button 
              variant="outline" 
              onClick={() => handleEnviarConfirm("uno")}
              data-testid="btn-enviar-uno"
            >
              Un solo proveedor
            </Button>
            <Button 
              onClick={() => handleEnviarConfirm("todos")}
              data-testid="btn-enviar-todos"
            >
              Todos los proveedores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBancoAlert} onOpenChange={setShowBancoAlert}>
        <AlertDialogContent className="top-[30%] translate-y-0 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Advertencia</AlertDialogTitle>
            <AlertDialogDescription>
              Primero seleccione un banco
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowBancoAlert(false)}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface TransferenciasProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Transferencias({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: TransferenciasProps) {
  const { toast } = useToast();
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("transferencias", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.numero || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/transferencias/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/transferencias"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["banco", "actividad"], { unidad: unidadFilter });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "banco", label: "Banco", value: "", options: [] },
    { field: "actividad", label: "Actividad", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "banco", label: "Banco", value: textFilters.find(f => f.field === "banco")?.value || "", options: parametrosOptions.banco || [] },
    { field: "actividad", label: "Actividad", value: textFilters.find(f => f.field === "actividad")?.value || "", options: parametrosOptions.actividad || [] },
  ], [parametrosOptions, textFilters]);

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
  if (unidadFilter !== "all") {
    queryParams.unidad = unidadFilter;
  }
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }

  return (
    <MyWindow
      id="transferencias"
      title="Transferencias"
      icon={<ArrowLeftRight className="h-4 w-4 text-rose-600" />}
      initialPosition={{ x: 240, y: 180 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-rose-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/transferencias"
    >
      <TransferenciasContent
        unidadFilter={unidadFilter}
        onUnidadChange={setUnidadFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFiltersWithOptions}
        onTextFilterChange={handleTextFilterChange}
        bancoFilter={textFilters.find(f => f.field === "banco")?.value || ""}
      />
    </MyWindow>
  );
}
