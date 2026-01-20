import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Edit2, Trash2, Search, X, Copy, ChevronLeft, ChevronRight, Calculator, ArrowLeft } from "lucide-react";
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
        <PopoverContent className="w-56 p-2 z-[9999]" align="end">
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

const ITEMS_PER_PAGE = 10;

export default function ParametrosWindow() {
  const [activeTab, setActiveTab] = useState("unidades");
  const [filters, setFilters] = useState<Filters>({ nombre: "", habilitado: "todos" });
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
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

  const clearFilters = () => {
    setFilters({ nombre: "", habilitado: "todos" });
    setCurrentPage(1);
  };
  const hasActiveFilters = filters.nombre !== "" || filters.habilitado !== "todos";

  const applyFilters = <T extends { nombre?: string; habilitado?: boolean }>(data: T[]): T[] => {
    return data.filter(item => {
      if (filters.nombre && item.nombre && !item.nombre.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
      if (filters.habilitado === "activo" && item.habilitado === false) return false;
      if (filters.habilitado === "inactivo" && item.habilitado !== false) return false;
      return true;
    });
  };

  const paginate = <T,>(data: T[]): { items: T[]; totalPages: number; total: number; effectivePage: number } => {
    const total = data.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
    const effectivePage = Math.min(currentPage, totalPages);
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return { items: data.slice(start, start + ITEMS_PER_PAGE), totalPages, total, effectivePage };
  };

  const getUnidadName = (id: string | null | undefined) => unidades.find(u => u.id === id)?.nombre || "-";

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

  const openAddForm = () => {
    const type = typeMap[activeTab];
    setEditingRecord(null);
    if (type === "tasa") {
      setFormData({ fecha: new Date().toISOString().split("T")[0], valor: "" });
    } else {
      setFormData({ nombre: "", habilitado: true, unidadProduccionId: "", descripcion: "", rif: "", numeroCuenta: "", correo: "", telefono: "", operador: "suma", color: "#3b82f6", orden: 0 });
    }
    setShowForm(true);
  };

  const openEditForm = (record: any) => {
    setEditingRecord(record);
    setFormData({ ...record, valor: record.valor?.toString() || "" });
    setShowForm(true);
  };

  const openCopyForm = (record: any) => {
    setEditingRecord(null);
    const { id, ...rest } = record;
    setFormData({ ...rest, nombre: `${rest.nombre} (copia)`, valor: rest.valor?.toString() || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    const type = typeMap[activeTab];
    if (type !== "tasa" && !formData.nombre) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }
    if (type === "tasa" && (!formData.fecha || !formData.valor)) {
      toast({ title: "Fecha y valor son requeridos", variant: "destructive" });
      return;
    }

    const dataToSend = { ...formData };
    if (type === "tasa") {
      dataToSend.valor = parseFloat(formData.valor);
    }

    try {
      if (editingRecord) {
        await apiRequest("PATCH", `${endpoints[type]}/${editingRecord.id}`, dataToSend);
        toast({ title: "Registro actualizado" });
      } else {
        await apiRequest("POST", endpoints[type], dataToSend);
        toast({ title: "Registro creado" });
      }
      queryClient.invalidateQueries({ queryKey: [endpoints[type]] });
      setShowForm(false);
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleDelete = async (type: string, id: string) => {
    try {
      await apiRequest("DELETE", `${endpoints[type]}/${id}`);
      queryClient.invalidateQueries({ queryKey: [endpoints[type]] });
      toast({ title: "Registro eliminado" });
    } catch (error) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const toggleHabilitado = async (type: string, id: string, current: boolean) => {
    try {
      await apiRequest("PATCH", `${endpoints[type]}/${id}`, { habilitado: !current });
      queryClient.invalidateQueries({ queryKey: [endpoints[type]] });
      toast({ title: "Estado actualizado" });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const ActionButtons = ({ type, item }: { type: string; item: any }) => (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditForm(item)} data-testid={`btn-edit-${item.id}`}>
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCopyForm(item)} data-testid={`btn-copy-${item.id}`}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(type, item.id)} data-testid={`btn-delete-${item.id}`}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const StatusBadge = ({ habilitado, type, id }: { habilitado: boolean; type: string; id: string }) => (
    <Badge 
      variant={habilitado ? "default" : "secondary"} 
      className="cursor-pointer text-[10px] px-1.5"
      onClick={() => toggleHabilitado(type, id, habilitado)}
      data-testid={`badge-status-${id}`}
    >
      {habilitado ? "Activo" : "Inactivo"}
    </Badge>
  );

  const Pagination = ({ totalPages, total, effectivePage }: { totalPages: number; total: number; effectivePage: number }) => (
    <div className="flex items-center justify-between px-2 py-1.5 border-t text-xs text-muted-foreground">
      <span data-testid="text-record-count">{total} registros</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={effectivePage === 1} onClick={() => setCurrentPage(effectivePage - 1)} data-testid="btn-page-prev">
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span data-testid="text-page-info">{effectivePage} / {totalPages}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(effectivePage + 1)} data-testid="btn-page-next">
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  const UnidadesTable = () => {
    const filtered = applyFilters(unidades);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RIF</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[60px]">Color</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="unidad" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.rif || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{item.descripcion || "-"}</TableCell>
                    <TableCell><div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} /></TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="unidad" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const ActividadesTable = () => {
    const filtered = applyFilters(actividades);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="actividad" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{item.descripcion || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="actividad" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const ClientesTable = () => {
    const filtered = applyFilters(clientes);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>RIF</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="cliente" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell>{item.rif || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{item.descripcion || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="cliente" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const InsumosTable = () => {
    const filtered = applyFilters(insumos);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="insumo" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{item.descripcion || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="insumo" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const PersonalTable = () => {
    const filtered = applyFilters(personal);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>RIF</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Nro. Cuenta</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="personal" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell>{item.rif || "-"}</TableCell>
                    <TableCell>{item.telefono || "-"}</TableCell>
                    <TableCell className="text-xs">{item.correo || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.numeroCuenta || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="personal" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const ProductosTable = () => {
    const filtered = applyFilters(productos);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="producto" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{item.descripcion || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="producto" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const ProveedoresTable = () => {
    const filtered = applyFilters(proveedores);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Nro. Cuenta</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="proveedor" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{getUnidadName(item.unidadProduccionId)}</TableCell>
                    <TableCell>{item.telefono || "-"}</TableCell>
                    <TableCell className="text-xs">{item.correo || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.numeroCuenta || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="proveedor" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const BancosTable = () => {
    const filtered = applyFilters(bancos);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nro. Cuenta</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="banco" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{item.numeroCuenta || "-"}</TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="banco" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const OperacionesTable = () => {
    const filtered = applyFilters(operaciones);
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><ActionButtons type="operacion" item={item} /></TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={item.operador === "suma" ? "default" : "destructive"}>
                        {item.operador === "suma" ? "+ Suma" : "- Resta"}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge habilitado={item.habilitado} type="operacion" id={item.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const TasasDolarTable = () => {
    const filtered = tasasDolar.filter(t => !filters.nombre || t.fecha.includes(filters.nombre));
    const { items, totalPages, total, effectivePage } = paginate(filtered);
    const formatDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y.slice(-2)}`;
    };
    return (
      <>
        <ScrollArea className="w-full h-[280px]">
          <div className="min-w-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditForm(t)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCopyForm(t)}>
                          <Copy className="h-3 w-3" />
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
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Pagination totalPages={totalPages} total={total} effectivePage={effectivePage} />
      </>
    );
  };

  const currentType = typeMap[activeTab];

  const renderForm = () => {
    if (currentType === "tasa") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="date" value={formData.fecha || ""} onChange={(e) => setFormData(f => ({ ...f, fecha: e.target.value }))} className="h-8" data-testid="input-fecha" />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <CalculatorInput value={formData.valor || ""} onChange={(v) => setFormData(f => ({ ...f, valor: v }))} placeholder="0.00" testId="input-tasa-valor" />
          </div>
        </div>
      );
    }

    const showUnidad = ["actividad", "cliente", "insumo", "personal", "producto", "proveedor"].includes(currentType);
    const showRif = ["unidad", "cliente", "personal"].includes(currentType);
    const showContacto = ["personal", "proveedor"].includes(currentType);
    const showCuenta = ["personal", "proveedor", "banco"].includes(currentType);
    const showDescripcion = ["unidad", "actividad", "cliente", "insumo", "personal", "producto", "proveedor"].includes(currentType);
    const showOperador = currentType === "operacion";
    const showColor = currentType === "unidad";

    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nombre *</Label>
          <Input value={formData.nombre || ""} onChange={(e) => setFormData(f => ({ ...f, nombre: e.target.value }))} className="h-8" data-testid="input-nombre" />
        </div>

        {showUnidad && (
          <div>
            <Label className="text-xs">Unidad de Producción</Label>
            <Select value={formData.unidadProduccionId || ""} onValueChange={(v) => setFormData(f => ({ ...f, unidadProduccionId: v }))}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                {unidades.filter(u => u.habilitado).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showRif && (
          <div>
            <Label className="text-xs">RIF</Label>
            <Input value={formData.rif || ""} onChange={(e) => setFormData(f => ({ ...f, rif: e.target.value }))} placeholder="V-12345678-9" className="h-8" />
          </div>
        )}

        {showContacto && (
          <>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input value={formData.telefono || ""} onChange={(e) => setFormData(f => ({ ...f, telefono: e.target.value }))} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Correo</Label>
              <Input type="email" value={formData.correo || ""} onChange={(e) => setFormData(f => ({ ...f, correo: e.target.value }))} className="h-8" />
            </div>
          </>
        )}

        {showCuenta && (
          <div>
            <Label className="text-xs">Número de Cuenta</Label>
            <Input value={formData.numeroCuenta || ""} onChange={(e) => setFormData(f => ({ ...f, numeroCuenta: e.target.value }))} className="h-8" />
          </div>
        )}

        {showDescripcion && (
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input value={formData.descripcion || ""} onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))} className="h-8" />
          </div>
        )}

        {showOperador && (
          <div>
            <Label className="text-xs">Operador</Label>
            <Select value={formData.operador || "suma"} onValueChange={(v) => setFormData(f => ({ ...f, operador: v }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                <SelectItem value="suma">Suma (+)</SelectItem>
                <SelectItem value="resta">Resta (-)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {showColor && (
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex items-center gap-2">
              <Input type="color" value={formData.color || "#3b82f6"} onChange={(e) => setFormData(f => ({ ...f, color: e.target.value }))} className="h-8 w-12 p-1" />
              <span className="text-xs text-muted-foreground">{formData.color || "#3b82f6"}</span>
            </div>
          </div>
        )}

        {currentType !== "tasa" && (
          <div className="flex items-center gap-2">
            <Switch checked={formData.habilitado ?? true} onCheckedChange={(v) => setFormData(f => ({ ...f, habilitado: v }))} />
            <Label className="text-xs">Habilitado</Label>
          </div>
        )}
      </div>
    );
  };

  if (showForm) {
    return (
      <div className="h-full flex flex-col p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-7" data-testid="btn-form-back">
            <ArrowLeft className="h-3 w-3 mr-1" /> Volver
          </Button>
          <span className="text-sm font-medium">
            {editingRecord ? "Editar" : "Agregar"} {currentType === "tasa" ? "Tasa de Dólar" : currentType.charAt(0).toUpperCase() + currentType.slice(1)}
          </span>
        </div>
        <Card className="flex-1">
          <CardContent className="p-3">
            {renderForm()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} data-testid="btn-form-cancel">Cancelar</Button>
              <Button size="sm" onClick={handleSave} data-testid="btn-form-save">Guardar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                data-testid="input-search"
                value={filters.nombre}
                onChange={(e) => { setFilters(f => ({ ...f, nombre: e.target.value })); setCurrentPage(1); }}
                className="h-7 text-xs flex-1"
              />
              <Select value={filters.habilitado} onValueChange={(v: any) => { setFilters(f => ({ ...f, habilitado: v })); setCurrentPage(1); }}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
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
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
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
                <Button size="sm" className="h-6 text-xs shrink-0" onClick={openAddForm} data-testid="btn-add-record">
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>

              <TabsContent value="unidades" className="mt-0"><UnidadesTable /></TabsContent>
              <TabsContent value="actividades" className="mt-0"><ActividadesTable /></TabsContent>
              <TabsContent value="clientes" className="mt-0"><ClientesTable /></TabsContent>
              <TabsContent value="insumos" className="mt-0"><InsumosTable /></TabsContent>
              <TabsContent value="personal" className="mt-0"><PersonalTable /></TabsContent>
              <TabsContent value="productos" className="mt-0"><ProductosTable /></TabsContent>
              <TabsContent value="proveedores" className="mt-0"><ProveedoresTable /></TabsContent>
              <TabsContent value="bancos" className="mt-0"><BancosTable /></TabsContent>
              <TabsContent value="operaciones" className="mt-0"><OperacionesTable /></TabsContent>
              <TabsContent value="dolar" className="mt-0"><TasasDolarTable /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
