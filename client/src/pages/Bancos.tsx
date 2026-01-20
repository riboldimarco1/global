import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Edit2, Trash2, Search, X, Landmark, Filter, DollarSign, Calculator, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FloatingWindow from "@/components/FloatingWindow";
import { useToast } from "@/hooks/use-toast";


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

import type { Banco, OperacionBancaria, MovimientoBancario, TasaDolar } from "@shared/schema";

interface BancosProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

type BancoFilters = {
  nombre: string;
  fechaDesde: string;
  fechaHasta: string;
  relacionado: "todos" | "si" | "no";
  anticipo: "todos" | "si" | "no";
  utility: "todos" | "si" | "no";
  evidenciado: "todos" | "si" | "no";
};

const defaultFilters: BancoFilters = {
  nombre: "",
  fechaDesde: "",
  fechaHasta: "",
  relacionado: "todos",
  anticipo: "todos",
  utility: "todos",
  evidenciado: "todos",
};

export default function Bancos({ onBack, onLogout, onFocus, zIndex }: BancosProps) {
  const { toast } = useToast();
  
  const [selectedBancoId, setSelectedBancoId] = useState<string>("");
  const [bancoFilters, setBancoFilters] = useState<BancoFilters>(defaultFilters);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    operacionId: "",
    monto: "",
    montoDolares: "",
    comprobante: "",
    descripcion: "",
    relacionado: false,
    anticipo: false,
    utility: false,
    evidenciado: false,
    conciliado: false,
  });

  const resetFormData = () => {
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      operacionId: "",
      monto: "",
      montoDolares: "",
      comprobante: "",
      descripcion: "",
      relacionado: false,
      anticipo: false,
      utility: false,
      evidenciado: false,
      conciliado: false,
    });
    setFieldErrors({});
  };

  const openAddDialog = () => {
    resetFormData();
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const { data: bancos = [] } = useQuery<Banco[]>({ queryKey: ["/api/bancos"] });
  const { data: operaciones = [] } = useQuery<OperacionBancaria[]>({ queryKey: ["/api/operaciones-bancarias"] });
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

  const bancoQueryParam = selectedBancoId && selectedBancoId !== "all" ? `?bancoId=${selectedBancoId}` : "";

  const { data: movimientos = [] } = useQuery<MovimientoBancario[]>({ 
    queryKey: ["/api/administracion/movimientos-bancarios", selectedBancoId],
    queryFn: () => fetch(`/api/administracion/movimientos-bancarios${bancoQueryParam}`).then(r => r.json()),
    enabled: !!selectedBancoId,
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

  const updateMovimientoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/administracion/movimientos-bancarios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
      setDialogOpen(false);
      toast({ title: "Movimiento bancario actualizado exitosamente" });
    },
    onError: () => toast({ title: "Error al actualizar movimiento", variant: "destructive" }),
  });

  const deleteMovimientoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/administracion/movimientos-bancarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
      toast({ title: "Movimiento eliminado" });
    },
    onError: () => toast({ title: "Error al eliminar movimiento", variant: "destructive" }),
  });

  const toggleMovimientoField = async (id: string, field: string, currentValue: boolean) => {
    try {
      await apiRequest("PATCH", `/api/administracion/movimientos-bancarios/${id}`, { [field]: !currentValue });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleSaveRecord = () => {
    const errors: Record<string, boolean> = {};
    
    if (!formData.fecha) errors.fecha = true;
    if (!formData.monto || parseFloat(formData.monto) <= 0) errors.monto = true;
    if (!formData.operacionId) errors.operacionId = true;
    if (!formData.comprobante) errors.comprobante = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({ title: "Complete los campos requeridos", variant: "destructive" });
      return;
    }

    const payload = {
      bancoId: selectedBancoId,
      fecha: formData.fecha,
      operacionId: formData.operacionId,
      monto: parseFloat(formData.monto),
      montoDolares: parseFloat(formData.montoDolares) || 0,
      comprobante: formData.comprobante,
      descripcion: formData.descripcion || null,
      relacionado: formData.relacionado,
      anticipo: formData.anticipo,
      utility: formData.utility,
      evidenciado: formData.evidenciado,
      conciliado: formData.conciliado,
    };

    if (editingRecord) {
      updateMovimientoMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMovimientoMutation.mutate(payload);
    }
  };

  const handleEditRecord = (record: MovimientoBancario) => {
    setEditingRecord(record);
    setFormData({
      fecha: record.fecha,
      operacionId: record.operacionId || "",
      monto: String(record.monto || 0),
      montoDolares: String(record.montoDolares || 0),
      comprobante: record.comprobante || "",
      descripcion: record.descripcion || "",
      relacionado: record.relacionado || false,
      anticipo: record.anticipo || false,
      utility: record.utility || false,
      evidenciado: record.evidenciado || false,
      conciliado: record.conciliado || false,
    });
    setDialogOpen(true);
  };

  const handleCopyRecord = (record: MovimientoBancario) => {
    setEditingRecord(null);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      operacionId: record.operacionId || "",
      monto: String(record.monto || 0),
      montoDolares: String(record.montoDolares || 0),
      comprobante: "",
      descripcion: record.descripcion || "",
      relacionado: record.relacionado || false,
      anticipo: record.anticipo || false,
      utility: record.utility || false,
      evidenciado: record.evidenciado || false,
      conciliado: false,
    });
    setDialogOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm("¿Está seguro de eliminar este registro?")) {
      deleteMovimientoMutation.mutate(id);
    }
  };

  const selectedBanco = bancos.find(b => b.id === selectedBancoId);

  const hasBancoFilters = bancoFilters.nombre !== "" || 
    bancoFilters.fechaDesde !== "" || 
    bancoFilters.fechaHasta !== "" ||
    bancoFilters.relacionado !== "todos" ||
    bancoFilters.anticipo !== "todos" ||
    bancoFilters.utility !== "todos" ||
    bancoFilters.evidenciado !== "todos";

  const clearBancoFilters = () => setBancoFilters(defaultFilters);

  const applyFilters = (data: any[], filters: BancoFilters) => {
    return data.filter(item => {
      if (filters.fechaDesde && item.fecha < filters.fechaDesde) return false;
      if (filters.fechaHasta && item.fecha > filters.fechaHasta) return false;
      if (filters.relacionado === "si" && !item.relacionado) return false;
      if (filters.relacionado === "no" && item.relacionado) return false;
      if (filters.anticipo === "si" && !item.anticipo) return false;
      if (filters.anticipo === "no" && item.anticipo) return false;
      if (filters.utility === "si" && !item.utility) return false;
      if (filters.utility === "no" && item.utility) return false;
      if (filters.evidenciado === "si" && !item.evidenciado) return false;
      if (filters.evidenciado === "no" && item.evidenciado) return false;
      return true;
    });
  };

  const getOperacionName = (id: string | null) => operaciones.find(o => o.id === id)?.nombre || "-";
  const getOperacionOperador = (id: string | null) => operaciones.find(o => o.id === id)?.operador || "suma";
  
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const BooleanIndicator = ({ value, onClick }: { value: boolean | null; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={`w-4 h-4 rounded-full cursor-pointer transition-colors ${value ? "bg-green-500" : "bg-red-500"}`}
      title={value ? "Sí" : "No"}
    />
  );

  const ActionButtons = ({ onEdit, onCopy, onDelete }: { onEdit: () => void; onCopy: () => void; onDelete: () => void }) => (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} data-testid="button-edit">
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy} data-testid="button-copy">
        <Copy className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete} data-testid="button-delete">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const FilterCard = ({ filters, setFilters, hasFilters, clearFilters, title }: { 
    filters: BancoFilters; 
    setFilters: (f: BancoFilters) => void; 
    hasFilters: boolean; 
    clearFilters: () => void;
    title: string;
  }) => (
    <Card className="border-green-500/30 shadow-sm">
      <CardHeader className="py-2 px-4 border-b bg-green-500/10">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-green-600" /> {title}
          </span>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Limpiar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input 
              type="date" 
              value={filters.fechaDesde} 
              onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input 
              type="date" 
              value={filters.fechaHasta} 
              onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Relacionado</Label>
            <Select value={filters.relacionado} onValueChange={(v: "todos" | "si" | "no") => setFilters({ ...filters, relacionado: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="si">Sí</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Anticipo</Label>
            <Select value={filters.anticipo} onValueChange={(v: "todos" | "si" | "no") => setFilters({ ...filters, anticipo: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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

  const MovimientosTable = () => {
    const filteredMovimientos = applyFilters(movimientos, bancoFilters);

    let saldo = 0;
    let saldoConc = 0;
    const movimientosConSaldos = filteredMovimientos
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map(m => {
        const operador = getOperacionOperador(m.operacionId);
        const monto = m.monto || 0;
        if (operador === "suma") {
          saldo += monto;
          if (m.conciliado) saldoConc += monto;
        } else {
          saldo -= monto;
          if (m.conciliado) saldoConc -= monto;
        }
        return { ...m, saldoCalculado: saldo, saldoConcCalculado: saldoConc };
      }, [] as Array<typeof filteredMovimientos[0] & { saldoCalculado: number; saldoConcCalculado: number }>);

    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="max-h-[500px] overflow-y-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs w-[80px]">Acciones</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs">Fecha</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs">Operación</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-right">Monto Bs</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-right">Monto $</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-right">Saldo</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-right">Saldo Conc.</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs">Comprobante</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs">Descripción</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-center">Rel.</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-center">Ant.</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-center">Util.</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-center">Evid.</TableHead>
              <TableHead className="sticky top-0 bg-background border-b z-[20] text-xs text-center">Conc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientosConSaldos.length === 0 ? (
              <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground text-xs py-4">No hay movimientos</TableCell></TableRow>
            ) : movimientosConSaldos.map(m => (
              <TableRow key={m.id} className="text-xs">
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(m)}
                    onCopy={() => handleCopyRecord(m)}
                    onDelete={() => handleDeleteRecord(m.id)}
                  />
                </TableCell>
                <TableCell>{formatDate(m.fecha)}</TableCell>
                <TableCell>{getOperacionName(m.operacionId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.montoDolares)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(m.saldoCalculado)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(m.saldoConcCalculado)}</TableCell>
                <TableCell>{m.comprobante || "-"}</TableCell>
                <TableCell>{m.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.relacionado} onClick={() => toggleMovimientoField(m.id, "relacionado", m.relacionado)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.anticipo} onClick={() => toggleMovimientoField(m.id, "anticipo", m.anticipo)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.utility} onClick={() => toggleMovimientoField(m.id, "utility", m.utility)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.evidenciado} onClick={() => toggleMovimientoField(m.id, "evidenciado", m.evidenciado)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.conciliado} onClick={() => toggleMovimientoField(m.id, "conciliado", m.conciliado)} /></TableCell>
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
    <FloatingWindow
      id="bancos"
      title="Bancos"
      icon={<Landmark className="h-4 w-4 text-green-600" />}
      initialPosition={{ x: 180, y: 70 }}
      initialSize={{ width: 1100, height: 700 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-green-500"
    >
      <div className="h-full overflow-auto p-4 space-y-4">
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
                <SelectItem value="all">Todos los Bancos</SelectItem>
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
          title="Filtros de Movimientos"
        />

        <Card className="border-green-500/30 shadow-sm overflow-hidden">
          <CardHeader className="py-2 px-4 border-b bg-green-500/10 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4 text-green-600" /> 
              Movimientos Bancarios - {selectedBancoId === "all" ? "Todos los Bancos" : (selectedBanco?.nombre || "Sin selección")}
            </CardTitle>
            <Button size="sm" variant="default" className="h-7" data-testid="button-add-movimiento" disabled={!selectedBancoId || selectedBancoId === "all"} onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <MovimientosTable />
          </CardContent>
        </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Editar Movimiento Bancario" : "Nuevo Movimiento Bancario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Fecha <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  className={fieldErrors.fecha ? "border-red-500 ring-1 ring-red-500" : ""}
                  data-testid="input-fecha"
                />
              </div>
              <div>
                <Label className="text-sm">Monto (Bs) {getTasaDolarForDate(formData.fecha) ? <span className="text-red-500">*</span> : <span className="text-muted-foreground text-xs">(sin tasa)</span>}</Label>
                <CalculatorInput
                  value={formData.monto}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  testId="input-monto"
                  hasError={fieldErrors.monto}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Monto ($) {getTasaDolarForDate(formData.fecha) ? <span className="text-red-500">*</span> : <span className="text-muted-foreground text-xs">(sin tasa)</span>}</Label>
                <CalculatorInput
                  value={formData.montoDolares}
                  onChange={handleMontoDolaresChange}
                  placeholder="0.00"
                  testId="input-monto-dolares"
                  hasError={fieldErrors.montoDolares}
                />
              </div>
              <div>
                <Label className="text-sm">Operación Bancaria <span className="text-red-500">*</span></Label>
                <Select value={formData.operacionId} onValueChange={(v) => setFormData(f => ({ ...f, operacionId: v }))}>
                  <SelectTrigger data-testid="select-operacion" className={fieldErrors.operacionId ? "border-red-500 ring-1 ring-red-500" : ""}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    {operaciones.map(o => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm">Comprobante <span className="text-red-500">*</span></Label>
              <CalculatorInput
                value={formData.comprobante}
                onChange={(v) => setFormData(f => ({ ...f, comprobante: v }))}
                placeholder="Número"
                testId="input-comprobante"
                hasError={fieldErrors.comprobante}
              />
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

            <div className="grid grid-cols-5 gap-4 pt-2">
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
              <div className="flex items-center gap-2">
                <Switch checked={formData.conciliado} onCheckedChange={(v) => setFormData(f => ({ ...f, conciliado: v }))} data-testid="switch-conciliado" />
                <Label className="text-xs">Conciliado</Label>
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
    </FloatingWindow>
  );
}
