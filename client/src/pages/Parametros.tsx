import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, Plus, Edit2, Trash2, Settings, Copy, Search, X, Calculator } from "lucide-react";
import type { 
  UnidadProduccion, Actividad, Cliente, Insumo, Personal, 
  Producto, Proveedor, Banco, OperacionBancaria, TasaDolar 
} from "@shared/schema";

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
}

interface Filters {
  nombre: string;
  habilitado: "todos" | "activo" | "inactivo";
}

export default function Parametros({ onBack, onLogout }: ParametrosProps) {
  const [activeTab, setActiveTab] = useState("unidades");
  const [filters, setFilters] = useState<Filters>({ nombre: "", habilitado: "todos" });
  const { toast } = useToast();

  const { data: unidades = [] } = useQuery<UnidadProduccion[]>({ queryKey: ["/api/unidades-produccion"] });
  const { data: actividades = [] } = useQuery<Actividad[]>({ queryKey: ["/api/actividades"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: insumos = [] } = useQuery<Insumo[]>({ queryKey: ["/api/insumos"] });
  const { data: personal = [] } = useQuery<Personal[]>({ queryKey: ["/api/personal"] });
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ["/api/productos"] });
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ["/api/proveedores"] });
  const { data: bancos = [] } = useQuery<Banco[]>({ queryKey: ["/api/bancos"] });
  const { data: operaciones = [] } = useQuery<OperacionBancaria[]>({ queryKey: ["/api/operaciones-bancarias"] });
  const { data: tasasDolar = [] } = useQuery<TasaDolar[]>({ queryKey: ["/api/tasas-dolar"] });

  const clearFilters = () => {
    setFilters({ nombre: "", habilitado: "todos" });
  };

  const hasActiveFilters = filters.nombre !== "" || filters.habilitado !== "todos";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500/5 to-blue-600/10 flex flex-col">
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Parámetros</h1>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} data-testid="button-logout">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="py-2 px-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" /> Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4 px-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Label htmlFor="filter-nombre" className="sr-only">Nombre</Label>
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="filter-nombre"
                    placeholder="Buscar por nombre..."
                    value={filters.nombre}
                    onChange={(e) => setFilters(f => ({ ...f, nombre: e.target.value }))}
                    className="pl-9 h-10"
                    data-testid="input-filter-nombre"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="filter-habilitado" className="text-sm font-medium whitespace-nowrap">Estado:</Label>
                <Select 
                  value={filters.habilitado} 
                  onValueChange={(value: "todos" | "activo" | "inactivo") => setFilters(f => ({ ...f, habilitado: value }))}
                >
                  <SelectTrigger id="filter-habilitado" className="w-[140px] h-10" data-testid="select-filter-habilitado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="activo">Solo Activos</SelectItem>
                    <SelectItem value="inactivo">Solo Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-10 px-3" data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <CardHeader className="py-2 px-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configuración de Parámetros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="pb-2">
                  <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
                    <TabsTrigger value="unidades" data-testid="tab-unidades" className="px-4 shrink-0">Unidades</TabsTrigger>
                    <TabsTrigger value="actividades" data-testid="tab-actividades" className="px-4 shrink-0">Actividades</TabsTrigger>
                    <TabsTrigger value="clientes" data-testid="tab-clientes" className="px-4 shrink-0">Clientes</TabsTrigger>
                    <TabsTrigger value="insumos" data-testid="tab-insumos" className="px-4 shrink-0">Insumos</TabsTrigger>
                    <TabsTrigger value="personal" data-testid="tab-personal" className="px-4 shrink-0">Personal</TabsTrigger>
                    <TabsTrigger value="productos" data-testid="tab-productos" className="px-4 shrink-0">Productos</TabsTrigger>
                    <TabsTrigger value="proveedores" data-testid="tab-proveedores" className="px-4 shrink-0">Proveedores</TabsTrigger>
                    <TabsTrigger value="bancos" data-testid="tab-bancos" className="px-4 shrink-0">Bancos</TabsTrigger>
                    <TabsTrigger value="operaciones" data-testid="tab-operaciones" className="px-4 shrink-0">Operaciones</TabsTrigger>
                    <TabsTrigger value="dolar" data-testid="tab-dolar" className="px-4 shrink-0">Dólar</TabsTrigger>
                  </TabsList>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <div className="mt-4">
                <TabsContent value="unidades" className="mt-0 focus-visible:outline-none">
                  <UnidadesTab unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="actividades" className="mt-0 focus-visible:outline-none">
                  <ActividadesTab actividades={actividades} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="clientes" className="mt-0 focus-visible:outline-none">
                  <ClientesTab clientes={clientes} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="insumos" className="mt-0 focus-visible:outline-none">
                  <InsumosTab insumos={insumos} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                  <PersonalTab personal={personal} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="productos" className="mt-0 focus-visible:outline-none">
                  <ProductosTab productos={productos} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="proveedores" className="mt-0 focus-visible:outline-none">
                  <ProveedoresTab proveedores={proveedores} unidades={unidades} filters={filters} />
                </TabsContent>
                <TabsContent value="bancos" className="mt-0 focus-visible:outline-none">
                  <BancosTab bancos={bancos} filters={filters} />
                </TabsContent>
                <TabsContent value="operaciones" className="mt-0 focus-visible:outline-none">
                  <OperacionesTab operaciones={operaciones} filters={filters} />
                </TabsContent>
                <TabsContent value="dolar" className="mt-0 focus-visible:outline-none">
                  <DolarTab tasasDolar={tasasDolar} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
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

