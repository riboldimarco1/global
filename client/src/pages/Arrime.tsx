import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, Upload, FileSpreadsheet, Loader2, X } from "lucide-react";
import { MyWindow, MyFilter, MyGrid, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { type ReportFilters } from "@/components/MyFilter";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

const arrimeColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "central", label: "Central", defaultWidth: 100 },
  { key: "feriado", label: "Fe", defaultWidth: 40, type: "boolean" },
  { key: "ruta", label: "Ruta", defaultWidth: 100 },
  { key: "flete", label: "Flete", defaultWidth: 70, align: "right", type: "number" },
  { key: "fletechofer", label: "Flete chofer", defaultWidth: 90, align: "right", type: "number" },
  { key: "remesa", label: "Remesa", defaultWidth: 80, align: "right", type: "number" },
  { key: "ticket", label: "Ticket", defaultWidth: 80, align: "right", type: "number" },
  { key: "placa", label: "Placa", defaultWidth: 80 },
  { key: "chofer", label: "Chofer", defaultWidth: 120 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 120 },
  { key: "cantidad", label: "Peso", defaultWidth: 70, align: "right", type: "number" },
  { key: "monto", label: "Monto", defaultWidth: 80, align: "right", type: "number" },
  { key: "montochofer", label: "Monto chofer", defaultWidth: 95, align: "right", type: "number" },
  { key: "cancelado", label: "Ca", defaultWidth: 40, type: "boolean" },
  { key: "pagochofer", label: "Pa", defaultWidth: 40, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 40, type: "boolean" },
  { key: "grado", label: "Grado", defaultWidth: 60, align: "right", type: "number" },
  { key: "brix", label: "Brix", defaultWidth: 55, align: "right", type: "number" },
  { key: "pol", label: "Pol", defaultWidth: 55, align: "right", type: "number" },
  { key: "torta", label: "Torta", defaultWidth: 55, align: "right", type: "number" },
  { key: "tablon", label: "Tablon", defaultWidth: 70 },
  { key: "finca", label: "Finca", defaultWidth: 120 },
  { key: "nucleo", label: "Nucleo", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 180 },
  { key: "azucar", label: "Azucar", defaultWidth: 65, align: "right", type: "number" },
  { key: "transporte", label: "Transporte", defaultWidth: 80, align: "right", type: "number" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "cancelado", label: "Cancelado", value: "all" },
  { field: "feriado", label: "Feriado", value: "all" },
  { field: "pagochofer", label: "Pago Chofer", value: "all" },
];

interface ArrimeContentProps {
  dateFilter: DateRange;
  onDateChange: (range: DateRange) => void;
  descripcionFilter: string;
  onDescripcionChange: (value: string) => void;
  booleanFilters: BooleanFilter[];
  onBooleanFilterChange: (field: string, value: "all" | "true" | "false") => void;
  textFilters: TextFilter[];
  onTextFilterChange: (field: string, value: string) => void;
  onOpenReport?: (filters: ReportFilters) => void;
  centralFilter: string;
}

