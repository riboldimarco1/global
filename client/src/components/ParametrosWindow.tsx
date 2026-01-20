import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Edit2, Trash2, Search, X, Settings, Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import type { UnidadProduccion, Actividad, Cliente, Insumo, Personal, Producto, Proveedor, Banco, OperacionBancaria, TasaDolar } from "@shared/schema";

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
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 h-full w-8 hover:bg-transparent">
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

interface Filters {
  nombre: string;
  habilitado: "todos" | "activo" | "inactivo";
}

export default function ParametrosWindow() {
  const [activeTab, setActiveTab] = useState("unidades");
  const [filters, setFilters] = useState<Filters>({ nombre: "", habilitado: "todos" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
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

  const clearFilters = () => setFilters({ nombre: "", habilitado: "todos" });
  const hasActiveFilters = filters.nombre !== "" || filters.habilitado !== "todos";

  const applyFilters = <T extends { nombre: string; habilitado: boolean }>(data: T[]): T[] => {
    return data.filter(item => {
      if (filters.nombre && !item.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
      if (filters.habilitado === "activo" && !item.habilitado) return false;
      if (filters.habilitado === "inactivo" && item.habilitado) return false;
      return true;
    });
  };

  const getUnidadName = (id: string | null) => unidades.find(u => u.id === id)?.nombre || "-";

  const openAddDialog = (type: string) => {
    setDialogType(type);
    setEditingRecord(null);
    setFormData({ nombre: "", habilitado: true, unidadId: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (type: string, record: any) => {
    setDialogType(type);
    setEditingRecord(record);
    setFormData({ ...record });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    const endpoints: Record<string, string> = {
      unidad: "/api/unidades-produccion",
      actividad: "/api/actividades",
      cliente: "/api/clientes",
      insumo: "/api/insumos",
      personal: "/api/personal",
      producto: "/api/productos",
      proveedor: "/api/proveedores",
      banco: "/api/bancos",
      operacion: "/api/operaciones-bancarias",
      tasa: "/api/tasas-dolar",
    };

    try {
      if (editingRecord) {
        await apiRequest("PATCH", `${endpoints[dialogType]}/${editingRecord.id}`, formData);
        toast({ title: "Registro actualizado" });
      } else {
        await apiRequest("POST", endpoints[dialogType], formData);
        toast({ title: "Registro creado" });
      }
      queryClient.invalidateQueries({ queryKey: [endpoints[dialogType]] });
      setDialogOpen(false);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDelete = async (type: string, id: string) => {
    const endpoints: Record<string, string> = {
      unidad: "/api/unidades-produccion",
      actividad: "/api/actividades",
      cliente: "/api/clientes",
      insumo: "/api/insumos",
      personal: "/api/personal",
      producto: "/api/productos",
      proveedor: "/api/proveedores",
      banco: "/api/bancos",
      operacion: "/api/operaciones-bancarias",
      tasa: "/api/tasas-dolar",
    };

    try {
      await apiRequest("DELETE", `${endpoints[type]}/${id}`);
      queryClient.invalidateQueries({ queryKey: [endpoints[type]] });
      toast({ title: "Registro eliminado" });
    } catch (error) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const toggleHabilitado = async (type: string, id: string, current: boolean) => {
    const endpoints: Record<string, string> = {
      unidad: "/api/unidades-produccion",
      actividad: "/api/actividades",
      cliente: "/api/clientes",
      insumo: "/api/insumos",
      personal: "/api/personal",
      producto: "/api/productos",
      proveedor: "/api/proveedores",
      banco: "/api/bancos",
      operacion: "/api/operaciones-bancarias",
    };

    try {
      await apiRequest("PATCH", `${endpoints[type]}/${id}`, { habilitado: !current });
      queryClient.invalidateQueries({ queryKey: [endpoints[type]] });
      toast({ title: "Estado actualizado" });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const ActionButtons = ({ type, item }: { type: string; item: any }) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(type, item)}>
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(type, item.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const StatusBadge = ({ habilitado, type, id }: { habilitado: boolean; type: string; id: string }) => (
    <Badge 
      variant={habilitado ? "default" : "secondary"} 
      className="cursor-pointer text-[10px] px-1.5"
      onClick={() => toggleHabilitado(type, id, habilitado)}
    >
      {habilitado ? "Activo" : "Inactivo"}
    </Badge>
  );

  const SimpleTable = ({ type, data, showUnidad = false }: { type: string; data: any[]; showUnidad?: boolean }) => (
    <ScrollArea className="w-full h-[300px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Acciones</TableHead>
            <TableHead>Nombre</TableHead>
            {showUnidad && <TableHead>Unidad</TableHead>}
            <TableHead className="w-[80px]">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applyFilters(data).map((item) => (
            <TableRow key={item.id}>
              <TableCell><ActionButtons type={type} item={item} /></TableCell>
              <TableCell>{item.nombre}</TableCell>
              {showUnidad && <TableCell>{getUnidadName(item.unidadId)}</TableCell>}
              <TableCell><StatusBadge habilitado={item.habilitado} type={type} id={item.id} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const TasasDolarTable = () => {
    const filteredTasas = tasasDolar.filter(t => 
      !filters.nombre || t.fecha.includes(filters.nombre)
    );
    
    const formatDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    };

    return (
      <ScrollArea className="w-full h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasas.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      setDialogType("tasa");
                      setEditingRecord(t);
                      setFormData({ fecha: t.fecha, valor: t.valor.toString() });
                      setDialogOpen(true);
                    }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete("tasa", t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{formatDate(t.fecha)}</TableCell>
                <TableCell className="text-right font-mono">{t.valor.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 space-y-3 overflow-auto flex-1">
        <Card>
          <CardHeader className="py-2 px-3 border-b">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Search className="h-3 w-3" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar..."
                value={filters.nombre}
                onChange={(e) => setFilters(f => ({ ...f, nombre: e.target.value }))}
                className="h-7 text-xs flex-1"
              />
              <Select value={filters.habilitado} onValueChange={(v: any) => setFilters(f => ({ ...f, habilitado: v }))}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <ScrollArea className="flex-1">
                  <TabsList className="inline-flex h-7 items-center rounded-md bg-muted p-0.5 text-muted-foreground">
                    <TabsTrigger value="unidades" className="px-2 text-[10px] h-6">Unidades</TabsTrigger>
                    <TabsTrigger value="actividades" className="px-2 text-[10px] h-6">Actividades</TabsTrigger>
                    <TabsTrigger value="clientes" className="px-2 text-[10px] h-6">Clientes</TabsTrigger>
                    <TabsTrigger value="insumos" className="px-2 text-[10px] h-6">Insumos</TabsTrigger>
                    <TabsTrigger value="personal" className="px-2 text-[10px] h-6">Personal</TabsTrigger>
                    <TabsTrigger value="productos" className="px-2 text-[10px] h-6">Productos</TabsTrigger>
                    <TabsTrigger value="proveedores" className="px-2 text-[10px] h-6">Proveedores</TabsTrigger>
                    <TabsTrigger value="bancos" className="px-2 text-[10px] h-6">Bancos</TabsTrigger>
                    <TabsTrigger value="operaciones" className="px-2 text-[10px] h-6">Operaciones</TabsTrigger>
                    <TabsTrigger value="dolar" className="px-2 text-[10px] h-6">Dólar</TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <Button 
                  size="sm" 
                  className="h-6 text-xs shrink-0" 
                  onClick={() => {
                    const typeMap: Record<string, string> = {
                      unidades: "unidad",
                      actividades: "actividad",
                      clientes: "cliente",
                      insumos: "insumo",
                      personal: "personal",
                      productos: "producto",
                      proveedores: "proveedor",
                      bancos: "banco",
                      operaciones: "operacion",
                      dolar: "tasa",
                    };
                    if (activeTab === "dolar") {
                      setDialogType("tasa");
                      setEditingRecord(null);
                      setFormData({ fecha: new Date().toISOString().split("T")[0], valor: "" });
                      setDialogOpen(true);
                    } else {
                      openAddDialog(typeMap[activeTab]);
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>

              <TabsContent value="unidades" className="mt-0">
                <SimpleTable type="unidad" data={unidades} />
              </TabsContent>
              <TabsContent value="actividades" className="mt-0">
                <SimpleTable type="actividad" data={actividades} showUnidad />
              </TabsContent>
              <TabsContent value="clientes" className="mt-0">
                <SimpleTable type="cliente" data={clientes} showUnidad />
              </TabsContent>
              <TabsContent value="insumos" className="mt-0">
                <SimpleTable type="insumo" data={insumos} showUnidad />
              </TabsContent>
              <TabsContent value="personal" className="mt-0">
                <SimpleTable type="personal" data={personal} showUnidad />
              </TabsContent>
              <TabsContent value="productos" className="mt-0">
                <SimpleTable type="producto" data={productos} showUnidad />
              </TabsContent>
              <TabsContent value="proveedores" className="mt-0">
                <SimpleTable type="proveedor" data={proveedores} showUnidad />
              </TabsContent>
              <TabsContent value="bancos" className="mt-0">
                <SimpleTable type="banco" data={bancos} />
              </TabsContent>
              <TabsContent value="operaciones" className="mt-0">
                <SimpleTable type="operacion" data={operaciones} />
              </TabsContent>
              <TabsContent value="dolar" className="mt-0">
                <TasasDolarTable />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "Editar" : "Agregar"} {dialogType === "tasa" ? "Tasa de Dólar" : dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            {dialogType === "tasa" ? (
              <>
                <div>
                  <Label className="text-xs">Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha || ""}
                    onChange={(e) => setFormData(f => ({ ...f, fecha: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <CalculatorInput
                    value={formData.valor || ""}
                    onChange={(v) => setFormData(f => ({ ...f, valor: v }))}
                    placeholder="0.00"
                    testId="input-tasa-valor"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    value={formData.nombre || ""}
                    onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))}
                    className="h-8"
                  />
                </div>
                {["actividad", "cliente", "insumo", "personal", "producto", "proveedor"].includes(dialogType) && (
                  <div>
                    <Label className="text-xs">Unidad de Producción</Label>
                    <Select 
                      value={formData.unidadId || ""} 
                      onValueChange={(v) => setFormData(f => ({ ...f, unidadId: v }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.filter(u => u.habilitado).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {dialogType === "operacion" && (
                  <div>
                    <Label className="text-xs">Operador</Label>
                    <Select 
                      value={formData.operador || "suma"} 
                      onValueChange={(v) => setFormData(f => ({ ...f, operador: v }))}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suma">Suma (+)</SelectItem>
                        <SelectItem value="resta">Resta (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.habilitado ?? true}
                    onCheckedChange={(v) => setFormData(f => ({ ...f, habilitado: v }))}
                  />
                  <Label className="text-xs">Habilitado</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
