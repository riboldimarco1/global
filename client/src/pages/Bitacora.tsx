import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { BookOpen, Plus, Pencil, Trash2, Copy, Star, ChevronDown, Loader2 } from "lucide-react";
import { MyWindow, MyFilter, MyFiltroDeUnidad, type BooleanFilter, type TextFilter, type Column } from "@/components/My";
import { usePersistedFilter } from "@/hooks/usePersistedFilter";
import { useTableData } from "@/contexts/TableDataContext";
import { useMyPop } from "@/components/MyPop";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";
import MyEditingForm from "@/components/MyEditingForm";

interface DateRange {
  start: string;
  end: string;
}

const bitacoraColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
  { key: "descripcion", label: "Descripción", defaultWidth: 500, type: "text" },
  { key: "utility", label: "Uti", defaultWidth: 50, type: "boolean" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

function DiaryNewEntry({ unidadFilter, onEntrySaved }: { unidadFilter: string; onEntrySaved: (record: Record<string, any>) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const { showPop } = useMyPop();

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      showPop({ title: "Aviso", message: "Escribe algo en la entrada antes de guardar." });
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const fecha = `${dd}/${mm}/${yy}`;
      const username = getStoredUsername() || "sistema";

      const body: Record<string, any> = {
        descripcion: trimmed.toLowerCase(),
        fecha,
        unidad: unidadFilter !== "all" ? unidadFilter : "",
        utility: false,
        _username: username,
      };

      const response = await apiRequest("POST", "/api/bitacora", body);
      const saved = await response.json();

      queryClient.setQueriesData(
        { predicate: (q) => {
          const key = q.queryKey[0] as string;
          return key === "/api/bitacora" || key?.startsWith("/api/bitacora?");
        }},
        (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;
          return [...oldData, saved];
        }
      );

      setText("");
      onEntrySaved(saved);
    } catch (error: any) {
      showPop({ title: "Error", message: error.message || "No se pudo guardar la entrada." });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="mx-3 mt-2 mb-1 p-3 rounded-lg border-2 border-dashed border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1 rounded-md border-2 bg-rose-600 border-rose-700 flex items-center justify-center">
          <Plus className="h-4 w-4 text-white" />
        </span>
        <span className="text-sm font-bold text-rose-800 dark:text-rose-300">Nueva entrada del diario</span>
      </div>
      <textarea
        data-testid="bitacora-nueva-entrada"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe aquí tu nota del día..."
        className="w-full min-h-[60px] max-h-[120px] p-2 text-sm rounded-md border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-y focus:outline-none focus:ring-2 focus:ring-rose-400"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Ctrl+Enter para guardar</span>
        <MyButtonStyle color="green" loading={saving} onClick={handleSave} data-testid="bitacora-guardar-entrada">
          Agregar
        </MyButtonStyle>
      </div>
    </div>
  );
}

function DiaryEntry({
  entry,
  onEdit,
  onCopy,
  onDelete,
}: {
  entry: Record<string, any>;
  onEdit: (row: Record<string, any>) => void;
  onCopy: (row: Record<string, any>) => void;
  onDelete: (row: Record<string, any>) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const propietario = entry.propietario || "";
  const userMatch = propietario.match(/^(\S+)/);
  const author = userMatch ? userMatch[1] : "sistema";
  const dateTimeMatch = propietario.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/);
  const timestamp = dateTimeMatch ? dateTimeMatch[0] : "";

  return (
    <div
      data-testid={`diary-entry-${entry.id}`}
      className="group relative ml-6 mb-3"
    >
      <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-rose-400 dark:bg-rose-500 border-2 border-white dark:border-gray-900 z-10" />

      <div
        data-testid={`diary-card-${entry.id}`}
        className="relative p-3 rounded-lg border border-rose-200/60 dark:border-rose-800/40 bg-gradient-to-br from-amber-50/40 via-white to-rose-50/30 dark:from-gray-800/60 dark:via-gray-850 dark:to-rose-950/20 shadow-sm transition-shadow cursor-pointer"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap flex-1">
            {entry.descripcion}
          </p>
          {entry.utility && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400 flex-shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-rose-100/50 dark:border-rose-900/30">
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            — {author}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {timestamp}
            </span>
          )}
        </div>

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-2 top-2 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
          >
            <button
              data-testid={`diary-edit-${entry.id}`}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(entry); }}
            >
              <Pencil className="h-3.5 w-3.5 text-blue-500" /> Editar
            </button>
            <button
              data-testid={`diary-copy-${entry.id}`}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onCopy(entry); }}
            >
              <Copy className="h-3.5 w-3.5 text-cyan-500" /> Copiar
            </button>
            <button
              data-testid={`diary-delete-${entry.id}`}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(entry); }}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" /> Borrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface BitacoraContentProps {
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