function ArrimeContent({
  dateFilter,
  onDateChange,
  descripcionFilter,
  onDescripcionChange,
  booleanFilters,
  onBooleanFilterChange,
  textFilters,
  onTextFilterChange,
  onOpenReport,
  centralFilter,
}: ArrimeContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();
  const { showPop } = useMyPop();
  const { toast } = useToast();

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

  const filteredData = useMemo(() => {
    let result = tableData;

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
  }, [tableData, clientDateFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center gap-2 flex-wrap">
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
          selectedRecordDate={selectedRowDate}
          clientDateFilter={clientDateFilter}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-2 p-2 border rounded-md bg-gradient-to-br from-blue-500/5 to-indigo-500/10 border-blue-500/20">
        <MyGrid
          tableId="arrime-movimientos"
          tableName="arrime"
          columns={arrimeColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          newRecordDefaults={centralFilter && centralFilter !== "all" ? { central: centralFilter } : undefined}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          middleButtons={
            <Tooltip>
              <TooltipTrigger asChild>
                <MyButtonStyle
                  color="cyan"
                  className="text-xs gap-1"
                  onClick={() => {
                    if (!centralFilter) {
                      showPop({ title: "Cargar Arrime", message: "Antes escoja un central" });
                    } else {
                      setImportDialogOpen(true);
                    }
                  }}
                  data-testid="button-cargar-arrime"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Cargar Arrime
                </MyButtonStyle>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-cyan-600 text-white text-xs">
                Cargar datos de arrime
              </TooltipContent>
            </Tooltip>
          }
          onReportes={() => onOpenReport?.({
            sourceModule: "arrime",
            dateRange: dateFilter,
            textFilters: Object.fromEntries(textFilters.filter(f => f.value).map(f => [f.field, f.value])),
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>

      <ArrimeImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        central={centralFilter}
        onImportComplete={(count) => {
          toast({ title: "Importación completada", description: `Se importaron ${count} registros` });
          onRefresh();
          queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
        }}
      />
    </div>
  );
}

interface ArrimeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  central: string;
  onImportComplete: (count: number) => void;
}

function ArrimeImportDialog({ open, onOpenChange, central, onImportComplete }: ArrimeImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showPop } = useMyPop();
  const { toast } = useToast();

  const arrimeFieldMap: Record<string, string> = {
    fecha: "fecha",
    dia: "fecha",
    feriado: "feriado",
    nucleo: "nucleo",
    "cod.": "nucleo",
    "cod": "nucleo",
    azucar: "azucar",
    "tonazucar": "azucar",
    "tonazúcar": "azucar",
    finca: "finca",
    "nombrehda": "finca",
    ruta: "ruta",
    chofer: "chofer",
    fletechofer: "fletechofer",
    fletechofe: "fletechofer",
    flete: "flete",
    remesa: "remesa",
    ticket: "ticket",
    tiket: "ticket",
    montochofer: "montochofer",
    montochofe: "montochofer",
    monto: "monto",
    cancelado: "cancelado",
    proveedor: "proveedor",
    "nombredelfrente": "proveedor",
    placa: "placa",
    "camion": "placa",
    "camión": "placa",
    cantidad: "cantidad",
    peso: "cantidad",
    "netoajus.": "cantidad",
    "netoajus": "cantidad",
    "netoajustado": "cantidad",
    utility: "utility",
    descripcion: "descripcion",
    descripcio: "descripcion",
    pagochofer: "pagochofer",
    brix: "brix",
    pol: "pol",
    torta: "torta",
    "%extr": "torta",
    "%extr.": "torta",
    "extr": "torta",
    tablon: "tablon",
    grado: "grado",
    rto: "grado",
    "rto.": "grado",
    propietario: "propietario",
    prop: "propietario",
    central: "central",
  };

  const normalizeHeader = (h: string): string => {
    return h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

      if (jsonData.length === 0) {
        showPop({ title: "Error", message: "El archivo no contiene datos" });
        setFile(null);
        return;
      }

      const rawHeaders = Object.keys(jsonData[0]);
      setHeaders(rawHeaders);
      setPreviewData(jsonData.slice(0, 10));
    } catch (err: any) {
      showPop({ title: "Error", message: `Error al leer el archivo: ${err.message}` });
      setFile(null);
    }
  };

  const formatDateValue = (val: any): string => {
    if (!val) return "";
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.slice(0, 10).split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    }
    if (typeof val === "number") {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${String(date.y).slice(-2)}`;
      }
    }
    return str;
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;
    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const allData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

      const mappedRecords: Record<string, any>[] = [];
      for (const row of allData) {
        const mapped: Record<string, any> = { central };
        for (const [rawKey, value] of Object.entries(row)) {
          const normalizedKey = normalizeHeader(rawKey);
          const dbField = arrimeFieldMap[normalizedKey];
          if (dbField && dbField !== "central") {
            if (dbField === "fecha") {
              mapped[dbField] = formatDateValue(value);
            } else if (["feriado", "cancelado", "utility", "pagochofer"].includes(dbField)) {
              const v = String(value).toLowerCase().trim();
              mapped[dbField] = v === "true" || v === "1" || v === "si" || v === "yes" || v === ".t.";
            } else if (["flete", "fletechofer", "remesa", "ticket", "montochofer", "monto", "cantidad", "grado", "brix", "pol", "torta", "azucar"].includes(dbField)) {
              const num = parseFloat(String(value).replace(/,/g, ""));
              mapped[dbField] = isNaN(num) ? "0" : String(num);
            } else {
              mapped[dbField] = String(value).trim();
            }
          }
        }
        if (mapped.fecha || mapped.cantidad || mapped.proveedor) {
          mappedRecords.push(mapped);
        }
      }

      if (mappedRecords.length === 0) {
        showPop({ title: "Sin datos", message: "No se encontraron registros válidos en el archivo" });
        setIsImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: mappedRecords.length });

      const batchSize = 50;
      let imported = 0;
      for (let i = 0; i < mappedRecords.length; i += batchSize) {
        const batch = mappedRecords.slice(i, i + batchSize);
        const response = await fetch("/api/arrime/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: batch }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Error al importar");
        }
        const result = await response.json();
        imported += result.imported || batch.length;
        setImportProgress({ current: imported, total: mappedRecords.length });
      }

      onImportComplete(imported);
      onOpenChange(false);
      setFile(null);
      setPreviewData([]);
      setHeaders([]);
    } catch (err: any) {
      showPop({ title: "Error de importación", message: err.message || "Error al importar datos" });
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    onOpenChange(false);
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-cyan-600" />
            Cargar Arrime desde Excel - Central: {central}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-arrime-file"
            />
            <MyButtonStyle
              color="cyan"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-select-arrime-file"
            >
              <Upload className="h-4 w-4 mr-1" />
              Seleccionar archivo
            </MyButtonStyle>
            {file && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                {file.name}
              </span>
            )}
          </div>

          {previewData.length > 0 && (
            <div className="border rounded-md overflow-auto max-h-[40vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-1.5 text-left font-medium border-b">#</th>
                    {headers.map((h) => (
                      <th key={h} className="p-1.5 text-left font-medium border-b whitespace-nowrap">
                        {h}
                        {arrimeFieldMap[normalizeHeader(h)] && (
                          <span className="ml-1 text-cyan-600 text-[10px]">
                            → {arrimeFieldMap[normalizeHeader(h)]}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-b hover-elevate">
                      <td className="p-1.5 text-muted-foreground">{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className="p-1.5 whitespace-nowrap">{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 text-xs text-muted-foreground bg-muted border-t">
                Vista previa de {previewData.length} de {file ? "todos los" : "0"} registros. Central "{central}" se asignará automáticamente.
              </div>
            </div>
          )}

          {isImporting && importProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando {importProgress.current} de {importProgress.total} registros...
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className="bg-cyan-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <MyButtonStyle color="gray" onClick={handleClose} disabled={isImporting} data-testid="button-cancel-arrime-import">
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </MyButtonStyle>
          <MyButtonStyle
            color="green"
            onClick={handleImport}
            disabled={!file || previewData.length === 0 || isImporting}
            loading={isImporting}
            data-testid="button-confirm-arrime-import"
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar {previewData.length > 0 ? `registros` : ""}
          </MyButtonStyle>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ArrimeProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

export default function Arrime({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: ArrimeProps) {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);

  const handleOpenReport = (filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({ title: "Editar", description: `Editando registro #${row.ticket || row.id}` });
  };

  const handleCopy = (row: Record<string, any>) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast({ title: "Copiado", description: "Datos copiados al portapapeles" });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/arrime/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/arrime"] });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar el registro" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión" });
    }
  };

  const parametrosOptions = useMultipleParametrosOptions(["tablon", "central", "chofer", "ruta", "finca"], {});

  const { data: distinctNucleo = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/nucleo"] });
  const { data: distinctPlaca = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/placa"] });
  const { data: distinctProveedor = [] } = useQuery<string[]>({ queryKey: ["/api/arrime/distinct/proveedor"] });

  const [textFilters, setTextFilters] = useState<TextFilter[]>([
    { field: "proveedor", label: "Proveedor", value: "", options: [] },
    { field: "placa", label: "Placa", value: "", options: [] },
    { field: "nucleo", label: "Nucleo", value: "", options: [] },
    { field: "tablon", label: "Tablon", value: "", options: [] },
    { field: "central", label: "Central", value: "", options: [] },
    { field: "chofer", label: "Chofer", value: "", options: [] },
    { field: "ruta", label: "Ruta", value: "", options: [] },
    { field: "finca", label: "Finca", value: "", options: [] },
  ]);

  const textFiltersWithOptions = useMemo(() => [
    { field: "proveedor", label: "Proveedor", value: textFilters.find(f => f.field === "proveedor")?.value || "", options: distinctProveedor },
    { field: "placa", label: "Placa", value: textFilters.find(f => f.field === "placa")?.value || "", options: distinctPlaca },
    { field: "nucleo", label: "Nucleo", value: textFilters.find(f => f.field === "nucleo")?.value || "", options: distinctNucleo },
    { field: "tablon", label: "Tablon", value: textFilters.find(f => f.field === "tablon")?.value || "", options: parametrosOptions.tablon || [] },
    { field: "central", label: "Central", value: textFilters.find(f => f.field === "central")?.value || "", options: parametrosOptions.central || [] },
    { field: "chofer", label: "Chofer", value: textFilters.find(f => f.field === "chofer")?.value || "", options: parametrosOptions.chofer || [] },
    { field: "ruta", label: "Ruta", value: textFilters.find(f => f.field === "ruta")?.value || "", options: parametrosOptions.ruta || [] },
    { field: "finca", label: "Finca", value: textFilters.find(f => f.field === "finca")?.value || "", options: parametrosOptions.finca || [] },
  ], [parametrosOptions, textFilters, distinctNucleo, distinctPlaca, distinctProveedor]);

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
  if (dateFilter.start) {
    queryParams.fechaInicio = dateFilter.start;
  }
  if (dateFilter.end) {
    queryParams.fechaFin = dateFilter.end;
  }
  if (descripcionFilter.trim()) {
    queryParams.descripcion = descripcionFilter.trim();
  }
  for (const filter of textFilters) {
    if (filter.value && filter.value.trim()) {
      queryParams[filter.field] = filter.value.trim();
    }
  }
  for (const filter of booleanFilters) {
    if (filter.value !== "all") {
      queryParams[filter.field] = filter.value;
    }
  }

  return (
    <MyWindow
      id="arrime"
      title="Arrime"
      icon={<Truck className="h-4 w-4 text-blue-600" />}
      tutorialId="arrime"
      initialPosition={{ x: 220, y: 120 }}
      initialSize={{ width: 1200, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-blue-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      isStandalone={isStandalone}
      popoutUrl="/standalone/arrime"
    >
      <ArrimeContent
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFiltersWithOptions}
        onTextFilterChange={handleTextFilterChange}
        onOpenReport={handleOpenReport}
        centralFilter={textFilters.find(f => f.field === "central")?.value || ""}
      />
    </MyWindow>
  );
}
