import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import MyGrid, { type Column } from "./MyGrid";
import { useMyPop } from "./MyPop";
import { queryClient } from "@/lib/queryClient";
import { getStoredUsername } from "@/lib/auth";

const actividadesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

export default function ActividadesParametros() {
  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => row.tipo === "actividades");
  }, [allParametros]);

  const handleSaveNew = async (data: Record<string, any>, onComplete?: (saved: Record<string, any>) => void) => {
    const username = getStoredUsername() || "sistema";
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

    try {
      const res = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tipo: "actividades",
          habilitado: data.habilitado ?? true,
          propietario,
          _username: username,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
        onComplete?.(saved);
      } else {
        showPop({ title: "Error", message: "Error al guardar" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleEdit = async (row: Record<string, any>) => {
    try {
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleRemove = async (id: string | number) => {
    try {
      const res = await fetch(`/api/parametros/${id}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
  };

  const handleBooleanChange = async (row: Record<string, any>, field: string, value: boolean) => {
    try {
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <MyGrid
      tableId="admin-param-actividades"
      columns={actividadesColumns}
      data={filteredData}
      onRowClick={(row) => setSelectedRowId(row.id)}
      selectedRowId={selectedRowId}
      onEdit={handleEdit}
      onSaveNew={handleSaveNew}
      onRefresh={handleRefresh}
      onRemove={handleRemove}
      onBooleanChange={handleBooleanChange}
      onRecordSaved={(record) => setSelectedRowId(record.id)}
      tableName="parametros"
      currentTabName="actividades"
      newRecordDefaults={{ tipo: "actividades", habilitado: true, unidad: "" }}
    />
  );
}