function BitacoraContent({
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
}: BitacoraContentProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { tableData, tableName, hasMore, onLoadMore, onRefresh, onRemove, isLoading } = useTableData();
  const { showPop } = useMyPop();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit" | "delete">("new");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleClearFilters = () => {
    onDescripcionChange("");
    booleanFilters.forEach((f) => onBooleanFilterChange(f.field, "all"));
    textFilters.forEach((f) => onTextFilterChange(f.field, ""));
    if (dateFilter.start || dateFilter.end) {
      onDateChange({ start: "", end: "" });
    }
  };

  const handleDelete = async (entry: Record<string, any>) => {
    setEditingRow(entry);
    setFormMode("delete");
    setIsFormOpen(true);
  };

  const handleEdit = (entry: Record<string, any>) => {
    setEditingRow(entry);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleCopy = (entry: Record<string, any>) => {
    const { id, propietario, ...rowWithoutId } = entry;
    setEditingRow(rowWithoutId);
    setFormMode("new");
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = useCallback(async (row: Record<string, any>) => {
    try {
      await apiRequest("DELETE", `/api/bitacora/${row.id}`);
      onRemove(row.id);
      queryClient.setQueriesData(
        { predicate: (q) => {
          const key = q.queryKey[0] as string;
          return key === "/api/bitacora" || key?.startsWith("/api/bitacora?");
        }},
        (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.filter((r: any) => r.id !== row.id);
        }
      );
      setIsFormOpen(false);
      setEditingRow(null);
    } catch (error: any) {
      showPop({ title: "Error", message: error.message || "No se pudo borrar la entrada." });
    }
  }, [onRemove, showPop]);

  const handleSaveEditedRecord = useCallback(async (formData: Record<string, any>) => {
    if (!editingRow) return;
    try {
      const updateData = { ...formData, id: editingRow.id };
      const response = await apiRequest("PUT", `/api/bitacora/${editingRow.id}`, updateData);
      const savedRecord = await response.json();
      queryClient.setQueriesData(
        { predicate: (q) => {
          const key = q.queryKey[0] as string;
          return key === "/api/bitacora" || key?.startsWith("/api/bitacora?");
        }},
        (oldData: any) => {
          if (Array.isArray(oldData)) {
            return oldData.map((r: any) => String(r.id) === String(savedRecord.id) ? savedRecord : r);
          }
          return oldData;
        }
      );
      onRefresh(savedRecord);
      setEditingRow(null);
      setIsFormOpen(false);
    } catch (error: any) {
      showPop({ title: "Error", message: error.message || "No se pudo actualizar." });
    }
  }, [editingRow, onRefresh, showPop]);

  const handleSaveNewRecord = useCallback(async (formData: Record<string, any>) => {
    try {
      const username = getStoredUsername() || "sistema";
      const body = { ...formData, _username: username };
      const response = await apiRequest("POST", "/api/bitacora", body);
      const saved = await response.json();
      queryClient.setQueriesData(
        { predicate: (q) => {
          const key = q.queryKey[0] as string;
          return key === "/api/bitacora" || key?.startsWith("/api/bitacora?");
        }},
        (oldData: any) => {
          if (!Array.isArray(oldData)) return oldData;
          return [...oldData, saved];
        }
      );
      onRefresh(saved);
      setSelectedRowId(saved.id);
      setEditingRow(null);
      setIsFormOpen(false);
    } catch (error: any) {
      showPop({ title: "Error", message: error.message || "No se pudo guardar." });
    }
  }, [onRefresh, showPop]);

  const handleFormSave = useCallback((formData: Record<string, any>) => {
    if (editingRow && formMode === "edit") {
      handleSaveEditedRecord(formData);
    } else {
      handleSaveNewRecord(formData);
    }
  }, [editingRow, formMode, handleSaveEditedRecord, handleSaveNewRecord]);

  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; entries: Record<string, any>[] }[] = [];
    const dateMap = new Map<string, number>();
    for (const entry of tableData) {
      const dateKey = entry.fecha || "sin fecha";
      const idx = dateMap.get(dateKey);
      if (idx !== undefined) {
        groups[idx].entries.push(entry);
      } else {
        dateMap.set(dateKey, groups.length);
        groups.push({ dateKey, entries: [entry] });
      }
    }
    return groups;
  }, [tableData]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-3 pt-2">
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={onUnidadChange}
          showLabel={true}
          tipo="unidad"
          valueType="nombre"
          testId="bitacora-filtro-unidad"
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
        />
      </div>

      <DiaryNewEntry
        unidadFilter={unidadFilter}
        onEntrySaved={(record) => {
          setSelectedRowId(record.id);
          onRefresh(record);
        }}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-3"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            <span className="ml-2 text-sm text-gray-500">Cargando diario...</span>
          </div>
        ) : groupedByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
            <BookOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm italic">El diario está vacío. Escribe tu primera entrada arriba.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[5px] top-0 bottom-0 w-0.5 bg-rose-200 dark:bg-rose-800" />

            {groupedByDate.map(({ dateKey, entries }) => (
              <div key={dateKey} className="mb-4">
                <div className="flex items-center gap-2 mb-2 ml-0">
                  <div className="w-3 h-3 rounded-full bg-rose-500 dark:bg-rose-400 border-2 border-white dark:border-gray-900 z-10 relative" />
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">
                    {formatDateForDisplay(dateKey)}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
                  </span>
                </div>

                {entries.map((entry) => (
                  <DiaryEntry
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEdit}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center py-3">
                <MyButtonStyle color="gray" onClick={onLoadMore} data-testid="bitacora-cargar-mas">
                  <ChevronDown className="h-4 w-4 mr-1" /> Cargar más entradas
                </MyButtonStyle>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-3 py-1 border-t border-rose-200/40 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-950/10">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {tableData.length} {tableData.length === 1 ? "entrada" : "entradas"} en el diario
        </span>
      </div>

      <MyEditingForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingRow(null); }}
        onSave={handleFormSave}
        onDelete={formMode === "delete" ? handleDeleteConfirm : undefined}
        columns={bitacoraColumns}
        title={formMode === "edit" ? "Editar Entrada" : formMode === "delete" ? "Borrar Entrada" : "Nueva Entrada"}
        filtroDeUnidad={unidadFilter}
        initialData={editingRow}
        isEditing={formMode === "edit"}
        mode={formMode}
        onRecordSaved={(record) => { setSelectedRowId(record.id); }}
        tableName="bitacora"
      />
    </div>
  );
}

const DEFAULT_BOOLEAN_FILTERS: BooleanFilter[] = [
  { field: "utility", label: "Utilidad", value: "all" },
];

interface BitacoraProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

export default function Bitacora({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: BitacoraProps) {
  const [unidadFilter, setUnidadFilter] = usePersistedFilter("bitacora", "unidad", "all");
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: "", end: "" });
  const [descripcionFilter, setDescripcionFilter] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<BooleanFilter[]>(DEFAULT_BOOLEAN_FILTERS);
  const [textFilters, setTextFilters] = useState<TextFilter[]>([]);

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
      id="bitacora"
      title="Bitácora"
      icon={<BookOpen className="h-4 w-4 text-rose-800 dark:text-rose-300" />}
      tutorialId="bitacora"
      initialPosition={{ x: 220, y: 140 }}
      initialSize={{ width: 700, height: 600 }}
      minSize={{ width: 500, height: 400 }}
      maxSize={{ width: 1200, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      minimizedIndex={minimizedIndex}
      borderColor="border-rose-500/40"
      autoLoadTable={true}
      queryParams={queryParams}
      isStandalone={isStandalone}
      popoutUrl="/standalone/bitacora"
    >
      <BitacoraContent
        unidadFilter={unidadFilter}
        onUnidadChange={setUnidadFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        descripcionFilter={descripcionFilter}
        onDescripcionChange={setDescripcionFilter}
        booleanFilters={booleanFilters}
        onBooleanFilterChange={handleBooleanFilterChange}
        textFilters={textFilters}
        onTextFilterChange={handleTextFilterChange}
      />
    </MyWindow>
  );
}
