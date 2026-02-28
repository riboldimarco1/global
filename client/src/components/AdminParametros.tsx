import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, ListChecks, Package, ShoppingBag, Users, Truck, Briefcase, UserCheck } from "lucide-react";

const actividadesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const insumosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const productosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const personalColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Beneficiario", defaultWidth: 200, type: "text" },
  { key: "ced_rif", label: "Cedrif", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "cargo", label: "Cargo", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const proveedoresColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Beneficiario", defaultWidth: 200, type: "text" },
  { key: "ced_rif", label: "Cedrif", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const cargosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 250, type: "text" },
  { key: "valor", label: "Sueldo/día $", defaultWidth: 120, type: "number", align: "right" },
  { key: "propietario", label: "Propietario", defaultWidth: 150, type: "text" },
];

const clientesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const paramSubTabs = [
  { id: "actividades", label: "Actividades", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "cargos", label: "Cargos", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { id: "clientes", label: "Clientes", icon: <UserCheck className="h-3.5 w-3.5" /> },
  { id: "insumos", label: "Insumos", icon: <Package className="h-3.5 w-3.5" /> },
  { id: "personal", label: "Personal", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "productos", label: "Productos", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: "proveedores", label: "Proveedores", icon: <Truck className="h-3.5 w-3.5" /> },
];

const tipoMap: Record<string, string> = {
  actividades: "actividades",
  insumos: "insumos",
  productos: "productos",
  personal: "personal",
  proveedores: "proveedores",
  cargos: "cargo",
  clientes: "clientes",
};

interface AdminParametrosProps {
  filtroDeUnidad?: string;
}

export default function AdminParametros({ filtroDeUnidad }: AdminParametrosProps) {
  const [activeParamTab, setActiveParamTab] = useState("actividades");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const tipo = tipoMap[activeParamTab] || activeParamTab;

  const newRecordDefaults = useMemo(() => ({
    tipo,
    unidad: filtroDeUnidad && filtroDeUnidad !== "all" ? filtroDeUnidad : "",
  }), [tipo, filtroDeUnidad]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tipo", tipo);
    if (filtroDeUnidad && filtroDeUnidad !== "all") params.set("unidad", filtroDeUnidad);
    return `/api/parametros?${params.toString()}`;
  }, [tipo, filtroDeUnidad]);

  const { data: filteredData = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: [queryUrl],
  });

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
        queryClient.setQueriesData(
          { queryKey: [queryUrl] },
          (oldData: any) => Array.isArray(oldData) ? [...oldData, saved] : oldData
        );
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey[0];
            return typeof key === "string" && key.startsWith("/api/parametros") && key !== queryUrl;
          },
        });
        if (onComplete) onComplete(saved);
      } else {
        showPop({ title: "Error", message: "No se pudo guardar el registro" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryUrl] });
  };

  const handleBooleanChange = async (row: Record<string, any>, field: string, value: boolean) => {
    try {
      const now = new Date();
      const propietario = `${localStorage.getItem("current_username") || "unknown"} ${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value, propietario }),
      });
      if (res.ok) {
        queryClient.setQueriesData(
          { queryKey: [queryUrl] },
          (oldData: any) => Array.isArray(oldData) ? oldData.map((r: any) => String(r.id) === String(row.id) ? { ...r, [field]: value, propietario } : r) : oldData
        );
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey[0];
            return typeof key === "string" && key.startsWith("/api/parametros") && key !== queryUrl;
          },
        });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
  };

  const handleTabChange = (id: string) => {
    setActiveParamTab(id);
    setSelectedRowId(null);
  };

  const getColumns = (): Column[] => {
    switch (activeParamTab) {
      case "actividades":
        return actividadesColumns;
      case "insumos":
        return insumosColumns;
      case "productos":
        return productosColumns;
      case "personal":
        return personalColumns;
      case "proveedores":
        return proveedoresColumns;
      case "cargos":
        return cargosColumns;
      case "clientes":
        return clientesColumns;
      default:
        return actividadesColumns;
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
      onTabChange={handleTabChange}
      testIdPrefix="tab-admin-param"
    >
      <MyGrid
        key={`admin-param-${activeParamTab}`}
        tableId={`admin-param-${activeParamTab}`}
        tableName="parametros"
        columns={getColumns()}
        data={filteredData}
        selectedRowId={selectedRowId}
        onRowClick={(row) => setSelectedRowId(row.id)}
        onSaveNew={handleSaveNew}
        onRefresh={handleRefresh}
        onBooleanChange={handleBooleanChange}
        currentTabName={tipo}
        filtroDeUnidad={filtroDeUnidad}
        newRecordDefaults={newRecordDefaults}
        onRecordSaved={(record) => setSelectedRowId(record.id)}
        localSearchField="nombre"
      />
    </MySubTabs>
  );
}