function UnidadesTab({ unidades, filters }: { unidades: UnidadProduccion[]; filters: Filters }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<UnidadProduccion | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", descripcion: "", color: "#3b82f6", habilitado: true });
  const { toast } = useToast();
  
  const filteredUnidades = applyFilters(unidades, filters);

  const resetForm = (item?: UnidadProduccion | null) => {
    setFormData({
      nombre: item?.nombre || "",
      rif: item?.rif || "",
      descripcion: item?.descripcion || "",
      color: item?.color || "#3b82f6",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<UnidadProduccion>) => apiRequest("POST", "/api/unidades-produccion", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unidades-produccion"] });
      setDialogOpen(false);
      toast({ title: "Unidad creada" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UnidadProduccion> }) => 
      apiRequest("PUT", `/api/unidades-produccion/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unidades-produccion"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Unidad actualizada" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Unidades de Producción</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-unidad">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Unidad de Producción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rif">RIF (V/E/O/J-nnnnnnnn-n)</Label>
                <Input id="rif" placeholder="V-12345678-9" value={formData.rif} onChange={(e) => setFormData(f => ({ ...f, rif: e.target.value }))} data-testid="input-rif" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} data-testid="input-descripcion" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))} data-testid="input-color" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RIF</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
                    {u.nombre}
                  </div>
                </TableCell>
                <TableCell>{u.rif || "-"}</TableCell>
                <TableCell>
                  <Badge variant={u.habilitado ? "default" : "secondary"}>
                    {u.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(u); setDialogOpen(true); }} data-testid={`button-copy-${u.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(u)} data-testid={`button-edit-${u.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)} data-testid={`button-delete-${u.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActividadesTab({ actividades, unidades, filters }: { actividades: Actividad[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Actividad | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const { toast } = useToast();
  
  const filteredActividades = applyFilters(actividades, filters);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actividades"] });
      setDialogOpen(false);
      toast({ title: "Actividad creada" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Actividad> }) => 
      apiRequest("PUT", `/api/actividades/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actividades"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Actividad actualizada" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Actividades</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-actividad">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Actividad</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActividades.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.nombre}</TableCell>
                <TableCell>{getUnidadNombre(a.unidadProduccionId)}</TableCell>
                <TableCell>
                  <Badge variant={a.habilitado ? "default" : "secondary"}>
                    {a.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(a); setDialogOpen(true); }} data-testid={`button-copy-${a.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(a)} data-testid={`button-edit-${a.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)} data-testid={`button-delete-${a.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ClientesTab({ clientes, unidades, filters }: { clientes: Cliente[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const { toast } = useToast();

  const filteredClientes = applyFilters(clientes, filters);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setDialogOpen(false);
      toast({ title: "Cliente creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Cliente> }) => 
      apiRequest("PUT", `/api/clientes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Cliente actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Clientes</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-cliente">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RIF</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell>{c.rif || "-"}</TableCell>
                <TableCell>{getUnidadNombre(c.unidadProduccionId)}</TableCell>
                <TableCell>
                  <Badge variant={c.habilitado ? "default" : "secondary"}>
                    {c.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(c); setDialogOpen(true); }} data-testid={`button-copy-${c.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(c)} data-testid={`button-edit-${c.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-${c.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InsumosTab({ insumos, unidades, filters }: { insumos: Insumo[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Insumo | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const { toast } = useToast();

  const filteredInsumos = applyFilters(insumos, filters);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insumos"] });
      setDialogOpen(false);
      toast({ title: "Insumo creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Insumo> }) => 
      apiRequest("PUT", `/api/insumos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insumos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Insumo actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Insumos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-insumo">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Insumo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInsumos.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nombre}</TableCell>
                <TableCell>{getUnidadNombre(i.unidadProduccionId)}</TableCell>
                <TableCell>
                  <Badge variant={i.habilitado ? "default" : "secondary"}>
                    {i.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(i); setDialogOpen(true); }} data-testid={`button-copy-${i.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(i)} data-testid={`button-edit-${i.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(i.id)} data-testid={`button-delete-${i.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PersonalTab({ personal, unidades, filters }: { personal: Personal[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const filteredPersonal = applyFilters(personal, filters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Personal | null>(null);
  const [formData, setFormData] = useState({ nombre: "", rif: "", unidadProduccionId: "", descripcion: "", numeroCuenta: "", correo: "", telefono: "", habilitado: true });
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal"] });
      setDialogOpen(false);
      toast({ title: "Personal creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Personal> }) => 
      apiRequest("PUT", `/api/personal/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Personal actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Personal</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-personal">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Personal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>RIF/CI</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPersonal.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                <TableCell>{p.rif || "-"}</TableCell>
                <TableCell>{p.telefono || "-"}</TableCell>
                <TableCell>
                  <Badge variant={p.habilitado ? "default" : "secondary"}>
                    {p.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-${p.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProductosTab({ productos, unidades, filters }: { productos: Producto[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const filteredProductos = applyFilters(productos, filters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", habilitado: true });
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
      setDialogOpen(false);
      toast({ title: "Producto creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Producto> }) => 
      apiRequest("PUT", `/api/productos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/productos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Producto actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Productos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-producto">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Producto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProductos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                <TableCell>
                  <Badge variant={p.habilitado ? "default" : "secondary"}>
                    {p.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-${p.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProveedoresTab({ proveedores, unidades, filters }: { proveedores: Proveedor[]; unidades: UnidadProduccion[]; filters: Filters }) {
  const filteredProveedores = applyFilters(proveedores, filters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({ nombre: "", unidadProduccionId: "", descripcion: "", numeroCuenta: "", correo: "", telefono: "", habilitado: true });
  const { toast } = useToast();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proveedores"] });
      setDialogOpen(false);
      toast({ title: "Proveedor creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Proveedor> }) => 
      apiRequest("PUT", `/api/proveedores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proveedores"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Proveedor actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Proveedores</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-proveedor">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Proveedor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProveedores.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.telefono || "-"}</TableCell>
                <TableCell>{getUnidadNombre(p.unidadProduccionId)}</TableCell>
                <TableCell>
                  <Badge variant={p.habilitado ? "default" : "secondary"}>
                    {p.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(p); setDialogOpen(true); }} data-testid={`button-copy-${p.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(p)} data-testid={`button-edit-${p.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} data-testid={`button-delete-${p.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BancosTab({ bancos, filters }: { bancos: Banco[]; filters: Filters }) {
  const filteredBancos = applyFilters(bancos, filters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Banco | null>(null);
  const [formData, setFormData] = useState({ nombre: "", numeroCuenta: "", habilitado: true });
  const { toast } = useToast();

  const resetForm = (item?: Banco | null) => {
    setFormData({
      nombre: item?.nombre || "",
      numeroCuenta: item?.numeroCuenta || "",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Banco>) => apiRequest("POST", "/api/bancos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      setDialogOpen(false);
      toast({ title: "Banco creado" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banco> }) => 
      apiRequest("PUT", `/api/bancos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bancos"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Banco actualizado" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Bancos</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-banco">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nuevo"} Banco</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Número de Cuenta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBancos.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell>{b.numeroCuenta || "-"}</TableCell>
                <TableCell>
                  <Badge variant={b.habilitado ? "default" : "secondary"}>
                    {b.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(b); setDialogOpen(true); }} data-testid={`button-copy-${b.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(b)} data-testid={`button-edit-${b.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(b.id)} data-testid={`button-delete-${b.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function OperacionesTab({ operaciones, filters }: { operaciones: OperacionBancaria[]; filters: Filters }) {
  const filteredOperaciones = applyFilters(operaciones, filters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<OperacionBancaria | null>(null);
  const [formData, setFormData] = useState<{ nombre: string; operador: "suma" | "resta"; habilitado: boolean }>({ nombre: "", operador: "suma", habilitado: true });
  const { toast } = useToast();

  const resetForm = (item?: OperacionBancaria | null) => {
    setFormData({
      nombre: item?.nombre || "",
      operador: (item?.operador as "suma" | "resta") || "suma",
      habilitado: item?.habilitado ?? true,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<OperacionBancaria>) => apiRequest("POST", "/api/operaciones-bancarias", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones-bancarias"] });
      setDialogOpen(false);
      toast({ title: "Operación creada" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OperacionBancaria> }) => 
      apiRequest("PUT", `/api/operaciones-bancarias/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operaciones-bancarias"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Operación actualizada" });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base">Operaciones Bancarias</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditItem(null); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-operacion">
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Editar" : "Nueva"} Operación Bancaria</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} required data-testid="input-nombre" />
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperaciones.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.nombre}</TableCell>
                <TableCell>
                  <Badge variant={o.operador === "suma" ? "default" : "destructive"}>
                    {o.operador === "suma" ? "+ Suma" : "- Resta"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={o.habilitado ? "default" : "secondary"}>
                    {o.habilitado ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditItem(null); resetForm(o); setDialogOpen(true); }} data-testid={`button-copy-${o.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDialog(o)} data-testid={`button-edit-${o.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(o.id)} data-testid={`button-delete-${o.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DolarTab({ tasasDolar }: { tasasDolar: TasaDolar[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TasaDolar | null>(null);
  const [formData, setFormData] = useState({ fecha: "", valor: "" });
  const { toast } = useToast();

  const resetForm = (item?: TasaDolar | null) => {
    setFormData({
      fecha: item?.fecha || "",
      valor: item?.valor?.toString() || "",
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: { fecha: string; valor: number }) => apiRequest("POST", "/api/tasas-dolar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasas-dolar"] });
      setDialogOpen(false);
      toast({ title: "Tasa creada" });
    },
    onError: () => toast({ title: "Error al crear", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fecha: string; valor: number } }) =>
      apiRequest("PUT", `/api/tasas-dolar/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasas-dolar"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Tasa actualizada" });
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
    <Card>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Tasas de Dólar</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => openDialog()} data-testid="button-add-dolar">
              <Plus className="h-4 w-4 mr-1" /> Agregar
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
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasasDolar.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.fecha}</TableCell>
                <TableCell>{t.valor?.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(t)} data-testid={`button-edit-dolar-${t.id}`}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-delete-dolar-${t.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
