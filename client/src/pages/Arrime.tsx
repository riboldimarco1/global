import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MyWindow from "@/components/MyWindow";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  getCurrentWeekNumber, 
  getWeekDateRange, 
  isDateInWeek, 
  formatDateDisplay, 
  formatNumber,
  getAvailableWeeks,
  formatDateSpanish
} from "@/lib/arrimeWeekUtils";
import { 
  Trash2, 
  Plus, 
  RefreshCw, 
  Calendar, 
  Factory, 
  Database,
  ChevronLeft,
  ChevronRight,
  Save
} from "lucide-react";

interface ArrimeRegistro {
  id: string;
  fecha: string;
  central: string;
  cantidad: number;
  grado: number | null;
  finca: string | null;
  remesa: string | null;
}

interface ArrimeCentral {
  id: string;
  nombre: string;
  color: string;
  orden: number;
}

interface ArrimeFinca {
  id: string;
  nombre: string;
  orden: number;
}

interface ArrimeProps {
  id: string;
  onClose?: () => void;
  initialPosition?: { x: number; y: number };
}

export default function Arrime({ id, onClose, initialPosition }: ArrimeProps) {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber());
  const [filterCentral, setFilterCentral] = useState<string>("all");
  const [filterFinca, setFilterFinca] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    central: "",
    cantidad: "",
    grado: "",
    finca: "",
    remesa: ""
  });

  const { data: registros = [], isLoading: loadingRegistros, refetch: refetchRegistros } = useQuery<ArrimeRegistro[]>({
    queryKey: ["/api/arrime/registros"],
  });

  const { data: centrales = [] } = useQuery<ArrimeCentral[]>({
    queryKey: ["/api/arrime/centrales"],
  });

  const { data: fincas = [] } = useQuery<ArrimeFinca[]>({
    queryKey: ["/api/arrime/fincas"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/arrime/registros", {
        fecha: data.fecha,
        central: data.central,
        cantidad: parseFloat(data.cantidad),
        grado: data.grado ? parseFloat(data.grado) : null,
        finca: data.finca || null,
        remesa: data.remesa || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/arrime/registros"] });
      toast({ title: "Registro creado", description: "El registro se ha guardado correctamente." });
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        central: "",
        cantidad: "",
        grado: "",
        finca: "",
        remesa: ""
      });
      setShowForm(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el registro.", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/arrime/registros/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/arrime/registros"] });
      toast({ title: "Eliminado", description: "El registro fue eliminado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el registro.", variant: "destructive" });
    }
  });

  const filteredRegistros = useMemo(() => {
    return registros.filter(r => {
      if (!isDateInWeek(r.fecha, selectedWeek)) return false;
      if (filterCentral !== "all" && r.central !== filterCentral) return false;
      if (filterFinca !== "all" && r.finca !== filterFinca) return false;
      return true;
    });
  }, [registros, selectedWeek, filterCentral, filterFinca]);

  const totals = useMemo(() => {
    const totalCantidad = filteredRegistros.reduce((sum, r) => sum + r.cantidad, 0);
    const registrosConGrado = filteredRegistros.filter(r => r.grado !== null && r.grado !== undefined);
    const cantidadConGrado = registrosConGrado.reduce((sum, r) => sum + r.cantidad, 0);
    const avgGrado = cantidadConGrado > 0 
      ? registrosConGrado.reduce((sum, r) => sum + (r.cantidad * (r.grado ?? 0)), 0) / cantidadConGrado 
      : 0;
    return { totalCantidad, avgGrado, count: filteredRegistros.length };
  }, [filteredRegistros]);

  const weekRange = getWeekDateRange(selectedWeek);
  const availableWeeks = getAvailableWeeks();
  const uniqueCentrales = Array.from(new Set(registros.map(r => r.central))).sort();
  const uniqueFincas = Array.from(new Set(registros.map(r => r.finca).filter(Boolean))).sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fecha || !formData.central || !formData.cantidad) {
      toast({ title: "Error", description: "Complete los campos requeridos.", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este registro?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <MyWindow
      id={id}
      title="Arrime de Caña"
      icon={<Factory className="h-4 w-4 text-white" />}
      borderColor="border-green-600"
      onClose={onClose}
      initialPosition={initialPosition}
      initialSize={{ width: 900, height: 600 }}
      canMinimize
      popoutUrl="/arrime"
    >
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MyButtonStyle 
              color="gray" 
              onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
              disabled={selectedWeek <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </MyButtonStyle>
            <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map(w => (
                  <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MyButtonStyle 
              color="gray" 
              onClick={() => setSelectedWeek(w => w + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </MyButtonStyle>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateSpanish(weekRange.start)} - {formatDateSpanish(weekRange.end)}</span>
          </div>

          <Select value={filterCentral} onValueChange={setFilterCentral}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Central" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueCentrales.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterFinca} onValueChange={setFilterFinca}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Finca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueFincas.map(f => (
                <SelectItem key={f!} value={f!}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <MyButtonStyle color="blue" onClick={() => refetchRegistros()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
          </MyButtonStyle>

          <MyButtonStyle color="green" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> {showForm ? "Ocultar" : "Nuevo"}
          </MyButtonStyle>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-3 border-b bg-muted/20 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Label>Fecha *</Label>
                <Input 
                  type="date" 
                  value={formData.fecha}
                  onChange={e => setFormData({...formData, fecha: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Central *</Label>
                <Select value={formData.central} onValueChange={v => setFormData({...formData, central: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {centrales.map(c => (
                      <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cantidad *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.cantidad}
                  onChange={e => setFormData({...formData, cantidad: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Grado</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.grado}
                  onChange={e => setFormData({...formData, grado: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Finca</Label>
                <Select value={formData.finca} onValueChange={v => setFormData({...formData, finca: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin finca</SelectItem>
                    {fincas.map(f => (
                      <SelectItem key={f.id} value={f.nombre}>{f.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Remesa</Label>
                <Input 
                  value={formData.remesa}
                  onChange={e => setFormData({...formData, remesa: e.target.value})}
                  placeholder="Código"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <MyButtonStyle color="gray" onClick={() => setShowForm(false)}>
                Cancelar
              </MyButtonStyle>
              <MyButtonStyle color="green" loading={createMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </MyButtonStyle>
            </div>
          </form>
        )}

        <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 border-b">
          <Badge variant="outline" className="px-3 py-1">
            <Database className="h-3 w-3 mr-1" />
            {totals.count} registros
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <span className="text-muted-foreground mr-1">Total:</span>
            <span className="font-semibold tabular-nums">{formatNumber(totals.totalCantidad)} TC</span>
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <span className="text-muted-foreground mr-1">Grado Prom:</span>
            <span className="font-semibold tabular-nums">{formatNumber(totals.avgGrado)}</span>
          </Badge>
        </div>

        <div className="flex-1 overflow-auto">
          {loadingRegistros ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay registros</h3>
              <p className="text-muted-foreground">
                No se encontraron registros para la semana {selectedWeek}.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="border-b">
                  <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                  <th className="text-left px-3 py-2 font-semibold">Central</th>
                  <th className="text-left px-3 py-2 font-semibold">Finca</th>
                  <th className="text-right px-3 py-2 font-semibold">Cantidad</th>
                  <th className="text-right px-3 py-2 font-semibold">Grado</th>
                  <th className="text-left px-3 py-2 font-semibold">Remesa</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.map((r, idx) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{formatDateDisplay(r.fecha)}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{r.central}</Badge>
                    </td>
                    <td className="px-3 py-2">{r.finca || "-"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatNumber(r.cantidad)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.grado !== null ? formatNumber(r.grado) : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.remesa || "-"}
                    </td>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/80 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 font-bold">
                    TOTALES ({totals.count} registros)
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">
                    {formatNumber(totals.totalCantidad)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">
                    {formatNumber(totals.avgGrado)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </MyWindow>
  );
}
