import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, Wifi, ClipboardList } from "lucide-react";

const equiposredColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const planesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "direccion", label: "Monto", defaultWidth: 100, type: "number", align: "right" },
  { key: "telefono", label: "Monto $", defaultWidth: 100, type: "number", align: "right" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const paramSubTabs = [
  { id: "equiposred", label: "Equipos de Red", icon: <Wifi className="h-3.5 w-3.5" /> },
  { id: "planes", label: "Planes", icon: <ClipboardList className="h-3.5 w-3.5" /> },
];

const tipoMap: Record<string, string> = {
  equiposred: "equiposred",
  planes: "planes",
};

export default function AgrodataParametros() {
  const [activeTab, setActiveTab] = useState("equiposred");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const tipo = tipoMap[activeTab] || activeTab;

  const newRecordDefaults = useMemo(() => ({
    tipo,
  }), [tipo]);

  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => row.tipo === tipo);
  }, [allParametros, tipo]);

  const handleSaveNew = async (data: Record<string, any>, onComplete?: (saved: Record<string, any>) => void) => {
    const username = getStoredUsername() || "sistema";
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const record: Record<string, any> = { ...data };
    record.tipo = tipo;
    record.habilitado = record.habilitado !== undefined ? record.habilitado : true;
    record.propietario = `${username} ${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    record._username = username;

    Object.keys(record).forEach(k => {
      if (typeof record[k] === "string") record[k] = record[k].toLowerCase();
    });

    try {
      const res = await fetch("/api/parametros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const saved = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
        if (onComplete) onComplete(saved);
      } else {
        showPop({ title: "Error", message: "No se pudo guardar el registro" });
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

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSelectedRowId(null);
  };

  const getColumns = (): Column[] => {
    switch (activeTab) {
      case "equiposred":
        return equiposredColumns;
      case "planes":
        return planesColumns;
      default:
        return equiposredColumns;
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
    <MySubTabs
      tabs={paramSubTabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      testIdPrefix="tab-agrodata-param"
    >
      <MyGrid
        key={`agrodata-param-${activeTab}`}
        tableId={`agrodata-param-${activeTab}`}
        tableName="parametros"
        columns={getColumns()}
        data={filteredData}
        selectedRowId={selectedRowId}
        onRowClick={(row) => setSelectedRowId(row.id)}
        onSaveNew={handleSaveNew}
        onRefresh={handleRefresh}
        onBooleanChange={handleBooleanChange}
        currentTabName={tipo}
        newRecordDefaults={newRecordDefaults}
        onRecordSaved={(record) => setSelectedRowId(record.id)}
      />
    </MySubTabs>
  );
}
