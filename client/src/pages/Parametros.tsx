import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings } from "lucide-react";
import FloatingWindow from "@/components/FloatingWindow";
import MyTab, { defaultTabs } from "@/components/MyTab";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Parametro {
  id: string;
  fecha: string | null;
  clase: string | null;
  nombre: string | null;
  unidad: string | null;
  direccion: string | null;
  telefono: string | null;
  ced_rif: string | null;
  descripcion: string | null;
  abilitado: boolean | null;
  cheque: boolean | null;
  transferencia: boolean | null;
  propietario: string | null;
  evidenciado: string | null;
  operador: string | null;
  valor: number | null;
}

interface ParametrosProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function Parametros({ onBack, onFocus, zIndex }: ParametrosProps) {
  const [activeTab, setActiveTab] = useState("unidades");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

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

  const handleBooleanChange = (row: Record<string, any>, field: string, value: boolean) => {
    updateMutation.mutate({ id: row.id, field, value });
  };

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Está seguro?",
      description: `Eliminar: ${row.nombre || "registro"}`,
      action: (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteMutation.mutate(row.id)}
          className="h-7 text-[10px]"
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
      description: `Datos de ${row.nombre || "registro"} copiados`,
    });
  };

  const handleEdit = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    toast({
      title: "Editar",
      description: `Editando: ${row.nombre || "registro"}`,
    });
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

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
      <div className="h-full p-2">
        <MyTab
          tabs={defaultTabs}
          data={parametros}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onBooleanChange={handleBooleanChange}
        />
      </div>
    </FloatingWindow>
  );
}
