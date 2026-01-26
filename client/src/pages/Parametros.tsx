import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, Search, X } from "lucide-react";
import { MyWindow, MyTab } from "@/components/My";
import { parametrosTabs } from "@/config/parametrosTabs";
import { useToast } from "@/hooks/use-toast";
import { useTableData } from "@/contexts/TableDataContext";
import { useParametrosOptions } from "@/hooks/useParametrosOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Filters {
  nombre: string;
  unidad: string;
  habilitado: "todos" | "activo" | "inactivo";
}

interface ParametrosProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

function ParametrosContent() {
  const [activeTab, setActiveTab] = useState("unidad");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ nombre: "", unidad: "", habilitado: "todos" });
  const { toast } = useToast();
  const { tableData } = useTableData();
  const unidades = useParametrosOptions("unidad");

  const hasActiveFilters = filters.nombre !== "" || filters.habilitado !== "todos";

  const clearFilters = () => {
    setFilters({ nombre: "", unidad: filters.unidad, habilitado: "todos" });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      return apiRequest("PATCH", `/api/parametros/${id}`, { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro",
        variant: "destructive",
      });
    },
  });

  const handleBooleanChange = (row: Record<string, any>, field: string, value: boolean) => {
    updateMutation.mutate({ id: row.id, field, value });
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

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
                value={filters.unidad || unidades[0] || ""} 
                onValueChange={(value) => setFilters(f => ({ ...f, unidad: value }))}
              >
                <SelectTrigger id="filter-unidad" className="w-[150px] h-8 text-sm" data-testid="select-filter-unidad">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-habilitado" className="text-xs font-medium whitespace-nowrap">Habilitado:</Label>
              <Select 
                value={filters.habilitado} 
                onValueChange={(value: "todos" | "activo" | "inactivo") => setFilters(f => ({ ...f, habilitado: value }))}
              >
                <SelectTrigger id="filter-habilitado" className="w-[110px] h-8 text-sm" data-testid="select-filter-habilitado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        </CardContent>
      </Card>
      <div className="flex-1 overflow-hidden">
        <MyTab
          tabs={parametrosTabs}
          icon={<Settings className="h-4 w-4 text-muted-foreground" />}
          title="Configuración"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onBooleanChange={handleBooleanChange}
          showPropColumn={false}
          tableName="parametros"
          filterFn={(row) => {
            if (filters.nombre && !row.nombre?.toLowerCase().includes(filters.nombre.toLowerCase())) {
              return false;
            }
            if (filters.unidad && row.unidad !== filters.unidad) {
              return false;
            }
            if (filters.habilitado === "activo" && row.abilitado !== true) {
              return false;
            }
            if (filters.habilitado === "inactivo" && row.abilitado !== false) {
              return false;
            }
            return true;
          }}
        />
      </div>
    </div>
  );
}

export default function Parametros({ onBack, onFocus, zIndex }: ParametrosProps) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/parametros/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      toast({ title: "Eliminado", description: "Registro eliminado exitosamente" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Está seguro?",
      description: `Eliminar: ${row.nombre || "registro"}`,
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteMutation.mutate(row.id)}
          data-testid="button-confirm-delete"
        >
          Confirmar
        </Button>
      ),
    });
  };

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

  return (
    <MyWindow
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
      autoLoadTable={true}
      limit={100}
      onEdit={handleEdit}
      onCopy={handleCopy}
      onDelete={handleDelete}
    >
      <ParametrosContent />
    </MyWindow>
  );
}
