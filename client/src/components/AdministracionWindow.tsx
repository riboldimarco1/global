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
import { Plus, Edit2, Trash2, Search, X, Building2, Filter, Calculator, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

import type { UnidadProduccion, Proveedor, Insumo, Actividad, Personal, Cliente, Producto, Gasto, Nomina, Venta, CuentaCobrar, CuentaPagar, Prestamo, TasaDolar } from "@shared/schema";

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Pago Móvil", "Zelle", "Otro"];

function CalculatorInput({ value, onChange, placeholder, testId, hasError }: { value: string; onChange: (v: string) => void; placeholder: string; testId: string; hasError?: boolean }) {
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
        className={`pr-8 ${hasError ? "border-red-500 ring-1 ring-red-500" : ""}`}
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

export default function AdministracionWindow() {
  const { toast } = useToast();
  
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>("all");
  const [adminTab, setAdminTab] = useState("gastos");
  const [adminFilters, setAdminFilters] = useState<AdminFilters>(defaultFilters);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"gasto" | "nomina" | "venta" | "cuenta_cobrar" | "cuenta_pagar" | "prestamo">("gasto");
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedorId: "",
    insumoId: "",
    actividadId: "",
    personalId: "",
    clienteId: "",
    productoId: "",
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
    setFieldErrors({});
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

  const { data: unidades = [] } = useQuery<UnidadProduccion[]>({ queryKey: ["/api/unidades-produccion"] });
  const { data: proveedores = [] } = useQuery<Proveedor[]>({ queryKey: ["/api/proveedores"] });
  const { data: insumos = [] } = useQuery<Insumo[]>({ queryKey: ["/api/insumos"] });
  const { data: actividades = [] } = useQuery<Actividad[]>({ queryKey: ["/api/actividades"] });
  const { data: personalList = [] } = useQuery<Personal[]>({ queryKey: ["/api/personal"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: productos = [] } = useQuery<Producto[]>({ queryKey: ["/api/productos"] });
  const { data: tasasDolar = [] } = useQuery<TasaDolar[]>({ queryKey: ["/api/tasas-dolar"] });

  const getTasaDolarForDate = (fecha: string): number | null => {
    const tasa = tasasDolar.find(t => t.fecha === fecha);
    return tasa ? tasa.valor : null;
  };

  const handleMontoChange = (value: string) => {
    const monto = parseFloat(value) || 0;
    const tasaDolar = getTasaDolarForDate(formData.fecha);
    
    if (tasaDolar && tasaDolar > 0) {
      const montoDolares = monto / tasaDolar;
      setFormData(f => ({ ...f, monto: value, montoDolares: montoDolares.toFixed(2) }));
    } else {
      setFormData(f => ({ ...f, monto: value, montoDolares: "0" }));
    }
  };

  const handleMontoDolaresChange = (value: string) => {
    const montoDolares = parseFloat(value) || 0;
    const tasaDolar = getTasaDolarForDate(formData.fecha);
    
    if (tasaDolar && tasaDolar > 0) {
      const monto = montoDolares * tasaDolar;
      setFormData(f => ({ ...f, montoDolares: value, monto: monto.toFixed(2) }));
    } else {
      setFormData(f => ({ ...f, montoDolares: value, monto: "0" }));
    }
  };

  const handleFechaChange = (newFecha: string) => {
    const tasaDolar = tasasDolar.find(t => t.fecha === newFecha)?.valor || null;
    
    if (tasaDolar && tasaDolar > 0) {
      const monto = parseFloat(formData.monto) || 0;
      if (monto > 0) {
        const montoDolares = monto / tasaDolar;
        setFormData(f => ({ ...f, fecha: newFecha, montoDolares: montoDolares.toFixed(2) }));
      } else {
        setFormData(f => ({ ...f, fecha: newFecha }));
      }
    } else {
      setFormData(f => ({ ...f, fecha: newFecha, montoDolares: "0" }));
    }
  };

  const unidadQueryParam = selectedUnidadId && selectedUnidadId !== "all" ? `?unidadId=${selectedUnidadId}` : "";

  const { data: gastos = [] } = useQuery<Gasto[]>({ 
    queryKey: ["/api/administracion/gastos", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/gastos${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: nominas = [] } = useQuery<Nomina[]>({ 
    queryKey: ["/api/administracion/nominas", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/nominas${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: ventas = [] } = useQuery<Venta[]>({ 
    queryKey: ["/api/administracion/ventas", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/ventas${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: cuentasCobrar = [] } = useQuery<CuentaCobrar[]>({ 
    queryKey: ["/api/administracion/cuentas-cobrar", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/cuentas-cobrar${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: cuentasPagar = [] } = useQuery<CuentaPagar[]>({ 
    queryKey: ["/api/administracion/cuentas-pagar", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/cuentas-pagar${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const { data: prestamos = [] } = useQuery<Prestamo[]>({ 
    queryKey: ["/api/administracion/prestamos", selectedUnidadId],
    queryFn: () => fetch(`/api/administracion/prestamos${unidadQueryParam}`).then(r => r.json()),
    enabled: !!selectedUnidadId,
  });

  const selectedUnidad = selectedUnidadId === "all" ? null : unidades.find(u => u.id === selectedUnidadId);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y.slice(-2)}`;
  };

  const clearFilters = () => setAdminFilters(defaultFilters);

  const hasFilters = !!(adminFilters.nombre || adminFilters.fechaDesde || adminFilters.fechaHasta || 
    adminFilters.relacionado !== "todos" || adminFilters.anticipo !== "todos" || 
    adminFilters.utility !== "todos" || adminFilters.evidenciado !== "todos");

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

  const BooleanIndicator = ({ value, onClick }: { value: boolean; onClick?: () => void }) => (
    <div 
      className={`w-4 h-4 rounded-full cursor-pointer ${value ? "bg-green-500" : "bg-red-500"}`}
      onClick={onClick}
      title={value ? "Sí (click para cambiar)" : "No (click para cambiar)"}
    />
  );

  const ActionButtons = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6" 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onEdit();
        }}
      >
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 text-destructive" 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const getProveedorName = (id: string | null) => proveedores.find(p => p.id === id)?.nombre || "-";
  const getInsumoName = (id: string | null) => insumos.find(i => i.id === id)?.nombre || "-";
  const getActividadName = (id: string | null) => actividades.find(a => a.id === id)?.nombre || "-";
  const getPersonalName = (id: string | null) => personalList.find(p => p.id === id)?.nombre || "-";
  const getClienteName = (id: string | null) => clientes.find(c => c.id === id)?.nombre || "-";
  const getProductoName = (id: string | null) => productos.find(p => p.id === id)?.nombre || "-";
  const getUnidadName = (id: string | null | undefined) => unidades.find(u => u.id === id)?.nombre || "-";

  const GastosTable = () => {
    const filteredData = applyFilters(gastos, adminFilters);
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[1100px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>Forma Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(g, "gasto")}
                    onDelete={() => handleDeleteRecord(g.id, "gasto")}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getUnidadName(g.unidadProduccionId)}</TableCell>
                <TableCell>{formatDate(g.fecha)}</TableCell>
                <TableCell>{getProveedorName(g.proveedorId)}</TableCell>
                <TableCell>{getInsumoName(g.insumoId)}</TableCell>
                <TableCell className="text-right">{g.cantidad}</TableCell>
                <TableCell className="text-right">{formatCurrency(g.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(g.montoDolares)}</TableCell>
                <TableCell>{g.formaPago || "-"}</TableCell>
                <TableCell>{g.comprobante || "-"}</TableCell>
                <TableCell>{g.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.relacionado} onClick={() => toggleField(g.id, "relacionado", g.relacionado, "gasto")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.anticipo} onClick={() => toggleField(g.id, "anticipo", g.anticipo, "gasto")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.utility} onClick={() => toggleField(g.id, "utility", g.utility, "gasto")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={g.evidenciado} onClick={() => toggleField(g.id, "evidenciado", g.evidenciado, "gasto")} /></TableCell>
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
    const filteredData = applyFilters(nominas, adminFilters);
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Personal</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>Forma Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((n) => (
              <TableRow key={n.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(n, "nomina")}
                    onDelete={() => handleDeleteRecord(n.id, "nomina")}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getUnidadName(n.unidadProduccionId)}</TableCell>
                <TableCell>{formatDate(n.fecha)}</TableCell>
                <TableCell>{getPersonalName(n.personalId)}</TableCell>
                <TableCell>{getActividadName(n.actividadId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(n.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(n.montoDolares)}</TableCell>
                <TableCell>{n.formaPago || "-"}</TableCell>
                <TableCell>{n.comprobante || "-"}</TableCell>
                <TableCell>{n.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.relacionado} onClick={() => toggleField(n.id, "relacionado", n.relacionado, "nomina")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.anticipo} onClick={() => toggleField(n.id, "anticipo", n.anticipo, "nomina")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.utility} onClick={() => toggleField(n.id, "utility", n.utility, "nomina")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={n.evidenciado} onClick={() => toggleField(n.id, "evidenciado", n.evidenciado, "nomina")} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const VentasTable = ({ data }: { data: (Venta | CuentaCobrar)[] }) => {
    const filteredData = applyFilters(data, adminFilters);
    const isVenta = (item: any): item is Venta => 'clienteId' in item;
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>Forma Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(v, isVenta(v) ? "venta" : "cuenta_cobrar")}
                    onDelete={() => handleDeleteRecord(v.id, isVenta(v) ? "venta" : "cuenta_cobrar")}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getUnidadName((v as any).unidadProduccionId)}</TableCell>
                <TableCell>{formatDate(v.fecha)}</TableCell>
                <TableCell>{getClienteName(v.clienteId)}</TableCell>
                <TableCell>{getProductoName(v.productoId)}</TableCell>
                <TableCell className="text-right">{v.cantidad}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.montoDolares)}</TableCell>
                <TableCell>{v.formaPago || "-"}</TableCell>
                <TableCell>{v.comprobante || "-"}</TableCell>
                <TableCell>{v.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.relacionado} onClick={() => toggleField(v.id, "relacionado", v.relacionado, isVenta(v) ? "venta" : "cuenta_cobrar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.anticipo} onClick={() => toggleField(v.id, "anticipo", v.anticipo, isVenta(v) ? "venta" : "cuenta_cobrar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.utility} onClick={() => toggleField(v.id, "utility", v.utility, isVenta(v) ? "venta" : "cuenta_cobrar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={v.evidenciado} onClick={() => toggleField(v.id, "evidenciado", v.evidenciado, isVenta(v) ? "venta" : "cuenta_cobrar")} /></TableCell>
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
    const filteredData = applyFilters(cuentasPagar, adminFilters);
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
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
            {filteredData.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(c, "cuenta_pagar")}
                    onDelete={() => handleDeleteRecord(c.id, "cuenta_pagar")}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getUnidadName(c.unidadProduccionId)}</TableCell>
                <TableCell>{formatDate(c.fecha)}</TableCell>
                <TableCell>{getProveedorName(c.proveedorId)}</TableCell>
                <TableCell>{getInsumoName(c.insumoId)}</TableCell>
                <TableCell className="text-right">{c.cantidad}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.montoDolares)}</TableCell>
                <TableCell>{c.comprobante || "-"}</TableCell>
                <TableCell>{c.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.relacionado} onClick={() => toggleField(c.id, "relacionado", c.relacionado, "cuenta_pagar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.anticipo} onClick={() => toggleField(c.id, "anticipo", c.anticipo, "cuenta_pagar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.utility} onClick={() => toggleField(c.id, "utility", c.utility, "cuenta_pagar")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={c.evidenciado} onClick={() => toggleField(c.id, "evidenciado", c.evidenciado, "cuenta_pagar")} /></TableCell>
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
    const filteredData = applyFilters(prestamos, adminFilters);
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead>Forma Pago</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(p, "prestamo")}
                    onDelete={() => handleDeleteRecord(p.id, "prestamo")}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getUnidadName(p.unidadProduccionId)}</TableCell>
                <TableCell>{formatDate(p.fecha)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.montoDolares)}</TableCell>
                <TableCell>{p.formaPago || "-"}</TableCell>
                <TableCell>{p.comprobante || "-"}</TableCell>
                <TableCell>{p.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.relacionado} onClick={() => toggleField(p.id, "relacionado", p.relacionado, "prestamo")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.anticipo} onClick={() => toggleField(p.id, "anticipo", p.anticipo, "prestamo")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.utility} onClick={() => toggleField(p.id, "utility", p.utility, "prestamo")} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={p.evidenciado} onClick={() => toggleField(p.id, "evidenciado", p.evidenciado, "prestamo")} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  const toggleField = async (id: string, field: string, currentValue: boolean, type: string) => {
    const endpoints: Record<string, string> = {
      gasto: "/api/administracion/gastos",
      nomina: "/api/administracion/nominas",
      venta: "/api/administracion/ventas",
      cuenta_cobrar: "/api/administracion/cuentas-cobrar",
      cuenta_pagar: "/api/administracion/cuentas-pagar",
      prestamo: "/api/administracion/prestamos",
    };
    
    try {
      await apiRequest("PATCH", `${endpoints[type]}/${id}`, { [field]: !currentValue });
      queryClient.invalidateQueries({ queryKey: [endpoints[type].replace("/api", "")] });
      toast({ title: "Campo actualizado" });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleEditRecord = (record: any, type: typeof dialogType) => {
    setDialogType(type);
    setEditingRecord(record);
    setFormData({
      fecha: record.fecha,
      proveedorId: record.proveedorId || "",
      insumoId: record.insumoId || "",
      actividadId: record.actividadId || "",
      personalId: record.personalId || "",
      clienteId: record.clienteId || "",
      productoId: record.productoId || "",
      cantidad: record.cantidad?.toString() || "",
      monto: record.monto?.toString() || "",
      montoDolares: record.montoDolares?.toString() || "",
      formaPago: record.formaPago || "",
      comprobante: record.comprobante || "",
      descripcion: record.descripcion || "",
      relacionado: record.relacionado || false,
      anticipo: record.anticipo || false,
      utility: record.utility || false,
      evidenciado: record.evidenciado || false,
    });
    setDialogOpen(true);
  };

  const handleDeleteRecord = async (id: string, type: string) => {
    const endpoints: Record<string, string> = {
      gasto: "/api/administracion/gastos",
      nomina: "/api/administracion/nominas",
      venta: "/api/administracion/ventas",
      cuenta_cobrar: "/api/administracion/cuentas-cobrar",
      cuenta_pagar: "/api/administracion/cuentas-pagar",
      prestamo: "/api/administracion/prestamos",
    };
    
    try {
      await apiRequest("DELETE", `${endpoints[type]}/${id}`);
      queryClient.invalidateQueries({ queryKey: [endpoints[type].replace("/api", "")] });
      toast({ title: "Registro eliminado" });
    } catch (error) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    const tasaDolar = getTasaDolarForDate(formData.fecha);
    
    if (!formData.fecha) errors.fecha = true;
    if (tasaDolar && (!formData.monto || parseFloat(formData.monto) <= 0)) errors.monto = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({ title: "Complete los campos requeridos", variant: "destructive" });
      return;
    }

    const endpoints: Record<string, string> = {
      gasto: "/api/administracion/gastos",
      nomina: "/api/administracion/nominas",
      venta: "/api/administracion/ventas",
      cuenta_cobrar: "/api/administracion/cuentas-cobrar",
      cuenta_pagar: "/api/administracion/cuentas-pagar",
      prestamo: "/api/administracion/prestamos",
    };

    const payload: any = {
      fecha: formData.fecha,
      monto: parseFloat(formData.monto) || 0,
      montoDolares: parseFloat(formData.montoDolares) || 0,
      formaPago: formData.formaPago || null,
      comprobante: formData.comprobante || null,
      descripcion: formData.descripcion || null,
      relacionado: formData.relacionado,
      anticipo: formData.anticipo,
      utility: formData.utility,
      evidenciado: formData.evidenciado,
    };

    if (dialogType === "gasto" || dialogType === "cuenta_pagar") {
      payload.unidadId = selectedUnidadId;
      payload.proveedorId = formData.proveedorId || null;
      payload.insumoId = formData.insumoId || null;
      payload.cantidad = parseFloat(formData.cantidad) || 0;
    } else if (dialogType === "nomina") {
      payload.unidadId = selectedUnidadId;
      payload.personalId = formData.personalId || null;
      payload.actividadId = formData.actividadId || null;
    } else if (dialogType === "venta" || dialogType === "cuenta_cobrar") {
      payload.unidadId = selectedUnidadId;
      payload.clienteId = formData.clienteId || null;
      payload.productoId = formData.productoId || null;
      payload.cantidad = parseFloat(formData.cantidad) || 0;
    } else if (dialogType === "prestamo") {
      payload.unidadId = selectedUnidadId;
    }

    try {
      if (editingRecord) {
        await apiRequest("PATCH", `${endpoints[dialogType]}/${editingRecord.id}`, payload);
        toast({ title: "Registro actualizado" });
      } else {
        await apiRequest("POST", endpoints[dialogType], payload);
        toast({ title: "Registro creado" });
      }
      queryClient.invalidateQueries({ queryKey: [endpoints[dialogType].replace("/api", "")] });
      setDialogOpen(false);
      resetFormData();
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const getDialogTitle = () => {
    const titles: Record<typeof dialogType, string> = {
      gasto: editingRecord ? "Editar Gasto" : "Agregar Gasto",
      nomina: editingRecord ? "Editar Nómina" : "Agregar Nómina",
      venta: editingRecord ? "Editar Venta" : "Agregar Venta",
      cuenta_cobrar: editingRecord ? "Editar Cuenta por Cobrar" : "Agregar Cuenta por Cobrar",
      cuenta_pagar: editingRecord ? "Editar Cuenta por Pagar" : "Agregar Cuenta por Pagar",
      prestamo: editingRecord ? "Editar Préstamo" : "Agregar Préstamo",
    };
    return titles[dialogType];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 space-y-3 overflow-auto flex-1">
        <div className="flex items-start gap-3">
          <Card className="border-emerald-500/30 w-48 shrink-0">
            <CardHeader className="py-1.5 px-2 border-b bg-emerald-500/10">
              <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-600" /> Unidad
              </CardTitle>
            </CardHeader>
            <CardContent className="py-1.5 px-2">
              <Select value={selectedUnidadId} onValueChange={setSelectedUnidadId}>
                <SelectTrigger className="h-7 text-xs" data-testid="select-unidad-admin">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                  <SelectItem value="all">Todas</SelectItem>
                  {unidades.filter(u => u.habilitado).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 flex-1">
            <CardHeader className="py-1.5 px-2 border-b bg-emerald-500/10 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filtros
              </CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="py-1.5 px-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar..."
                  value={adminFilters.nombre}
                  onChange={(e) => setAdminFilters(f => ({ ...f, nombre: e.target.value }))}
                  className="h-6 text-xs flex-1"
                />
                <Select value={adminFilters.relacionado} onValueChange={(v: any) => setAdminFilters(f => ({ ...f, relacionado: v }))}>
                  <SelectTrigger className="h-6 text-xs w-20">
                    <SelectValue placeholder="R" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                    <SelectItem value="todos">R: Todos</SelectItem>
                    <SelectItem value="si">R: Sí</SelectItem>
                    <SelectItem value="no">R: No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-emerald-500/30 flex-1">
          <CardHeader className="py-2 px-3 border-b bg-emerald-500/10 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium">
              {selectedUnidadId === "all" ? "Todas las Unidades" : (selectedUnidad?.nombre || "Sin selección")}
            </CardTitle>
            <Button 
              size="sm" 
              variant="default" 
              className="h-6 text-xs" 
              disabled={!selectedUnidadId || selectedUnidadId === "all"} 
              onClick={openAddAdminDialog}
              data-testid="button-add-admin"
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <ScrollArea className="w-full pb-1">
                <TabsList className="inline-flex h-7 items-center justify-start rounded-md bg-muted p-0.5 text-muted-foreground">
                  <TabsTrigger value="gastos" className="px-2 text-[10px] h-6">Gastos</TabsTrigger>
                  <TabsTrigger value="nomina" className="px-2 text-[10px] h-6">Nómina</TabsTrigger>
                  <TabsTrigger value="ventas" className="px-2 text-[10px] h-6">Ventas</TabsTrigger>
                  <TabsTrigger value="cuentas_cobrar" className="px-2 text-[10px] h-6">Por Cobrar</TabsTrigger>
                  <TabsTrigger value="cuentas_pagar" className="px-2 text-[10px] h-6">Por Pagar</TabsTrigger>
                  <TabsTrigger value="prestamos" className="px-2 text-[10px] h-6">Préstamos</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <div className="mt-2">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  className={`h-8 text-sm ${fieldErrors.fecha ? "border-red-500" : ""}`}
                />
              </div>
              <div>
                <Label className="text-xs">Monto (Bs) {getTasaDolarForDate(formData.fecha) ? "*" : ""}</Label>
                <CalculatorInput
                  value={formData.monto}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  testId="input-monto-admin"
                  hasError={fieldErrors.monto}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto ($)</Label>
                <CalculatorInput
                  value={formData.montoDolares}
                  onChange={handleMontoDolaresChange}
                  placeholder="0.00"
                  testId="input-monto-dolares-admin"
                />
              </div>
              {(dialogType === "gasto" || dialogType === "venta" || dialogType === "cuenta_cobrar" || dialogType === "cuenta_pagar") && (
                <div>
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData(f => ({ ...f, cantidad: e.target.value }))}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {(dialogType === "gasto" || dialogType === "cuenta_pagar") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Proveedor</Label>
                  <Select value={formData.proveedorId} onValueChange={(v) => setFormData(f => ({ ...f, proveedorId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.filter(p => p.habilitado).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Insumo</Label>
                  <Select value={formData.insumoId} onValueChange={(v) => setFormData(f => ({ ...f, insumoId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {insumos.filter(i => i.habilitado).map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {dialogType === "nomina" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Personal</Label>
                  <Select value={formData.personalId} onValueChange={(v) => setFormData(f => ({ ...f, personalId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personalList.filter(p => p.habilitado).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Actividad</Label>
                  <Select value={formData.actividadId} onValueChange={(v) => setFormData(f => ({ ...f, actividadId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {actividades.filter(a => a.habilitado).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(dialogType === "venta" || dialogType === "cuenta_cobrar") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <Select value={formData.clienteId} onValueChange={(v) => setFormData(f => ({ ...f, clienteId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.habilitado).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Producto</Label>
                  <Select value={formData.productoId} onValueChange={(v) => setFormData(f => ({ ...f, productoId: v }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productos.filter(p => p.habilitado).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Forma de Pago</Label>
                <Select value={formData.formaPago} onValueChange={(v) => setFormData(f => ({ ...f, formaPago: v }))}>
                  <SelectTrigger className="h-8">
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
                <Label className="text-xs">Comprobante</Label>
                <Input
                  value={formData.comprobante}
                  onChange={(e) => setFormData(f => ({ ...f, comprobante: e.target.value }))}
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))}
                className="h-8"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="flex items-center gap-1">
                <Switch checked={formData.relacionado} onCheckedChange={(v) => setFormData(f => ({ ...f, relacionado: v }))} />
                <Label className="text-xs">R</Label>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={formData.anticipo} onCheckedChange={(v) => setFormData(f => ({ ...f, anticipo: v }))} />
                <Label className="text-xs">A</Label>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={formData.utility} onCheckedChange={(v) => setFormData(f => ({ ...f, utility: v }))} />
                <Label className="text-xs">U</Label>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={formData.evidenciado} onCheckedChange={(v) => setFormData(f => ({ ...f, evidenciado: v }))} />
                <Label className="text-xs">E</Label>
              </div>
            </div>
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
