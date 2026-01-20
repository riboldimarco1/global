import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus, Edit2, Trash2, Search, X, Building2, Landmark, Filter, DollarSign, Calculator, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useToast } from "@/hooks/use-toast";

const FORMAS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Pago Móvil",
  "Zelle",
  "Otro",
];

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

import type { UnidadProduccion, Banco, Proveedor, Insumo, Actividad, Personal, Cliente, Producto, OperacionBancaria, Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, MovimientoBancario } from "@shared/schema";

interface AdministracionProps {
  onBack: () => void;
  onLogout: () => void;
}

type AdminFilters = {
  nombre: string;
  fechaDesde: string;
  fechaHasta: string;
  relacionado: "todos" | "si" | "no";
  anticipo: "todos" | "si" | "no";
  utility: "todos" | "si" | "no";
  evidenciado: "todos" | "si" | "no";
};

const defaultFilters: AdminFilters = {
  nombre: "",
  fechaDesde: "",
  fechaHasta: "",
  relacionado: "todos",
  anticipo: "todos",
  utility: "todos",
  evidenciado: "todos",
};

export default function Administracion({ onBack, onLogout }: AdministracionProps) {
  const { toast } = useToast();
  
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>("");
  const [selectedBancoId, setSelectedBancoId] = useState<string>("");
  const [adminTab, setAdminTab] = useState("gastos");
  const [adminFilters, setAdminFilters] = useState<AdminFilters>(defaultFilters);
  const [bancoFilters, setBancoFilters] = useState<AdminFilters>(defaultFilters);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"gasto" | "nomina" | "venta" | "cuenta_cobrar" | "cuenta_pagar" | "prestamo" | "movimiento">("gasto");
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedorId: "",
    insumoId: "",
    actividadId: "",
    personalId: "",
    clienteId: "",
    productoId: "",
    operacionId: "",
    cantidad: "",
    monto: "",
    montoDolares: "",
    formaPago: "",
    comprobante: "",
    descripcion: "",
    relacionado: false,
    anticipo: false,
    utility: false,
    evidenciado: false,
  });

  const resetFormData = () => {
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      proveedorId: "",
      insumoId: "",
      actividadId: "",
      personalId: "",
      clienteId: "",
      productoId: "",
      operacionId: "",
      cantidad: "",
      monto: "",
      montoDolares: "",
      formaPago: "",
      comprobante: "",
      descripcion: "",
      relacionado: false,
      anticipo: false,
      utility: false,
      evidenciado: false,
    });
  };

  const openAddDialog = (type: typeof dialogType) => {
    resetFormData();
    setDialogType(type);
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openAddAdminDialog = () => {
    const typeMap: Record<string, typeof dialogType> = {
      gastos: "gasto",
      nomina: "nomina",
      ventas: "venta",
      cuentas_cobrar: "cuenta_cobrar",
      cuentas_pagar: "cuenta_pagar",
      prestamos: "prestamo",
    };
    openAddDialog(typeMap[adminTab] || "gasto");
  };

  const openAddBancoDialog = () => {
    openAddDialog("movimiento");
  };

  const { data: unidades = [] } = useQuery<UnidadProduccion[]>({ queryKey: ["/api/unidades-produccion"] });
  const { data: bancos = [] } = useQuery<Banco[]>({ queryKey: ["/api/bancos"] });
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ["/api/proveedores"] });
  const { data: insumos = [] } = useQuery<Insumo[]>({ queryKey: ["/api/insumos"] });
  const { data: actividades = [] } = useQuery<Actividad[]>({ queryKey: ["/api/actividades"] });
  const { data: personalList = [] } = useQuery<Personal[]>({ queryKey: ["/api/personal"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ["/api/productos"] });
  const { data: operaciones = [] } = useQuery<OperacionBancaria[]>({ queryKey: ["/api/operaciones-bancarias"] });

  const { data: gastos = [] } = useQuery<Gasto[]>({ 
    queryKey: ["/api/administracion/gastos", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/gastos${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: nominas = [] } = useQuery<Nomina[]>({ 
    queryKey: ["/api/administracion/nominas", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/nominas${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: ventas = [] } = useQuery<Venta[]>({ 
    queryKey: ["/api/administracion/ventas", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/ventas${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: cuentasCobrar = [] } = useQuery<CuentaCobrar[]>({ 
    queryKey: ["/api/administracion/cuentas-cobrar", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/cuentas-cobrar${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: cuentasPagar = [] } = useQuery<CuentaPagar[]>({ 
    queryKey: ["/api/administracion/cuentas-pagar", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/cuentas-pagar${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: prestamos = [] } = useQuery<Prestamo[]>({ 
    queryKey: ["/api/administracion/prestamos", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/prestamos${selectedUnidadId ? `?unidadId=${selectedUnidadId}` : ""}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: movimientos = [] } = useQuery<MovimientoBancario[]>({ 
    queryKey: ["/api/administracion/movimientos-bancarios", selectedBancoId],
    queryFn: () => fetch(`/api/administracion/movimientos-bancarios${selectedBancoId ? `?bancoId=${selectedBancoId}` : ""}`).then(r => r.json()),
    enabled: !!selectedBancoId,
  });

  const createGastoMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/gastos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/gastos"] });
      setDialogOpen(false);
      toast({ title: "Gasto creado exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating gasto:", error);
      toast({ title: "Error al crear gasto", variant: "destructive" });
    },
  });

  const createNominaMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/nominas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/nominas"] });
      setDialogOpen(false);
      toast({ title: "Nómina creada exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating nomina:", error);
      toast({ title: "Error al crear nómina", variant: "destructive" });
    },
  });

  const createVentaMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/ventas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/ventas"] });
      setDialogOpen(false);
      toast({ title: "Venta creada exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating venta:", error);
      toast({ title: "Error al crear venta", variant: "destructive" });
    },
  });

  const createCuentaCobrarMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/cuentas-cobrar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentas-cobrar"] });
      setDialogOpen(false);
      toast({ title: "Cuenta por cobrar creada exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating cuenta por cobrar:", error);
      toast({ title: "Error al crear cuenta por cobrar", variant: "destructive" });
    },
  });

  const createCuentaPagarMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/cuentas-pagar", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/cuentas-pagar"] });
      setDialogOpen(false);
      toast({ title: "Cuenta por pagar creada exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating cuenta por pagar:", error);
      toast({ title: "Error al crear cuenta por pagar", variant: "destructive" });
    },
  });

  const createPrestamoMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/prestamos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/prestamos"] });
      setDialogOpen(false);
      toast({ title: "Préstamo creado exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating prestamo:", error);
      toast({ title: "Error al crear préstamo", variant: "destructive" });
    },
  });

  const createMovimientoMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/administracion/movimientos-bancarios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
      setDialogOpen(false);
      toast({ title: "Movimiento bancario creado exitosamente" });
    },
    onError: (error: any) => {
      console.error("Error creating movimiento:", error);
      toast({ title: "Error al crear movimiento", variant: "destructive" });
    },
  });

  const handleSaveRecord = () => {
    console.log("handleSaveRecord called", { dialogType, formData, selectedUnidadId, selectedBancoId });
    
    const baseData = {
      fecha: formData.fecha,
      monto: parseFloat(formData.monto) || 0,
      montoDolares: parseFloat(formData.montoDolares) || 0,
      formaPago: formData.formaPago || "",
      comprobante: formData.comprobante || "",
      descripcion: formData.descripcion || "",
      relacionado: formData.relacionado,
      anticipo: formData.anticipo,
      utility: formData.utility,
      evidenciado: formData.evidenciado,
    };

    switch (dialogType) {
      case "gasto":
        createGastoMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          proveedorId: formData.proveedorId || null,
          insumoId: formData.insumoId || null,
          actividadId: formData.actividadId || null,
          cantidad: formData.cantidad ? parseFloat(formData.cantidad) : null,
        });
        break;
      case "nomina":
        createNominaMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          personalId: formData.personalId || null,
          actividadId: formData.actividadId || null,
        });
        break;
      case "venta":
        createVentaMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          clienteId: formData.clienteId || null,
          productoId: formData.productoId || null,
          cantidad: formData.cantidad ? parseFloat(formData.cantidad) : null,
        });
        break;
      case "cuenta_cobrar":
        createCuentaCobrarMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          clienteId: formData.clienteId || null,
          productoId: formData.productoId || null,
          cantidad: formData.cantidad ? parseFloat(formData.cantidad) : null,
        });
        break;
      case "cuenta_pagar":
        createCuentaPagarMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          proveedorId: formData.proveedorId || null,
          insumoId: formData.insumoId || null,
          actividadId: formData.actividadId || null,
          cantidad: formData.cantidad ? parseFloat(formData.cantidad) : null,
        });
        break;
      case "prestamo":
        createPrestamoMutation.mutate({
          ...baseData,
          unidadProduccionId: selectedUnidadId,
          personalId: formData.personalId || null,
          actividadId: formData.actividadId || null,
        });
        break;
      case "movimiento":
        createMovimientoMutation.mutate({
          ...baseData,
          bancoId: selectedBancoId,
          operacionId: formData.operacionId || null,
        });
        break;
    }
  };

  const getDialogTitle = () => {
    const titles: Record<typeof dialogType, string> = {
      gasto: "Agregar Gasto",
      nomina: "Agregar Nómina",
      venta: "Agregar Venta",
      cuenta_cobrar: "Agregar Cuenta por Cobrar",
      cuenta_pagar: "Agregar Cuenta por Pagar",
      prestamo: "Agregar Préstamo",
      movimiento: "Agregar Movimiento Bancario",
    };
    return titles[dialogType];
  };

  useEffect(() => {
    const enabledUnidades = unidades.filter(u => u.habilitado);
    if (enabledUnidades.length > 0 && !selectedUnidadId) {
      setSelectedUnidadId(enabledUnidades[0].id);
    }
  }, [unidades, selectedUnidadId]);

  useEffect(() => {
    const enabledBancos = bancos.filter(b => b.habilitado);
    if (enabledBancos.length > 0 && !selectedBancoId) {
      setSelectedBancoId(enabledBancos[0].id);
    }
  }, [bancos, selectedBancoId]);

  const clearAdminFilters = () => setAdminFilters(defaultFilters);
  const clearBancoFilters = () => setBancoFilters(defaultFilters);

  const hasAdminFilters = !!(adminFilters.nombre || adminFilters.fechaDesde || adminFilters.fechaHasta || 
    adminFilters.relacionado !== "todos" || adminFilters.anticipo !== "todos" || 
    adminFilters.utility !== "todos" || adminFilters.evidenciado !== "todos");

  const hasBancoFilters = !!(bancoFilters.nombre || bancoFilters.fechaDesde || bancoFilters.fechaHasta || 
    bancoFilters.relacionado !== "todos" || bancoFilters.anticipo !== "todos" || 
    bancoFilters.utility !== "todos" || bancoFilters.evidenciado !== "todos");

  const applyFilters = <T extends { fecha: string; descripcion?: string | null; relacionado: boolean; anticipo: boolean; utility: boolean; evidenciado: boolean }>(
    records: T[], 
    filters: AdminFilters
  ): T[] => {
    return records.filter(r => {
      if (filters.nombre && r.descripcion && !r.descripcion.toLowerCase().includes(filters.nombre.toLowerCase())) return false;
      if (filters.fechaDesde && r.fecha < filters.fechaDesde) return false;
      if (filters.fechaHasta && r.fecha > filters.fechaHasta) return false;
      if (filters.relacionado === "si" && !r.relacionado) return false;
      if (filters.relacionado === "no" && r.relacionado) return false;
      if (filters.anticipo === "si" && !r.anticipo) return false;
      if (filters.anticipo === "no" && r.anticipo) return false;
      if (filters.utility === "si" && !r.utility) return false;
      if (filters.utility === "no" && r.utility) return false;
      if (filters.evidenciado === "si" && !r.evidenciado) return false;
      if (filters.evidenciado === "no" && r.evidenciado) return false;
      return true;
    });
  };

  const selectedUnidad = unidades.find(u => u.id === selectedUnidadId);
  const selectedBanco = bancos.find(b => b.id === selectedBancoId);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const getProveedorName = (id: string | null) => proveedores.find(p => p.id === id)?.nombre || "-";
  const getInsumoName = (id: string | null) => insumos.find(i => i.id === id)?.nombre || "-";
  const getActividadName = (id: string | null) => actividades.find(a => a.id === id)?.nombre || "-";
  const getPersonalName = (id: string | null) => personalList.find(p => p.id === id)?.nombre || "-";
  const getClienteName = (id: string | null) => clientes.find(c => c.id === id)?.nombre || "-";
  const getProductoName = (id: string | null) => productos.find(p => p.id === id)?.nombre || "-";
  const getOperacionName = (id: string | null) => operaciones.find(o => o.id === id)?.nombre || "-";

  const FilterCard = ({ filters, setFilters, hasFilters, clearFilters, title }: {
    filters: AdminFilters;
    setFilters: (f: AdminFilters | ((prev: AdminFilters) => AdminFilters)) => void;
    hasFilters: boolean;
    clearFilters: () => void;
    title: string;
  }) => (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="py-2 px-4 border-b bg-muted/30">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Filter className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input
              placeholder="Buscar..."
              value={filters.nombre}
              onChange={(e) => setFilters(f => ({ ...f, nombre: e.target.value }))}
              className="h-8 text-sm"
              data-testid="input-filter-descripcion"
            />
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={filters.fechaDesde}
              onChange={(e) => setFilters(f => ({ ...f, fechaDesde: e.target.value }))}
              className="h-8 text-sm"
              data-testid="input-filter-fecha-desde"
            />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => setFilters(f => ({ ...f, fechaHasta: e.target.value }))}
              className="h-8 text-sm"
              data-testid="input-filter-fecha-hasta"
            />
          </div>
          <div className="flex items-end gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8" data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-2">
          <div>
            <Label className="text-xs">Relacionado</Label>
            <Select value={filters.relacionado} onValueChange={(v: "todos" | "si" | "no") => setFilters(f => ({ ...f, relacionado: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Anticipo</Label>
            <Select value={filters.anticipo} onValueChange={(v: "todos" | "si" | "no") => setFilters(f => ({ ...f, anticipo: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Utility</Label>
            <Select value={filters.utility} onValueChange={(v: "todos" | "si" | "no") => setFilters(f => ({ ...f, utility: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Evidenciado</Label>
            <Select value={filters.evidenciado} onValueChange={(v: "todos" | "si" | "no") => setFilters(f => ({ ...f, evidenciado: v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const BooleanIndicator = ({ value }: { value: boolean }) => (
    <span className={`inline-block w-4 h-4 rounded-full ${value ? "bg-green-500" : "bg-gray-300"}`} />
  );

  const ActionButtons = ({ onCopy, onEdit, onDelete, testIdPrefix }: { onCopy: () => void; onEdit: () => void; onDelete: () => void; testIdPrefix: string }) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy} data-testid={`${testIdPrefix}-copy`}>
        <Copy className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} data-testid={`${testIdPrefix}-edit`}>
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={onDelete} data-testid={`${testIdPrefix}-delete`}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const GastosTable = () => {
    const filteredGastos = applyFilters(gastos, adminFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGastos.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredGastos.map(g => (
              <TableRow key={g.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`gasto-${g.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(g.fecha)}</TableCell>
                <TableCell>{getProveedorName(g.proveedorId)}</TableCell>
                <TableCell>{getInsumoName(g.insumoId)}</TableCell>
                <TableCell>{getActividadName(g.actividadId)}</TableCell>
                <TableCell className="text-right">{g.cantidad != null ? formatCurrency(g.cantidad) : "-"}</TableCell>
                <TableCell className="text-right">{formatCurrency(g.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(g.montoDolares)}</TableCell>
                <TableCell>{g.formaPago || "-"}</TableCell>
                <TableCell>{g.comprobante || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const NominasTable = () => {
    const filteredNominas = applyFilters(nominas, adminFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[900px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Personal</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNominas.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredNominas.map(n => (
              <TableRow key={n.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`nomina-${n.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(n.fecha)}</TableCell>
                <TableCell>{getPersonalName(n.personalId)}</TableCell>
                <TableCell>{getActividadName(n.actividadId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(n.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(n.montoDolares)}</TableCell>
                <TableCell>{n.formaPago || "-"}</TableCell>
                <TableCell>{n.comprobante || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const VentasTable = ({ data }: { data: Venta[] | CuentaCobrar[] }) => {
    const filteredData = applyFilters(data, adminFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[950px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredData.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`venta-${v.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(v.fecha)}</TableCell>
                <TableCell>{getClienteName(v.clienteId)}</TableCell>
                <TableCell>{getProductoName(v.productoId)}</TableCell>
                <TableCell className="text-right">{v.cantidad != null ? formatCurrency(v.cantidad) : "-"}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.montoDolares)}</TableCell>
                <TableCell>{v.formaPago || "-"}</TableCell>
                <TableCell>{v.comprobante || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const CuentasPagarTable = () => {
    const filteredCuentas = applyFilters(cuentasPagar, adminFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCuentas.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredCuentas.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`cuenta-pagar-${c.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(c.fecha)}</TableCell>
                <TableCell>{getProveedorName(c.proveedorId)}</TableCell>
                <TableCell>{getInsumoName(c.insumoId)}</TableCell>
                <TableCell>{getActividadName(c.actividadId)}</TableCell>
                <TableCell className="text-right">{c.cantidad != null ? formatCurrency(c.cantidad) : "-"}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.montoDolares)}</TableCell>
                <TableCell>{c.formaPago || "-"}</TableCell>
                <TableCell>{c.comprobante || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const PrestamosTable = () => {
    const filteredPrestamos = applyFilters(prestamos, adminFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[900px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Personal</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>F. Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPrestamos.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredPrestamos.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`prestamo-${p.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(p.fecha)}</TableCell>
                <TableCell>{getPersonalName(p.personalId)}</TableCell>
                <TableCell>{getActividadName(p.actividadId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.montoDolares)}</TableCell>
                <TableCell>{p.formaPago || "-"}</TableCell>
                <TableCell>{p.comprobante || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const MovimientosTable = () => {
    const filteredMovimientos = applyFilters(movimientos, bancoFilters);
    return (
      <ScrollArea className="h-[300px]">
        <div className="min-w-[850px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovimientos.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>
            ) : filteredMovimientos.map(m => (
              <TableRow key={m.id}>
                <TableCell>
                  <ActionButtons 
                    testIdPrefix={`movimiento-${m.id}`}
                    onCopy={() => toast({ title: "Copiado al portapapeles" })}
                    onEdit={() => toast({ title: "Editar registro" })}
                    onDelete={() => toast({ title: "Eliminar registro" })}
                  />
                </TableCell>
                <TableCell>{formatDate(m.fecha)}</TableCell>
                <TableCell>{getOperacionName(m.operacionId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.montoDolares)}</TableCell>
                <TableCell>{m.comprobante || "-"}</TableCell>
                <TableCell>{m.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.relacionado} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.anticipo} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.utility} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.evidenciado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 flex flex-col">
      <header className="bg-card border-b px-4 py-3 flex items-center gap-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          Administración y Bancos
        </h1>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="border-blue-500/30 shadow-sm">
            <CardHeader className="py-2 px-4 border-b bg-blue-500/10">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> Seleccionar Unidad
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4">
              <Select value={selectedUnidadId} onValueChange={setSelectedUnidadId}>
                <SelectTrigger data-testid="select-unidad">
                  <SelectValue placeholder="Seleccione unidad..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.filter(u => u.habilitado).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <FilterCard 
            filters={adminFilters} 
            setFilters={setAdminFilters} 
            hasFilters={hasAdminFilters} 
            clearFilters={clearAdminFilters}
            title="Filtros de Administración"
          />

          <Card className="border-blue-500/30 shadow-sm overflow-hidden">
            <CardHeader className="py-2 px-4 border-b bg-blue-500/10 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> 
                Administración - {selectedUnidad?.nombre || "Sin selección"}
              </CardTitle>
              <Button size="sm" variant="default" className="h-7" data-testid="button-add-admin" disabled={!selectedUnidadId} onClick={openAddAdminDialog}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs value={adminTab} onValueChange={setAdminTab}>
                <ScrollArea className="w-full pb-2">
                  <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
                    <TabsTrigger value="gastos" className="px-3 text-xs" data-testid="tab-gastos">Gastos y Facturas</TabsTrigger>
                    <TabsTrigger value="nomina" className="px-3 text-xs" data-testid="tab-nomina">Nómina</TabsTrigger>
                    <TabsTrigger value="ventas" className="px-3 text-xs" data-testid="tab-ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="cuentas_cobrar" className="px-3 text-xs" data-testid="tab-cuentas-cobrar">Cuentas por Cobrar</TabsTrigger>
                    <TabsTrigger value="cuentas_pagar" className="px-3 text-xs" data-testid="tab-cuentas-pagar">Cuentas por Pagar</TabsTrigger>
                    <TabsTrigger value="prestamos" className="px-3 text-xs" data-testid="tab-prestamos">Préstamos</TabsTrigger>
                  </TabsList>
                </ScrollArea>

                <div className="mt-3">
                  <TabsContent value="gastos" className="mt-0"><GastosTable /></TabsContent>
                  <TabsContent value="nomina" className="mt-0"><NominasTable /></TabsContent>
                  <TabsContent value="ventas" className="mt-0"><VentasTable data={ventas} /></TabsContent>
                  <TabsContent value="cuentas_cobrar" className="mt-0"><VentasTable data={cuentasCobrar} /></TabsContent>
                  <TabsContent value="cuentas_pagar" className="mt-0"><CuentasPagarTable /></TabsContent>
                  <TabsContent value="prestamos" className="mt-0"><PrestamosTable /></TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-green-500/30 shadow-sm">
            <CardHeader className="py-2 px-4 border-b bg-green-500/10">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" /> Seleccionar Banco
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4">
              <Select value={selectedBancoId} onValueChange={setSelectedBancoId}>
                <SelectTrigger data-testid="select-banco">
                  <SelectValue placeholder="Seleccione banco..." />
                </SelectTrigger>
                <SelectContent>
                  {bancos.filter(b => b.habilitado).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <FilterCard 
            filters={bancoFilters} 
            setFilters={setBancoFilters} 
            hasFilters={hasBancoFilters} 
            clearFilters={clearBancoFilters}
            title="Filtros de Bancos"
          />

          <Card className="border-green-500/30 shadow-sm overflow-hidden">
            <CardHeader className="py-2 px-4 border-b bg-green-500/10 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-green-600" /> 
                Bancos - {selectedBanco?.nombre || "Sin selección"}
              </CardTitle>
              <Button size="sm" variant="default" className="h-7" data-testid="button-add-banco" disabled={!selectedBancoId} onClick={openAddBancoDialog}>
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              <MovimientosTable />
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Fecha <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData(f => ({ ...f, fecha: e.target.value }))}
                  data-testid="input-fecha"
                />
              </div>
              <div>
                <Label className="text-sm">Monto (Bs) <span className="text-red-500">*</span></Label>
                <CalculatorInput
                  value={formData.monto}
                  onChange={(v) => setFormData(f => ({ ...f, monto: v }))}
                  placeholder="0.00"
                  testId="input-monto"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Monto ($)</Label>
                <CalculatorInput
                  value={formData.montoDolares}
                  onChange={(v) => setFormData(f => ({ ...f, montoDolares: v }))}
                  placeholder="0.00"
                  testId="input-monto-dolares"
                />
              </div>
              {(dialogType === "gasto" || dialogType === "venta" || dialogType === "cuenta_cobrar" || dialogType === "cuenta_pagar") && (
                <div>
                  <Label className="text-sm">Cantidad</Label>
                  <CalculatorInput
                    value={formData.cantidad}
                    onChange={(v) => setFormData(f => ({ ...f, cantidad: v }))}
                    placeholder="0.00"
                    testId="input-cantidad"
                  />
                </div>
              )}
            </div>

            {(dialogType === "gasto" || dialogType === "cuenta_pagar") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Proveedor</Label>
                  <Select value={formData.proveedorId} onValueChange={(v) => setFormData(f => ({ ...f, proveedorId: v }))}>
                    <SelectTrigger data-testid="select-proveedor"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Insumo</Label>
                  <Select value={formData.insumoId} onValueChange={(v) => setFormData(f => ({ ...f, insumoId: v }))}>
                    <SelectTrigger data-testid="select-insumo"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(dialogType === "gasto" || dialogType === "nomina" || dialogType === "cuenta_pagar" || dialogType === "prestamo") && (
              <div>
                <Label className="text-sm">Actividad</Label>
                <Select value={formData.actividadId} onValueChange={(v) => setFormData(f => ({ ...f, actividadId: v }))}>
                  <SelectTrigger data-testid="select-actividad"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {actividades.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(dialogType === "nomina" || dialogType === "prestamo") && (
              <div>
                <Label className="text-sm">Personal</Label>
                <Select value={formData.personalId} onValueChange={(v) => setFormData(f => ({ ...f, personalId: v }))}>
                  <SelectTrigger data-testid="select-personal"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {personalList.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(dialogType === "venta" || dialogType === "cuenta_cobrar") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Cliente</Label>
                  <Select value={formData.clienteId} onValueChange={(v) => setFormData(f => ({ ...f, clienteId: v }))}>
                    <SelectTrigger data-testid="select-cliente"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Producto</Label>
                  <Select value={formData.productoId} onValueChange={(v) => setFormData(f => ({ ...f, productoId: v }))}>
                    <SelectTrigger data-testid="select-producto"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {productos.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {dialogType === "movimiento" && (
              <div>
                <Label className="text-sm">Operación Bancaria</Label>
                <Select value={formData.operacionId} onValueChange={(v) => setFormData(f => ({ ...f, operacionId: v }))}>
                  <SelectTrigger data-testid="select-operacion"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {operaciones.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Forma de Pago</Label>
                <Select value={formData.formaPago} onValueChange={(v) => setFormData(f => ({ ...f, formaPago: v }))}>
                  <SelectTrigger data-testid="select-forma-pago">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map(fp => (
                      <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Comprobante</Label>
                <Input
                  type="number"
                  value={formData.comprobante}
                  onChange={(e) => setFormData(f => ({ ...f, comprobante: e.target.value }))}
                  placeholder="Número"
                  data-testid="input-comprobante"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción del registro"
                data-testid="input-descripcion"
              />
            </div>

            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={formData.relacionado} onCheckedChange={(v) => setFormData(f => ({ ...f, relacionado: v }))} data-testid="switch-relacionado" />
                <Label className="text-xs">Relacionado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.anticipo} onCheckedChange={(v) => setFormData(f => ({ ...f, anticipo: v }))} data-testid="switch-anticipo" />
                <Label className="text-xs">Anticipo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.utility} onCheckedChange={(v) => setFormData(f => ({ ...f, utility: v }))} data-testid="switch-utility" />
                <Label className="text-xs">Utility</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.evidenciado} onCheckedChange={(v) => setFormData(f => ({ ...f, evidenciado: v }))} data-testid="switch-evidenciado" />
                <Label className="text-xs">Evidenciado</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel">Cancelar</Button>
            <Button onClick={handleSaveRecord} data-testid="button-save">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
