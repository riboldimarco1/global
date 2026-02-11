import { useState, useMemo, useEffect, useCallback } from "react";
import { Settings, Search, X, DollarSign } from "lucide-react";
import { MyWindow, MyTab } from "@/components/My";
import { parametrosTabs } from "@/config/parametrosTabs";
import { tabAlegreClasses, tabMinimizadoClasses } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import { useTableData } from "@/contexts/TableDataContext";
import { useParametrosOptionsWithRefetch } from "@/hooks/useParametrosOptions";
import { useToast } from "@/hooks/use-toast";
import { useMyPop } from "@/components/MyPop";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClavesTab from "@/components/ClavesTab";
import { hasTabAccess } from "@/lib/auth";

interface Filters {
  nombre: string;
  unidad: string;
  habilitado: "todos" | "activo" | "inactivo";
}

interface ParametrosProps {
  onBack?: () => void;
  onLogout?: () => void;
  onFocus?: () => void;
  zIndex?: number;
  minimizedIndex?: number;
  isStandalone?: boolean;
}

function ParametrosContent() {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ nombre: "", unidad: "", habilitado: "todos" });
  const { tableData } = useTableData();
  const { options: unidades, refetch: refetchUnidades } = useParametrosOptionsWithRefetch("unidad");
  const { isAlegre } = useStyleMode();
  const { showPop } = useMyPop();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;

  // Filter tabs based on user permissions
  const visibleTabs = useMemo(() => {
    return parametrosTabs.filter(tab => hasTabAccess(tab.id));
  }, []);

  // Set initial active tab to first visible tab
  const [activeTab, setActiveTab] = useState(() => {
    const firstVisible = parametrosTabs.find(tab => hasTabAccess(tab.id));
    return firstVisible?.id || "unidad";
  });

  const TABS_SIN_FILTRO_UNIDAD = ["bancos", "dolar", "constantes", "unidad", "claves"];
  const tabUsaUnidad = !TABS_SIN_FILTRO_UNIDAD.includes(activeTab);
  const hasActiveFilters = filters.nombre !== "" || (tabUsaUnidad && filters.unidad !== "") || filters.habilitado !== "todos";

  useEffect(() => {
    if (unidades.length > 0 && filters.unidad === "") {
      setFilters(f => ({ ...f, unidad: unidades[0].nombre }));
    }
  }, [unidades]);

  const clearFilters = () => {
    setFilters({ nombre: "", unidad: unidades.length > 0 ? unidades[0].nombre : "", habilitado: "todos" });
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  const [bcvLoading, setBcvLoading] = useState(false);
  const handleConsultarBCV = useCallback(async () => {
    setBcvLoading(true);
    try {
      const res = await fetch("/api/bcv-dolar");
      if (!res.ok) throw new Error("error al consultar el BCV");
      const data = await res.json();
      const valor = data.valor;
      const fechaApi = data.fecha;
      const [y, m, d] = fechaApi.split("-");
      const fechaFormatted = `${d}/${m}/${y.slice(-2)}`;

      await apiRequest("POST", "/api/parametros", {
        tipo: "dolar",
        nombre: "dolar",
        valor: String(valor),
        fecha: fechaFormatted,
        habilitado: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      showPop({ title: "tasa actualizada", message: `dólar BCV: ${valor} bs\nfecha: ${fechaFormatted}` });
    } catch (err: any) {
      showPop({ title: "error", message: err.message || "no se pudo consultar el BCV" });
    } finally {
      setBcvLoading(false);
    }
  }, [showPop]);

  return (
    <div className="h-full p-2 flex flex-col gap-2">
      <Card className="border-primary/20 shadow-sm shrink-0">
        <CardContent className="py-2 px-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[180px]">
              <Label htmlFor="filter-nombre" className="sr-only">Nombre</Label>
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="filter-nombre"
                  placeholder="Nombre..."
                  value={filters.nombre}
                  onChange={(e) => setFilters(f => ({ ...f, nombre: e.target.value }))}
                  className="pl-7 h-8 text-sm"
                  data-testid="input-filter-nombre"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-unidad" className="text-xs font-medium whitespace-nowrap">Unidad:</Label>
              <Select 
                value={filters.unidad || "todas"} 
                onValueChange={(value) => setFilters(f => ({ ...f, unidad: value === "todas" ? "" : value }))}
                onOpenChange={(open) => open && refetchUnidades()}
              >
                <SelectTrigger id="filter-unidad" className="w-[150px] h-8 text-sm" data-testid="select-filter-unidad">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.nombre}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-[10px] font-medium whitespace-nowrap text-muted-foreground">Habilitado:</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters(f => ({ ...f, habilitado: f.habilitado === "activo" ? "todos" : "activo" }))}
                className={`h-7 px-1.5 text-[10px] ${
                  filters.habilitado === "activo"
                    ? "!bg-green-600 !border-green-700 !text-white hover:!bg-green-700"
                    : ""
                }`}
                data-testid="button-filter-habilitado-si"
              >
                Sí
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters(f => ({ ...f, habilitado: f.habilitado === "inactivo" ? "todos" : "inactivo" }))}
                className={`h-7 px-1.5 text-[10px] ${
                  filters.habilitado === "inactivo"
                    ? "!bg-red-600 !border-red-700 !text-white hover:!bg-red-700"
                    : ""
                }`}
                data-testid="button-filter-habilitado-no"
              >
                No
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters} 
              className="h-8 px-2 text-xs" 
              disabled={!hasActiveFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Quitar Filtros
            </Button>
            {activeTab === "dolar" && (
              <MyButtonStyle
                color="cyan"
                loading={bcvLoading}
                onClick={handleConsultarBCV}
                data-testid="button-consultar-bcv"
              >
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Consultar BCV
              </MyButtonStyle>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex-1 overflow-hidden">
        {activeTab === "claves" ? (
          <div className="h-full flex flex-col">
            <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-md shrink-0">
              {visibleTabs.map((tab) => {
                const colorConfig = tab.color ? tabColorClasses[tab.color] : null;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2 py-1 text-xs whitespace-nowrap border-2 rounded-md transition-colors font-medium ${
                      colorConfig
                        ? `${colorConfig.shadow} ${isActive ? `${colorConfig.activeBg} ${colorConfig.border} ${colorConfig.text}` : `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} opacity-80`}`
                        : isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-hidden">
              <ClavesTab />
            </div>
          </div>
        ) : (
          <MyTab
            tabs={visibleTabs}
            icon={<Settings className="h-4 w-4 text-muted-foreground" />}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onRowClick={handleRowClick}
            selectedRowId={selectedRowId}
            onRecordSaved={(record) => setSelectedRowId(record.id)}
            showUtilityColumn={false}
            tableName="parametros"
            filtroDeUnidad={tabUsaUnidad ? filters.unidad : ""}
            filterFn={(row) => {
              if (filters.nombre && !row.nombre?.toLowerCase().includes(filters.nombre.toLowerCase())) {
                return false;
              }
              if (tabUsaUnidad && filters.unidad && row.unidad !== filters.unidad) {
                return false;
              }
              if (filters.habilitado === "activo" && row.habilitado !== true) {
                return false;
              }
              if (filters.habilitado === "inactivo" && row.habilitado !== false) {
                return false;
              }
              return true;
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function Parametros({ onBack, onFocus, zIndex, minimizedIndex, isStandalone }: ParametrosProps) {
  const { toast } = useToast();
  const { showPop } = useMyPop();

  const handleCopy = (row: Record<string, any>) => {
    const text = Object.entries(row)
      .filter(([k, v]) => v !== null && k !== "id")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: `Datos de ${row.nombre || "registro"} copiados al portapapeles`,
    });
  };

  const handleEdit = (row: Record<string, any>) => {
    toast({
      title: "Editar",
      description: `Editando: ${row.nombre || "registro"}`,
    });
  };

  const handleDelete = async (row: Record<string, any>) => {
    if (!row.id) return;
    try {
      const response = await fetch(`/api/parametros/${row.id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      } else {
        showPop({ title: "Error", message: "No se pudo eliminar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  return (
    <MyWindow
      id="parametros"
      title="Parámetros"
      icon={<Settings className="h-4 w-4 text-purple-600" />}
      tutorialId="parametros"
      initialPosition={{ x: 200, y: 60 }}
      initialSize={{ width: 1000, height: 650 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-purple-500"
      autoLoadTable={true}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
      minimizedIndex={minimizedIndex}
      isStandalone={isStandalone}
      popoutUrl="/standalone/parametros"
    >
      <ParametrosContent />
    </MyWindow>
  );
}
