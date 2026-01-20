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
import { Plus, Edit2, Trash2, X, Landmark, Filter, Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

import type { Banco, OperacionBancaria, MovimientoBancario, TasaDolar } from "@shared/schema";

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

export default function BancosWindow() {
  const { toast } = useToast();
  
  const [selectedBancoId, setSelectedBancoId] = useState<string>("all");
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

  const selectedBanco = selectedBancoId === "all" ? null : bancos.find(b => b.id === selectedBancoId);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y.slice(-2)}`;
  };

  const clearFilters = () => setBancoFilters(defaultFilters);

  const hasFilters = !!(bancoFilters.nombre || bancoFilters.fechaDesde || bancoFilters.fechaHasta || 
    bancoFilters.relacionado !== "todos" || bancoFilters.anticipo !== "todos" || 
    bancoFilters.utility !== "todos" || bancoFilters.evidenciado !== "todos");

  const applyFilters = <T extends { fecha: string; descripcion?: string | null; relacionado: boolean; anticipo: boolean; utility: boolean; evidenciado: boolean }>(
    records: T[], 
    filters: BancoFilters
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
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
        <Edit2 className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  const getOperacionName = (id: string | null) => operaciones.find(o => o.id === id)?.nombre || "-";

  const toggleField = async (id: string, field: string, currentValue: boolean) => {
    try {
      await apiRequest("PATCH", `/api/administracion/movimientos-bancarios/${id}`, { [field]: !currentValue });
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
      toast({ title: "Campo actualizado" });
    } catch (error) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const handleEditRecord = (record: MovimientoBancario) => {
    setEditingRecord(record);
    setFormData({
      fecha: record.fecha,
      operacionId: record.operacionId || "",
      monto: record.monto?.toString() || "",
      montoDolares: record.montoDolares?.toString() || "",
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

  const handleDeleteRecord = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/administracion/movimientos-bancarios/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
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

    const payload = {
      bancoId: selectedBancoId,
      fecha: formData.fecha,
      operacionId: formData.operacionId || null,
      monto: parseFloat(formData.monto) || 0,
      montoDolares: parseFloat(formData.montoDolares) || 0,
      comprobante: formData.comprobante || null,
      descripcion: formData.descripcion || null,
      relacionado: formData.relacionado,
      anticipo: formData.anticipo,
      utility: formData.utility,
      evidenciado: formData.evidenciado,
      conciliado: formData.conciliado,
    };

    try {
      if (editingRecord) {
        await apiRequest("PATCH", `/api/administracion/movimientos-bancarios/${editingRecord.id}`, payload);
        toast({ title: "Movimiento actualizado" });
      } else {
        await apiRequest("POST", "/api/administracion/movimientos-bancarios", payload);
        toast({ title: "Movimiento creado" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/administracion/movimientos-bancarios"] });
      setDialogOpen(false);
      resetFormData();
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const getBancoName = (id: string | null) => bancos.find(b => b.id === id)?.nombre || "-";

  const MovimientosTable = () => {
    const filteredData = applyFilters(movimientos, bancoFilters);
    return (
      <ScrollArea className="w-full">
        <div className="min-w-[1200px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Acciones</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead className="text-right">Monto Bs</TableHead>
              <TableHead className="text-right">Monto $</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Saldo Conc.</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">R</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="text-center">U</TableHead>
              <TableHead className="text-center">E</TableHead>
              <TableHead className="text-center">C</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <ActionButtons 
                    onEdit={() => handleEditRecord(m)}
                    onDelete={() => handleDeleteRecord(m.id)}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{getBancoName(m.bancoId)}</TableCell>
                <TableCell>{formatDate(m.fecha)}</TableCell>
                <TableCell>{getOperacionName(m.operacionId)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.monto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(m.montoDolares)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(m.saldo)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(m.saldoConciliado)}</TableCell>
                <TableCell>{m.comprobante || "-"}</TableCell>
                <TableCell>{m.descripcion || "-"}</TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.relacionado} onClick={() => toggleField(m.id, "relacionado", m.relacionado)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.anticipo} onClick={() => toggleField(m.id, "anticipo", m.anticipo)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.utility} onClick={() => toggleField(m.id, "utility", m.utility)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.evidenciado} onClick={() => toggleField(m.id, "evidenciado", m.evidenciado)} /></TableCell>
                <TableCell className="text-center"><BooleanIndicator value={m.conciliado} onClick={() => toggleField(m.id, "conciliado", m.conciliado)} /></TableCell>
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
    <div className="h-full flex flex-col">
      <div className="p-3 space-y-3 overflow-auto flex-1">
        <div className="flex items-start gap-3">
          <Card className="border-green-500/30 w-48 shrink-0">
            <CardHeader className="py-1.5 px-2 border-b bg-green-500/10">
              <CardTitle className="text-[10px] font-medium flex items-center gap-1">
                <Landmark className="h-3 w-3 text-green-600" /> Banco
              </CardTitle>
            </CardHeader>
            <CardContent className="py-1.5 px-2">
              <Select value={selectedBancoId} onValueChange={setSelectedBancoId}>
                <SelectTrigger className="h-7 text-xs" data-testid="select-banco-window">
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                  <SelectItem value="all">Todos</SelectItem>
                  {bancos.filter(b => b.habilitado).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 flex-1">
            <CardHeader className="py-1.5 px-2 border-b bg-green-500/10 flex flex-row items-center justify-between gap-2">
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
                  value={bancoFilters.nombre}
                  onChange={(e) => setBancoFilters(f => ({ ...f, nombre: e.target.value }))}
                  className="h-6 text-xs flex-1"
                />
                <Select value={bancoFilters.relacionado} onValueChange={(v: any) => setBancoFilters(f => ({ ...f, relacionado: v }))}>
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

        <Card className="border-green-500/30 flex-1">
          <CardHeader className="py-2 px-3 border-b bg-green-500/10 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium">
              {selectedBancoId === "all" ? "Todos los Bancos" : (selectedBanco?.nombre || "Sin selección")}
            </CardTitle>
            <Button 
              size="sm" 
              variant="default" 
              className="h-6 text-xs" 
              disabled={!selectedBancoId || selectedBancoId === "all"} 
              onClick={() => {
                resetFormData();
                setEditingRecord(null);
                setDialogOpen(true);
              }}
              data-testid="button-add-banco"
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            <MovimientosTable />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "Editar Movimiento" : "Agregar Movimiento"}</DialogTitle>
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
                <Label className="text-xs">Operación</Label>
                <Select value={formData.operacionId} onValueChange={(v) => setFormData(f => ({ ...f, operacionId: v }))}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operaciones.filter(o => o.habilitado).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto (Bs) {getTasaDolarForDate(formData.fecha) ? "*" : ""}</Label>
                <CalculatorInput
                  value={formData.monto}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  testId="input-monto-banco"
                  hasError={fieldErrors.monto}
                />
              </div>
              <div>
                <Label className="text-xs">Monto ($)</Label>
                <CalculatorInput
                  value={formData.montoDolares}
                  onChange={handleMontoDolaresChange}
                  placeholder="0.00"
                  testId="input-monto-dolares-banco"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Comprobante</Label>
                <Input
                  value={formData.comprobante}
                  onChange={(e) => setFormData(f => ({ ...f, comprobante: e.target.value }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Descripción</Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData(f => ({ ...f, descripcion: e.target.value }))}
                  className="h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
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
              <div className="flex items-center gap-1">
                <Switch checked={formData.conciliado} onCheckedChange={(v) => setFormData(f => ({ ...f, conciliado: v }))} />
                <Label className="text-xs">C</Label>
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
