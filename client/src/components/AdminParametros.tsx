import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, ListChecks, Package, ShoppingBag, Users, Truck, Briefcase } from "lucide-react";

const genericColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const personalColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 160, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 110, type: "text" },
  { key: "cargo", label: "Cargo", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 150, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 130, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 110, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 150, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 160, type: "text" },
  { key: "cheque", label: "Ch", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "transferencia", label: "Tr", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const proveedoresColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 140, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 170, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 180, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const cargosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
  { key: "valor", label: "Sueldo/Día", defaultWidth: 120, type: "number" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const paramSubTabs = [
  { id: "actividades", label: "Actividades", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "insumos", label: "Insumos", icon: <Package className="h-3.5 w-3.5" /> },
  { id: "productos", label: "Productos", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: "personal", label: "Personal", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "proveedores", label: "Proveedores", icon: <Truck className="h-3.5 w-3.5" /> },
  { id: "cargos", label: "Cargos", icon: <Briefcase className="h-3.5 w-3.5" /> },
];

const tipoMap: Record<string, string> = {
  actividades: "actividades",
  insumos: "insumos",
  productos: "productos",
  personal: "personal",
  proveedores: "proveedores",
  cargos: "cargos finca",
};

function getColumns(tab: string): Column[] {
  if (tab === "personal") return personalColumns;
  if (tab === "proveedores") return proveedoresColumns;
  if (tab === "cargos") return cargosColumns;
  return genericColumns;
}

interface AdminParametrosProps {
  filtroDeUnidad?: string;
}

export default function AdminParametros({ filtroDeUnidad }: AdminParametrosProps) {
  const [activeParamTab, setActiveParamTab] = useState("actividades");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const tipo = tipoMap[activeParamTab] || activeParamTab;

  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => {
      if (row.tipo !== tipo) return false;
      if (filtroDeUnidad && filtroDeUnidad !== "all") {
        const rowUnidad = (row.unidad || "").toString().toLowerCase().trim();
        const filterUnidad = filtroDeUnidad.toLowerCase().trim();
        if (rowUnidad && rowUnidad !== filterUnidad) return false;
      }
      return true;
    });
  }, [allParametros, tipo, filtroDeUnidad]);

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
    record.unidad = filtroDeUnidad && filtroDeUnidad !== "all" ? filtroDeUnidad : (record.unidad || "");
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
      activeTab={activeParamTab}
      onTabChange={(id) => { setActiveParamTab(id); setSelectedRowId(null); }}
      testIdPrefix="tab-admin-param"
    >
      <MyGrid
        tableId={`admin-param-${activeParamTab}`}
        tableName="parametros"
        columns={getColumns(activeParamTab)}
        data={filteredData}
        selectedRowId={selectedRowId}
        onRowClick={(row) => setSelectedRowId(row.id)}
        onSaveNew={handleSaveNew}
        onRefresh={handleRefresh}
        onBooleanChange={handleBooleanChange}
        currentTabName={tipo}
        onRecordSaved={(record) => setSelectedRowId(record.id)}
      />
    </MySubTabs>
  );
}
