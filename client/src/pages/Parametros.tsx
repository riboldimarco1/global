import { useState, useEffect, useRef, memo } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { useResizableColumns, type ColumnConfig } from "@/hooks/use-resizable-columns";
import { ResizableHeader } from "@/components/ResizableTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Settings, Copy, Search, X, Calculator } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import FloatingWindow from "@/components/FloatingWindow";
import type { 
  UnidadProduccion, Actividad, Cliente, Insumo, Personal, 
  Producto, Proveedor, Banco, OperacionBancaria, TasaDolar 
} from "@shared/schema";

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function CalculatorInput({ value, onChange, placeholder, testId }: { value: string; onChange: (v: string) => void; placeholder: string; testId: string }) {
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("");
  const [calcResult, setCalcResult] = useState("");

  const handleCalcButton = (val: string) => {
    if (val === "C") {
      setCalcDisplay("");
      setCalcResult("");
    } else if (val === "=") {
      try {
        const result = Function('"use strict";return (' + calcDisplay + ')')();
        setCalcResult(String(result));
        setCalcDisplay(String(result));
      } catch {
        setCalcResult("Error");
      }
    } else if (val === "OK") {
      if (calcResult && calcResult !== "Error") {
        onChange(calcResult);
      } else if (calcDisplay) {
        onChange(calcDisplay);
      }
      setCalcOpen(false);
      setCalcDisplay("");
      setCalcResult("");
    } else {
      setCalcDisplay(prev => prev + val);
    }
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-8"
        data-testid={testId}
      />
      <Popover open={calcOpen} onOpenChange={setCalcOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 h-full w-8 hover:bg-transparent" data-testid={`${testId}-calc`}>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="space-y-2">
            <div className="bg-muted p-2 rounded text-right font-mono text-sm min-h-[2rem]">
              {calcDisplay || "0"}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "C", "+"].map(btn => (
                <Button key={btn} variant="outline" size="sm" className="h-8" onClick={() => handleCalcButton(btn)}>{btn}</Button>
              ))}
              <Button variant="default" size="sm" className="h-8 col-span-2" onClick={() => handleCalcButton("=")}>=</Button>
              <Button variant="default" size="sm" className="h-8 col-span-2" onClick={() => handleCalcButton("OK")}>OK</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ParametrosProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

interface Filters {
  nombre: string;
  habilitado: "todos" | "activo" | "inactivo";
}

export default function Parametros({ onBack, onLogout, onFocus, zIndex }: ParametrosProps) {
  const [activeTab, setActiveTab] = useState("unidades");
  const [filters, setFilters] = useState<Filters>({ nombre: "", habilitado: "todos" });
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const hasShownToast = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unidadesQuery = useCachedQuery<UnidadProduccion[]>(["/api/unidades-produccion"]);
  const actividadesQuery = useCachedQuery<Actividad[]>(["/api/actividades"]);
  const clientesQuery = useCachedQuery<Cliente[]>(["/api/clientes"]);
  const insumosQuery = useCachedQuery<Insumo[]>(["/api/insumos"]);
  const personalQuery = useCachedQuery<Personal[]>(["/api/personal"]);
  const productosQuery = useCachedQuery<Producto[]>(["/api/productos"]);
  const proveedoresQuery = useCachedQuery<Proveedor[]>(["/api/proveedores"]);
  const bancosQuery = useCachedQuery<Banco[]>(["/api/bancos"]);
  const operacionesQuery = useCachedQuery<OperacionBancaria[]>(["/api/operaciones-bancarias"]);
  const tasasDolarQuery = useCachedQuery<TasaDolar[]>(["/api/tasas-dolar"]);

  const unidades = unidadesQuery.data ?? [];
  const actividades = actividadesQuery.data ?? [];
  const clientes = clientesQuery.data ?? [];
  const insumos = insumosQuery.data ?? [];
  const personal = personalQuery.data ?? [];
  const productos = productosQuery.data ?? [];
  const proveedores = proveedoresQuery.data ?? [];
  const bancos = bancosQuery.data ?? [];
  const operaciones = operacionesQuery.data ?? [];
  const tasasDolar = tasasDolarQuery.data ?? [];

  useEffect(() => {
    if (unidadesQuery.cacheStatus !== 'loading' && !hasShownToast.current) {
      hasShownToast.current = true;
      if (unidadesQuery.cacheStatus === 'from_cache') {
        setCacheMessage("Caché");
        toast({
          title: "Carga rápida",
          description: "Datos cargados desde caché local. Sincronizando con servidor...",
        });
      } else {
        setCacheMessage("Servidor");
      }
      timeoutRef.current = setTimeout(() => setCacheMessage(null), 5000);
    }
  }, [unidadesQuery.cacheStatus, toast]);

  useEffect(() => {
    if (hasShownToast.current && unidadesQuery.cacheStatus === 'from_server' && cacheMessage === "Caché") {
      setCacheMessage("Sincronizado");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCacheMessage(null), 3000);
    }
  }, [unidadesQuery.cacheStatus, cacheMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const clearFilters = () => {
    setFilters({ nombre: "", habilitado: "todos" });
  };

  const hasActiveFilters = filters.nombre !== "" || filters.habilitado !== "todos";

  return (
    <FloatingWindow
      id="parametros"
      title="Parámetros"
      icon={<Settings className="h-4 w-4 text-purple-600" />}
      initialPosition={{ x: 200, y: 60 }}
      initialSize={{ width: 1000, height: 650 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-purple-500"
    >
      <div className="p-2 space-y-2">
        <Card className="border-primary/20 shadow-sm">
          <CardContent className="py-2 px-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros:</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
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
                <Label htmlFor="filter-habilitado" className="text-xs font-medium whitespace-nowrap">Estado:</Label>
                <Select 
                  value={filters.habilitado} 
                  onValueChange={(value: "todos" | "activo" | "inactivo") => setFilters(f => ({ ...f, habilitado: value }))}
                >
                  <SelectTrigger id="filter-habilitado" className="w-[120px] h-8 text-sm" data-testid="select-filter-habilitado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs" data-testid="button-clear-filters">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpiar
                </Button>
              )}
              {cacheMessage && (
                <Badge 
                  variant={cacheMessage === 'Caché' ? 'default' : 'secondary'}
                  className={`ml-auto text-xs ${cacheMessage === 'Caché' ? 'bg-green-600 text-white' : cacheMessage === 'Sincronizado' ? 'bg-blue-600 text-white' : ''}`}
                  data-testid="badge-cache-status"
                >
                  {cacheMessage}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <CardContent className="p-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
              <div className="flex items-center gap-3 mb-2 border-b pb-2">
                <div className="flex items-center gap-2 px-1 border-r pr-3">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">Configuración:</span>
                </div>
                <ScrollArea className="flex-1 whitespace-nowrap">
                  <div className="pb-1">
                    <TabsList className="inline-flex h-8 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
                      <TabsTrigger value="unidades" data-testid="tab-unidades" className="px-3 h-6 text-xs shrink-0">Unidades</TabsTrigger>
                      <TabsTrigger value="actividades" data-testid="tab-actividades" className="px-3 h-6 text-xs shrink-0">Actividades</TabsTrigger>
                      <TabsTrigger value="clientes" data-testid="tab-clientes" className="px-3 h-6 text-xs shrink-0">Clientes</TabsTrigger>
                      <TabsTrigger value="insumos" data-testid="tab-insumos" className="px-3 h-6 text-xs shrink-0">Insumos</TabsTrigger>
                      <TabsTrigger value="personal" data-testid="tab-personal" className="px-3 h-6 text-xs shrink-0">Personal</TabsTrigger>
                      <TabsTrigger value="productos" data-testid="tab-productos" className="px-3 h-6 text-xs shrink-0">Productos</TabsTrigger>
                      <TabsTrigger value="proveedores" data-testid="tab-proveedores" className="px-3 h-6 text-xs shrink-0">Proveedores</TabsTrigger>
                      <TabsTrigger value="bancos" data-testid="tab-bancos" className="px-3 h-6 text-xs shrink-0">Bancos</TabsTrigger>
                      <TabsTrigger value="operaciones" data-testid="tab-operaciones" className="px-3 h-6 text-xs shrink-0">Operaciones</TabsTrigger>
                      <TabsTrigger value="dolar" data-testid="tab-dolar" className="px-3 h-6 text-xs shrink-0">Dólar</TabsTrigger>
                    </TabsList>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              <div className="mt-1">
                <TabsContent value="unidades" className="mt-0 focus-visible:outline-none">
                  {activeTab === "unidades" && <UnidadesTab unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="actividades" className="mt-0 focus-visible:outline-none">
                  {activeTab === "actividades" && <ActividadesTab actividades={actividades} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="clientes" className="mt-0 focus-visible:outline-none">
                  {activeTab === "clientes" && <ClientesTab clientes={clientes} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="insumos" className="mt-0 focus-visible:outline-none">
                  {activeTab === "insumos" && <InsumosTab insumos={insumos} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                  {activeTab === "personal" && <PersonalTab personal={personal} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="productos" className="mt-0 focus-visible:outline-none">
                  {activeTab === "productos" && <ProductosTab productos={productos} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="proveedores" className="mt-0 focus-visible:outline-none">
                  {activeTab === "proveedores" && <ProveedoresTab proveedores={proveedores} unidades={unidades} filters={filters} />}
                </TabsContent>
                <TabsContent value="bancos" className="mt-0 focus-visible:outline-none">
                  {activeTab === "bancos" && <BancosTab bancos={bancos} filters={filters} />}
                </TabsContent>
                <TabsContent value="operaciones" className="mt-0 focus-visible:outline-none">
                  {activeTab === "operaciones" && <OperacionesTab operaciones={operaciones} filters={filters} />}
                </TabsContent>
                <TabsContent value="dolar" className="mt-0 focus-visible:outline-none">
                  {activeTab === "dolar" && <DolarTab tasasDolar={tasasDolar} />}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </FloatingWindow>
  );
}

function applyFilters<T extends { nombre: string; habilitado: boolean }>(items: T[], filters: Filters): T[] {
  return items.filter(item => {
    const matchesNombre = filters.nombre === "" || item.nombre.toLowerCase().includes(filters.nombre.toLowerCase());
    const matchesHabilitado = filters.habilitado === "todos" || 
      (filters.habilitado === "activo" && item.habilitado) || 
      (filters.habilitado === "inactivo" && !item.habilitado);
    return matchesNombre && matchesHabilitado;
  });
}

const ITEMS_PER_PAGE = 20;

const UNIDADES_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "rif", defaultWidth: 120, minWidth: 80 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const ACTIVIDADES_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "unidad", defaultWidth: 150, minWidth: 100 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const CLIENTES_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 180, minWidth: 100 },
  { key: "rif", defaultWidth: 100, minWidth: 80 },
  { key: "unidad", defaultWidth: 120, minWidth: 80 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const INSUMOS_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "unidad", defaultWidth: 150, minWidth: 100 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const PERSONAL_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 180, minWidth: 100 },
  { key: "unidad", defaultWidth: 120, minWidth: 80 },
  { key: "rif", defaultWidth: 100, minWidth: 80 },
  { key: "telefono", defaultWidth: 100, minWidth: 80 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const PRODUCTOS_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "unidad", defaultWidth: 150, minWidth: 100 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const PROVEEDORES_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 180, minWidth: 100 },
  { key: "telefono", defaultWidth: 100, minWidth: 80 },
  { key: "unidad", defaultWidth: 120, minWidth: 80 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const BANCOS_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "numeroCuenta", defaultWidth: 150, minWidth: 100 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const OPERACIONES_COLUMNS: ColumnConfig[] = [
  { key: "nombre", defaultWidth: 200, minWidth: 100 },
  { key: "operador", defaultWidth: 100, minWidth: 80 },
  { key: "estado", defaultWidth: 70, minWidth: 50 },
  { key: "acciones", defaultWidth: 120, minWidth: 100 },
];

const DOLAR_COLUMNS: ColumnConfig[] = [
  { key: "fecha", defaultWidth: 150, minWidth: 100 },
  { key: "valor", defaultWidth: 150, minWidth: 100 },
  { key: "acciones", defaultWidth: 100, minWidth: 80 },
];

const UnidadesTab = memo(function UnidadesTab({ unidades, filters }: { unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("unidades", UNIDADES_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<UnidadProduccion | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", descripcion: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const filteredUnidades = applyFilters(unidades, filters);
  const totalPages = Math.ceil(filteredUnidades.length / ITEMS_PER_PAGE);
  const paginatedUnidades = filteredUnidades.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredUnidades.findIndex(u => u.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredUnidades, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  const resetForm = (item?: UnidadProduccion | null) => {
    setFormData({
      nombre: item?.nombre || "",
      rif: item?.rif || "",
      descripcion: item?.descripcion || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<UnidadProduccion>) => apiRequest("POST", "/api/unidades-produccion", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/unidades-produccion"] });
      setDialogOpen(false);
      toast({ title: "Unidad creada" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UnidadProduccion> }) => 
      apiRequest("PUT", `/api/unidades-produccion/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/unidades-produccion"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Unidad actualizada" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/unidades-produccion/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unidades-produccion"] });
      toast({ title: "Unidad eliminada" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, rif: formData.rif || undefined, descripcion: formData.descripcion || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: UnidadProduccion) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Unidades de Producción</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-unidad">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Unidad de Producción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rif">RIF (V/E/O/J-nnnnnnnn-n)</Label>
                <Input id="rif" placeholder="V-12345678-9" value={formData.rif} onChange={(e) => setFormData(f => ({ ...f, rif: e.target.value }))} data-testid="input-rif" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="rif" width={widths.rif || 120} onResize={handleResize} className="text-xs">RIF</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUnidades.map((u) => (
                <TableRow key={u.id} data-row-id={u.id} className={`compact-row ${highlightId === u.id ? "row-highlight" : ""}`}>
                  <TableCell style={getColumnStyle("nombre")} className="font-medium text-sm py-1">{u.nombre}</TableCell>
                  <TableCell style={getColumnStyle("rif")} className="text-sm py-1">{u.rif || "-"}</TableCell>
                  <TableCell style={getColumnStyle("estado")} className="py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => updateMutation.mutate({ id: u.id, data: { habilitado: !u.habilitado } })}
                      data-testid={`button-toggle-status-${u.id}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${u.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                    </Button>
                  </TableCell>
                  <TableCell style={getColumnStyle("acciones")} className="py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(u); setDialogOpen(true); }} data-testid={`button-copy-${u.id}`}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(u)} data-testid={`button-edit-${u.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog
                        onConfirm={() => deleteMutation.mutate(u.id)}
                        description={`¿Está seguro de eliminar "${u.nombre}"?`}
                        triggerClassName="h-6 w-6"
                        testId={`button-delete-${u.id}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">
              Página {currentPage + 1} de {totalPages} ({filteredUnidades.length} registros)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ActividadesTab = memo(function ActividadesTab({ actividades, unidades, filters }: { actividades: Actividad[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("actividades", ACTIVIDADES_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Actividad | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const filteredActividades = applyFilters(actividades, filters);
  const totalPages = Math.ceil(filteredActividades.length / ITEMS_PER_PAGE);
  const paginatedActividades = filteredActividades.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredActividades.findIndex(a => a.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredActividades, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Actividad | null) => {
    setFormData({
      nombre: item?.nombre || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Actividad>) => apiRequest("POST", "/api/actividades", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/actividades"] });
      setDialogOpen(false);
      toast({ title: "Actividad creada" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Actividad> }) => 
      apiRequest("PUT", `/api/actividades/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/actividades"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Actividad actualizada" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/actividades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actividades"] });
      toast({ title: "Actividad eliminada" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, unidadProduccionId: formData.unidadProduccionId, descripcion: formData.descripcion || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Actividad) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Actividades</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-actividad">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Actividad</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 150} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActividades.map((a) => (
                <TableRow key={a.id} data-row-id={a.id} className={`compact-row ${highlightId === a.id ? "row-highlight" : ""}`}>
                  <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{a.nombre}</TableCell>
                  <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(a.unidadProduccionId)}</TableCell>
                  <TableCell style={getColumnStyle("estado")} className="py-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateMutation.mutate({ id: a.id, data: { habilitado: !a.habilitado } })} data-testid={`button-toggle-status-${a.id}`}>
                      <div className={`w-2.5 h-2.5 rounded-full ${a.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                    </Button>
                  </TableCell>
                  <TableCell style={getColumnStyle("acciones")} className="py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(a); setDialogOpen(true); }} data-testid={`button-copy-${a.id}`}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(a)} data-testid={`button-edit-${a.id}`}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(a.id)} description={`¿Está seguro de eliminar "${a.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${a.id}`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredActividades.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ClientesTab = memo(function ClientesTab({ clientes, unidades, filters }: { clientes: Cliente[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("clientes", CLIENTES_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredClientes = applyFilters(clientes, filters);
  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredClientes.findIndex(c => c.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredClientes, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Cliente | null) => {
    setFormData({
      nombre: item?.nombre || "",
      rif: item?.rif || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Cliente>) => apiRequest("POST", "/api/clientes", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setDialogOpen(false);
      toast({ title: "Cliente creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cliente> }) => 
      apiRequest("PUT", `/api/clientes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Cliente actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      toast({ title: "Cliente eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, rif: formData.rif || undefined, unidadProduccionId: formData.unidadProduccionId, descripcion: formData.descripcion || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Cliente) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Clientes</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-cliente">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rif">RIF</Label>
                <Input id="rif" placeholder="V-12345678-9" value={formData.rif} onChange={(e) => setFormData(f => ({ ...f, rif: e.target.value }))} data-testid="input-rif" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 180} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="rif" width={widths.rif || 100} onResize={handleResize} className="text-xs">RIF</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 120} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClientes.map((c) => (
              <TableRow key={c.id} data-row-id={c.id} className={`compact-row ${highlightId === c.id ? "row-highlight" : ""}`}>
                <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{c.nombre}</TableCell>
                <TableCell style={getColumnStyle("rif")} className="py-1 text-sm">{c.rif || "-"}</TableCell>
                <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(c.unidadProduccionId)}</TableCell>
                <TableCell style={getColumnStyle("estado")} className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateMutation.mutate({ id: c.id, data: { habilitado: !c.habilitado } })}
                    data-testid={`button-toggle-status-${c.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${c.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                  </Button>
                </TableCell>
                <TableCell style={getColumnStyle("acciones")} className="py-1">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(c); setDialogOpen(true); }} data-testid={`button-copy-${c.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(c)} data-testid={`button-edit-${c.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(c.id)} description={`¿Está seguro de eliminar "${c.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${c.id}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredClientes.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const InsumosTab = memo(function InsumosTab({ insumos, unidades, filters }: { insumos: Insumo[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("insumos", INSUMOS_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredInsumos = applyFilters(insumos, filters);
  const totalPages = Math.ceil(filteredInsumos.length / ITEMS_PER_PAGE);
  const paginatedInsumos = filteredInsumos.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredInsumos.findIndex(i => i.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredInsumos, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Insumo | null) => {
    setFormData({
      nombre: item?.nombre || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Insumo>) => apiRequest("POST", "/api/insumos", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/insumos"] });
      setDialogOpen(false);
      toast({ title: "Insumo creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Insumo> }) => 
      apiRequest("PUT", `/api/insumos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/insumos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Insumo actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/insumos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insumos"] });
      toast({ title: "Insumo eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, unidadProduccionId: formData.unidadProduccionId, descripcion: formData.descripcion || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Insumo) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Insumos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-insumo">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Insumo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 150} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInsumos.map((i) => (
              <TableRow key={i.id} data-row-id={i.id} className={`compact-row ${highlightId === i.id ? "row-highlight" : ""}`}>
                <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{i.nombre}</TableCell>
                <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(i.unidadProduccionId)}</TableCell>
                <TableCell style={getColumnStyle("estado")} className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateMutation.mutate({ id: i.id, data: { habilitado: !i.habilitado } })}
                    data-testid={`button-toggle-status-${i.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${i.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                  </Button>
                </TableCell>
                <TableCell style={getColumnStyle("acciones")} className="py-1">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(i); setDialogOpen(true); }} data-testid={`button-copy-${i.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(i)} data-testid={`button-edit-${i.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(i.id)} description={`¿Está seguro de eliminar "${i.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${i.id}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredInsumos.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const PersonalTab = memo(function PersonalTab({ personal, unidades, filters }: { personal: Personal[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("personal", PERSONAL_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Personal | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", unidadProduccionId: "", descripcion: "", numeroCuenta: "", correo: "", telefono: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredPersonal = applyFilters(personal, filters);
  const totalPages = Math.ceil(filteredPersonal.length / ITEMS_PER_PAGE);
  const paginatedPersonal = filteredPersonal.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredPersonal.findIndex(p => p.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredPersonal, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Personal | null) => {
    setFormData({
      nombre: item?.nombre || "",
      rif: item?.rif || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      numeroCuenta: item?.numeroCuenta || "",
      correo: item?.correo || "",
      telefono: item?.telefono || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Personal>) => apiRequest("POST", "/api/personal", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/personal"] });
      setDialogOpen(false);
      toast({ title: "Personal creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Personal> }) => 
      apiRequest("PUT", `/api/personal/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Personal actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/personal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal"] });
      toast({ title: "Personal eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      ...formData, 
      rif: formData.rif || undefined, 
      unidadProduccionId: formData.unidadProduccionId, 
      descripcion: formData.descripcion || undefined,
      numeroCuenta: formData.numeroCuenta || undefined,
      correo: formData.correo || undefined,
      telefono: formData.telefono || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Personal) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Personal</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-personal">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Personal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rif">RIF/CI</Label>
                <Input id="rif" placeholder="V-12345678-9" value={formData.rif} onChange={(e) => setFormData(f => ({ ...f, rif: e.target.value }))} data-testid="input-rif" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                <Input id="numeroCuenta" value={formData.numeroCuenta} onChange={(e) => setFormData(f => ({ ...f, numeroCuenta: e.target.value }))} data-testid="input-numeroCuenta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo</Label>
                <Input id="correo" type="email" value={formData.correo} onChange={(e) => setFormData(f => ({ ...f, correo: e.target.value }))} data-testid="input-correo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData(f => ({ ...f, telefono: e.target.value }))} data-testid="input-telefono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 180} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 120} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="rif" width={widths.rif || 100} onResize={handleResize} className="text-xs">RIF/CI</ResizableHeader>
                <ResizableHeader columnKey="telefono" width={widths.telefono || 100} onResize={handleResize} className="text-xs">Teléfono</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPersonal.map((p) => (
                <TableRow key={p.id} data-row-id={p.id} className={`compact-row ${highlightId === p.id ? "row-highlight" : ""}`}>
                  <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{p.nombre}</TableCell>
                  <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                  <TableCell style={getColumnStyle("rif")} className="py-1 text-sm">{p.rif || "-"}</TableCell>
                  <TableCell style={getColumnStyle("telefono")} className="py-1 text-sm">{p.telefono || "-"}</TableCell>
                  <TableCell style={getColumnStyle("estado")} className="py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => updateMutation.mutate({ id: p.id, data: { habilitado: !p.habilitado } })}
                      data-testid={`button-toggle-status-${p.id}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${p.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                    </Button>
                  </TableCell>
                  <TableCell style={getColumnStyle("acciones")} className="py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(p.id)} description={`¿Está seguro de eliminar "${p.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${p.id}`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredPersonal.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ProductosTab = memo(function ProductosTab({ productos, unidades, filters }: { productos: Producto[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("productos", PRODUCTOS_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredProductos = applyFilters(productos, filters);
  const totalPages = Math.ceil(filteredProductos.length / ITEMS_PER_PAGE);
  const paginatedProductos = filteredProductos.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredProductos.findIndex(p => p.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredProductos, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Producto | null) => {
    setFormData({
      nombre: item?.nombre || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Producto>) => apiRequest("POST", "/api/productos", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
      setDialogOpen(false);
      toast({ title: "Producto creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Producto> }) => 
      apiRequest("PUT", `/api/productos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Producto actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/productos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
      toast({ title: "Producto eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, unidadProduccionId: formData.unidadProduccionId, descripcion: formData.descripcion || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Producto) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Productos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-producto">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 150} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProductos.map((p) => (
                <TableRow key={p.id} data-row-id={p.id} className={`compact-row ${highlightId === p.id ? "row-highlight" : ""}`}>
                  <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{p.nombre}</TableCell>
                  <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                  <TableCell style={getColumnStyle("estado")} className="py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => updateMutation.mutate({ id: p.id, data: { habilitado: !p.habilitado } })}
                      data-testid={`button-toggle-status-${p.id}`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${p.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                    </Button>
                  </TableCell>
                  <TableCell style={getColumnStyle("acciones")} className="py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(p.id)} description={`¿Está seguro de eliminar "${p.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${p.id}`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredProductos.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ProveedoresTab = memo(function ProveedoresTab({ proveedores, unidades, filters }: { proveedores: Proveedor[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("proveedores", PROVEEDORES_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", numeroCuenta: "", correo: "", telefono: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredProveedores = applyFilters(proveedores, filters);
  const totalPages = Math.ceil(filteredProveedores.length / ITEMS_PER_PAGE);
  const paginatedProveedores = filteredProveedores.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredProveedores.findIndex(p => p.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredProveedores, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Proveedor | null) => {
    setFormData({
      nombre: item?.nombre || "",
      unidadProduccionId: item?.unidadProduccionId || (unidades[0]?.id || ""),
      descripcion: item?.descripcion || "",
      numeroCuenta: item?.numeroCuenta || "",
      correo: item?.correo || "",
      telefono: item?.telefono || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Proveedor>) => apiRequest("POST", "/api/proveedores", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/proveedores"] });
      setDialogOpen(false);
      toast({ title: "Proveedor creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Proveedor> }) => 
      apiRequest("PUT", `/api/proveedores/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proveedores"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Proveedor actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/proveedores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proveedores"] });
      toast({ title: "Proveedor eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { 
      ...formData, 
      unidadProduccionId: formData.unidadProduccionId, 
      descripcion: formData.descripcion || undefined,
      numeroCuenta: formData.numeroCuenta || undefined,
      correo: formData.correo || undefined,
      telefono: formData.telefono || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Proveedor) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  const getUnidadNombre = (id?: string | null) => {
    if (!id) return "Todas";
    return unidades.find(u => u.id === id)?.nombre || "N/A";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Proveedores</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-proveedor">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadProduccionId">Unidad de Producción</Label>
                <Select value={formData.unidadProduccionId} onValueChange={(value) => setFormData(f => ({ ...f, unidadProduccionId: value }))}>
                  <SelectTrigger data-testid="select-unidad">
                    <SelectValue placeholder="Todas las unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                <Input id="numeroCuenta" value={formData.numeroCuenta} onChange={(e) => setFormData(f => ({ ...f, numeroCuenta: e.target.value }))} data-testid="input-numeroCuenta" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo</Label>
                <Input id="correo" type="email" value={formData.correo} onChange={(e) => setFormData(f => ({ ...f, correo: e.target.value }))} data-testid="input-correo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData(f => ({ ...f, telefono: e.target.value }))} data-testid="input-telefono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 180} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="telefono" width={widths.telefono || 100} onResize={handleResize} className="text-xs">Teléfono</ResizableHeader>
                <ResizableHeader columnKey="unidad" width={widths.unidad || 120} onResize={handleResize} className="text-xs">Unidad</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProveedores.map((p) => (
              <TableRow key={p.id} data-row-id={p.id} className={`compact-row ${highlightId === p.id ? "row-highlight" : ""}`}>
                <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{p.nombre}</TableCell>
                <TableCell style={getColumnStyle("telefono")} className="py-1 text-sm">{p.telefono || "-"}</TableCell>
                <TableCell style={getColumnStyle("unidad")} className="py-1 text-sm">{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                <TableCell style={getColumnStyle("estado")} className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateMutation.mutate({ id: p.id, data: { habilitado: !p.habilitado } })}
                    data-testid={`button-toggle-status-${p.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${p.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                  </Button>
                </TableCell>
                <TableCell style={getColumnStyle("acciones")} className="py-1">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(p.id)} description={`¿Está seguro de eliminar "${p.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${p.id}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredProveedores.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const BancosTab = memo(function BancosTab({ bancos, filters }: { bancos: Banco[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("bancos", BANCOS_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Banco | null>(null);
  const [formData, setFormData] = useState({ nombre: "", numeroCuenta: "", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredBancos = applyFilters(bancos, filters);
  const totalPages = Math.ceil(filteredBancos.length / ITEMS_PER_PAGE);
  const paginatedBancos = filteredBancos.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredBancos.findIndex(b => b.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredBancos, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: Banco | null) => {
    setFormData({
      nombre: item?.nombre || "",
      numeroCuenta: item?.numeroCuenta || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Banco>) => apiRequest("POST", "/api/bancos", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      setDialogOpen(false);
      toast({ title: "Banco creado" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banco> }) => 
      apiRequest("PUT", `/api/bancos/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Banco actualizado" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/bancos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      toast({ title: "Banco eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, numeroCuenta: formData.numeroCuenta || undefined };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: Banco) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Bancos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-banco">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Banco</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroCuenta">Número de Cuenta</Label>
                <Input id="numeroCuenta" value={formData.numeroCuenta} onChange={(e) => setFormData(f => ({ ...f, numeroCuenta: e.target.value }))} data-testid="input-numeroCuenta" />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="numeroCuenta" width={widths.numeroCuenta || 150} onResize={handleResize} className="text-xs">Número de Cuenta</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBancos.map((b) => (
              <TableRow key={b.id} data-row-id={b.id} className={`compact-row ${highlightId === b.id ? "row-highlight" : ""}`}>
                <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{b.nombre}</TableCell>
                <TableCell style={getColumnStyle("numeroCuenta")} className="py-1 text-sm">{b.numeroCuenta || "-"}</TableCell>
                <TableCell style={getColumnStyle("estado")} className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateMutation.mutate({ id: b.id, data: { habilitado: !b.habilitado } })}
                    data-testid={`button-toggle-status-${b.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${b.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                  </Button>
                </TableCell>
                <TableCell style={getColumnStyle("acciones")} className="py-1">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(b); setDialogOpen(true); }} data-testid={`button-copy-${b.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(b)} data-testid={`button-edit-${b.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(b.id)} description={`¿Está seguro de eliminar "${b.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${b.id}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredBancos.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const OperacionesTab = memo(function OperacionesTab({ operaciones, filters }: { operaciones: OperacionBancaria[]; filters: Filters }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("operaciones", OPERACIONES_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<OperacionBancaria | null>(null);
  const [formData, setFormData] = useState<{ nombre: string; operador: "suma" | "resta"; habilitado: boolean }>({ nombre: "", operador: "suma", habilitado: true });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredOperaciones = applyFilters(operaciones, filters);
  const totalPages = Math.ceil(filteredOperaciones.length / ITEMS_PER_PAGE);
  const paginatedOperaciones = filteredOperaciones.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = filteredOperaciones.findIndex(o => o.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) setCurrentPage(targetPage);
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, filteredOperaciones, currentPage]);

  useEffect(() => { setCurrentPage(0); }, [filters]);

  const resetForm = (item?: OperacionBancaria | null) => {
    setFormData({
      nombre: item?.nombre || "",
      operador: (item?.operador as "suma" | "resta") || "suma",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<OperacionBancaria>) => apiRequest("POST", "/api/operaciones-bancarias", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones-bancarias"] });
      setDialogOpen(false);
      toast({ title: "Operación creada" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OperacionBancaria> }) => 
      apiRequest("PUT", `/api/operaciones-bancarias/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones-bancarias"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Operación actualizada" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/operaciones-bancarias/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones-bancarias"] });
      toast({ title: "Operación eliminada" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openDialog = (item?: OperacionBancaria) => {
    setEditItem(item || null);
    resetForm(item);
    setDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 py-2 px-4">
        <CardTitle className="text-sm font-bold">Operaciones Bancarias</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-operacion">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Operación Bancaria</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: capitalizeWords(e.target.value) }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operador">Operador</Label>
                <Select value={formData.operador} onValueChange={(value) => setFormData(f => ({ ...f, operador: value as "suma" | "resta" }))}>
                  <SelectTrigger data-testid="select-operador">
                    <SelectValue placeholder="Seleccionar operador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suma">Suma (+)</SelectItem>
                    <SelectItem value="resta">Resta (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="habilitado" checked={formData.habilitado} onCheckedChange={(checked) => setFormData(f => ({ ...f, habilitado: checked }))} data-testid="switch-habilitado" />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                {editItem ? "Guardar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="nombre" width={widths.nombre || 200} onResize={handleResize} className="text-xs">Nombre</ResizableHeader>
                <ResizableHeader columnKey="operador" width={widths.operador || 100} onResize={handleResize} className="text-xs">Operador</ResizableHeader>
                <ResizableHeader columnKey="estado" width={widths.estado || 70} onResize={handleResize} className="text-xs">Estado</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 120} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOperaciones.map((o) => (
              <TableRow key={o.id} data-row-id={o.id} className={`compact-row ${highlightId === o.id ? "row-highlight" : ""}`}>
                <TableCell style={getColumnStyle("nombre")} className="font-medium py-1 text-sm">{o.nombre}</TableCell>
                <TableCell style={getColumnStyle("operador")} className="py-1">
                  <Badge variant={o.operador === "suma" ? "default" : "destructive"} className="text-[10px] px-1.5 h-4">
                    {o.operador === "suma" ? "+ Suma" : "- Resta"}
                  </Badge>
                </TableCell>
                <TableCell style={getColumnStyle("estado")} className="py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateMutation.mutate({ id: o.id, data: { habilitado: !o.habilitado } })}
                    data-testid={`button-toggle-status-${o.id}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${o.habilitado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`} />
                  </Button>
                </TableCell>
                <TableCell style={getColumnStyle("acciones")} className="py-1">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(null); resetForm(o); setDialogOpen(true); }} data-testid={`button-copy-${o.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(o)} data-testid={`button-edit-${o.id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(o.id)} description={`¿Está seguro de eliminar "${o.nombre}"?`} triggerClassName="h-6 w-6" testId={`button-delete-${o.id}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">Página {currentPage + 1} de {totalPages} ({filteredOperaciones.length} registros)</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const DolarTab = memo(function DolarTab({ tasasDolar }: { tasasDolar: TasaDolar[] }) {
  const { widths, handleResize, getColumnStyle } = useResizableColumns("dolar", DOLAR_COLUMNS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TasaDolar | null>(null);
  const [formData, setFormData] = useState({ fecha: "", valor: "" });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(tasasDolar.length / ITEMS_PER_PAGE);
  const paginatedTasas = tasasDolar.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  useEffect(() => {
    if (highlightId && scrollContainerRef.current) {
      const index = tasasDolar.findIndex(t => t.id === highlightId);
      if (index >= 0) {
        const targetPage = Math.floor(index / ITEMS_PER_PAGE);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
        setTimeout(() => {
          const row = scrollContainerRef.current?.querySelector(`[data-row-id="${highlightId}"]`);
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setHighlightId(null), 1500);
        }, 100);
      }
    }
  }, [highlightId, tasasDolar, currentPage]);

  const resetForm = (item?: TasaDolar | null) => {
    setFormData({
      fecha: item?.fecha || "",
      valor: item?.valor?.toString() || "",
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: { fecha: string; valor: number }) => apiRequest("POST", "/api/tasas-dolar", data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/tasas-dolar"] });
      setDialogOpen(false);
      toast({ title: "Tasa creada" });
      setTimeout(() => setHighlightId(created.id), 100);
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fecha: string; valor: number } }) =>
      apiRequest("PUT", `/api/tasas-dolar/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasas-dolar"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Tasa actualizada" });
      setTimeout(() => setHighlightId(variables.id), 100);
    },
    onError: () => toast({ title: "Error al actualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasas-dolar/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasas-dolar"] });
      toast({ title: "Tasa eliminada" });
    },
    onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { fecha: formData.fecha, valor: parseFloat(formData.valor) || 0 };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item?: TasaDolar) => {
    if (item) {
      setEditItem(item);
      resetForm(item);
    } else {
      setEditItem(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="py-2 px-4 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-bold">Historial de Tasas</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog()} data-testid="button-add-dolar">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar Tasa" : "Nueva Tasa de Dólar"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData(f => ({ ...f, fecha: e.target.value }))}
                  data-testid="input-fecha-dolar"
                />
              </div>
              <div>
                <Label>Valor</Label>
                <CalculatorInput
                  value={formData.valor}
                  onChange={(v) => setFormData(f => ({ ...f, valor: v }))}
                  placeholder="0.00"
                  testId="input-valor-dolar"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" data-testid="button-save-dolar">{editItem ? "Guardar" : "Crear"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 border-t">
        <ScrollArea className="h-[420px]" ref={scrollContainerRef}>
          <Table className="zebra-table" style={{ tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow className="compact-row">
                <ResizableHeader columnKey="fecha" width={widths.fecha || 150} onResize={handleResize} className="text-xs">Fecha</ResizableHeader>
                <ResizableHeader columnKey="valor" width={widths.valor || 150} onResize={handleResize} className="text-xs">Valor</ResizableHeader>
                <ResizableHeader columnKey="acciones" width={widths.acciones || 100} onResize={handleResize} className="text-xs text-right" isLast>Acciones</ResizableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasas.map((t) => (
                <TableRow key={t.id} data-row-id={t.id} className={`compact-row ${highlightId === t.id ? "row-highlight" : ""}`}>
                  <TableCell style={getColumnStyle("fecha")} className="font-medium text-sm py-1">{t.fecha}</TableCell>
                  <TableCell style={getColumnStyle("valor")} className="text-sm py-1">{t.valor?.toFixed(2)}</TableCell>
                  <TableCell style={getColumnStyle("acciones")} className="py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDialog(t)} data-testid={`button-edit-dolar-${t.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteConfirmDialog onConfirm={() => deleteMutation.mutate(t.id)} description={`¿Está seguro de eliminar la tasa del ${t.fecha}?`} triggerClassName="h-6 w-6" testId={`button-delete-dolar-${t.id}`} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">
              Página {currentPage + 1} de {totalPages} ({tasasDolar.length} registros)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                data-testid="button-prev-page-dolar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                data-testid="button-next-page-dolar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
