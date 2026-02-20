import { useState, useMemo, useCallback } from "react";
import { Wheat, Settings } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, MyGrid, type BooleanFilter, type TextFilter, type Column, type ReportFilters } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useMultipleParametrosOptions } from "@/hooks/useParametrosOptions";
import { queryClient } from "@/lib/queryClient";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import CosechaParametros from "@/components/CosechaParametros";

const cosechaColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "comprobante", label: "Comprob.", defaultWidth: 80, type: "numericText" },
  { key: "chofer", label: "Chofer", defaultWidth: 120 },
  { key: "placa", label: "Placa", defaultWidth: 80 },
  { key: "ciclo", label: "Ciclo", defaultWidth: 100 },
  { key: "destino", label: "Destino", defaultWidth: 100 },
  { key: "torbas", label: "Torbas", defaultWidth: 60, align: "right", type: "number" },
  { key: "tablon", label: "Tablón", defaultWidth: 70 },
  { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
  { key: "cantnet", label: "Cant.Neta", defaultWidth: 80, align: "right", type: "number" },
  { key: "descporc", label: "Desc%", defaultWidth: 60, align: "right", type: "number" },
  { key: "cancelado", label: "Cancel", defaultWidth: 60, type: "boolean" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "descripcion", label: "Descripción", defaultWidth: 180 },
  { key: "cultivo", label: "Cultivo", defaultWidth: 80 },
  { key: "unidad", label: "Unidad", defaultWidth: 80 },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

interface DateRange {
  start: string;
  end: string;
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
  { field: "cancelado", label: "Cancelado", value: "all" },
];

const TEXT_FILTER_FIELDS = [
  { field: "cultivo", label: "Cultivo" },
  { field: "ciclo", label: "Ciclo" },
  { field: "chofer", label: "Chofer" },
  { field: "destino", label: "Destino" },
];

const PARAMETROS_FIELDS = ["cultivo", "ciclo", "chofer", "destino"] as const;

interface CosechaContentProps {
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
}

function CosechaContent({
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
}: CosechaContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowDate, setSelectedRowDate] = useState<string | undefined>(undefined);
  const [clientDateFilter, setClientDateFilter] = useState<DateRange>({ start: "", end: "" });
  const { tableData, hasMore, onLoadMore, onRefresh, onRemove, onEdit, onCopy } = useTableData();

  const handleClearFilters = useCallback(() => {
    setClientDateFilter({ start: "", end: "" });
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  }, [onDescripcionChange, booleanFilters, onBooleanFilterChange, textFilters, onTextFilterChange, dateFilter, onDateChange]);

  const handleRowClick = useCallback((row: Record<string, any>) => {
    setSelectedRowId(row.id);
    setSelectedRowDate(row.fecha);
  }, []);

  const handleOpenReport = useCallback((filters: ReportFilters) => {
    window.dispatchEvent(new CustomEvent("openReportWithFilters", { detail: filters }));
  }, []);

  const filteredData = useMemo(() => {
    if (!clientDateFilter.start && !clientDateFilter.end) return tableData;
    return tableData.filter((row) => {
      const rowDate = row.fecha;
      if (!rowDate) return false;
      if (clientDateFilter.start && rowDate < clientDateFilter.start) return false;
      if (clientDateFilter.end && rowDate > clientDateFilter.end) return false;
      return true;
    });
  }, [tableData, clientDateFilter]);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex-1 overflow-hidden p-2 border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
        <MyGrid
          tableId="cosecha-movimientos"
          tableName="cosecha"
          columns={cosechaColumns}
          data={filteredData}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onEdit={onEdit}
          onCopy={onCopy}
          onRefresh={onRefresh}
          onRemove={onRemove}
          onRecordSaved={(record) => { setSelectedRowId(record.id); setSelectedRowDate(record.fecha); }}
          filtroDeUnidad={unidadFilter}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onDateStartClick={({ fecha }) => !clientDateFilter.start && setClientDateFilter(prev => ({ ...prev, start: fecha }))}
          onDateEndClick={({ fecha }) => !clientDateFilter.end && setClientDateFilter(prev => ({ ...prev, end: fecha }))}
          dateClickState={!clientDateFilter.start ? "none" : !clientDateFilter.end ? "start" : "none"}
          showReportes={true}
          onReportes={() => handleOpenReport({
            sourceModule: "cosecha",
            activeTab: "cosecha",
            dateRange: dateFilter,
            unidad: unidadFilter,
            textFilters: Object.fromEntries(textFilters.filter(f => !!f.value).map(f => [f.field, f.value])),
            descripcion: descripcionFilter,
            booleanFilters: Object.fromEntries(booleanFilters.filter(f => f.value !== "all").map(f => [f.field, f.value])),
          })}
        />
      </div>
    </div>
  );
}

interface CosechaProps {
  minimizedIndex?: number;
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  isStandalone?: boolean;
}

export default function Cosecha({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: CosechaProps) {
  return (
    <MyWindow
      id="cosecha"
      title="Cosecha"
      icon={<Wheat className="h-4 w-4 text-yellow-800 dark:text-yellow-200" />}
      tutorialId="cosecha"
      initialPosition={{ x: 200, y: 140 }}
      initialSize={{ width: 1100, height: 600 }}
      minSize={{ width: 700, height: 400 }}
      maxSize={{ width: 1500, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-yellow-500/40"
      autoLoadTable={true}
      isStandalone={isStandalone}
      popoutUrl="/standalone/cosecha"
    >
      <div className="flex items-center justify-center h-full">
        <p className="text-lg font-bold">Cosecha - Prueba Mínima</p>
      </div>
    </MyWindow>
  );
}
