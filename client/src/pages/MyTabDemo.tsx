import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import FloatingWindow from "@/components/FloatingWindow";
import MyTab, { defaultTabs } from "@/components/MyTab";
import { useToast } from "@/hooks/use-toast";
import { Table2 } from "lucide-react";

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
}

interface MyTabDemoProps {
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function MyTabDemo({ onClose, onFocus, zIndex = 100 }: MyTabDemoProps) {
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

  const handleBooleanChange = (row: Record<string, any>, field: string, value: boolean) => {
    updateMutation.mutate({ id: row.id, field, value });
  };

  const handleDelete = (row: Record<string, any>) => {
    toast({
      title: "¿Está seguro?",
      description: `Borrar: ${row.nombre}`,
      action: (
        <button
          onClick={() => {
            toast({ title: "Borrado", description: `${row.nombre} eliminado` });
          }}
          className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm"
        >
          Confirmar
        </button>
      ),
    });
  };

  const handleCopy = (row: Record<string, any>) => {
    toast({
      title: "Copiado",
      description: `${row.nombre} copiado al portapapeles`,
    });
  };

  const handleEdit = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
    toast({
      title: "Editar",
      description: `Editando: ${row.nombre}`,
    });
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  return (
    <FloatingWindow
      id="mytab-demo"
      title="Demo MyTab"
      icon={<Table2 className="h-4 w-4 text-primary" />}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      initialSize={{ width: 1000, height: 600 }}
      initialPosition={{ x: 150, y: 80 }}
      minSize={{ width: 700, height: 400 }}
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
