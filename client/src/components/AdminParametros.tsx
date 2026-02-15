import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, ListChecks, Package, ShoppingBag, Users, Truck, Briefcase } from "lucide-react";

const actividadesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const insumosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const productosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const personalColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
  { key: "categoria", label: "Cargo", defaultWidth: 140, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const proveedoresColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
  { key: "correo", label: "Correo", defaultWidth: 180, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const cargosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "valor", label: "Sueldo/día $", defaultWidth: 120, type: "number", align: "right" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
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

const tabConfigMap: Record<string, { tipo: string; columns: Column[] }> = {
  actividades: { tipo: "actividades", columns: actividadesColumns },
  insumos: { tipo: "insumos", columns: insumosColumns },
  productos: { tipo: "productos", columns: productosColumns },
  personal: { tipo: "personal", columns: personalColumns },
  proveedores: { tipo: "proveedores", columns: proveedoresColumns },
  cargos: { tipo: "cargos finca", columns: cargosColumns },
};

function ParamSubGrid({ tipo, columns }: { tipo: string; columns: Column[] }) {
  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
    staleTime: 0,
  });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

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
    record.unidad = record.unidad || "";
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

  const handleRemove = async (id: string | number) => {
    try {
      const res = await fetch(`/api/parametros/${id}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      } else {
        showPop({ title: "Error", message: "No se pudo eliminar" });
      }
    } catch {
      showPop({ title: "Error", message: "Error de conexión" });
    }
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
      tableId={`admin-param-${tipo}`}
      tableName="registros"
      columns={columns}
      data={filteredData}
      selectedRowId={selectedRowId}
      onRowClick={(row) => setSelectedRowId(row.id)}
      onSaveNew={handleSaveNew}
      onRefresh={handleRefresh}
      onRemove={handleRemove}
      onBooleanChange={handleBooleanChange}
      currentTabName={tipo}
      onRecordSaved={(record) => setSelectedRowId(record.id)}
    />
  );
}

interface AdminParametrosProps {
  filtroDeUnidad?: string;
}

export default function AdminParametros({ filtroDeUnidad }: AdminParametrosProps) {
  const [activeParamTab, setActiveParamTab] = useState("actividades");

  const currentConfig = tabConfigMap[activeParamTab];

  return (
    <MySubTabs
      tabs={paramSubTabs}
      activeTab={activeParamTab}
      onTabChange={setActiveParamTab}
      testIdPrefix="tab-admin-param"
    >
      {currentConfig && (
        <ParamSubGrid
          tipo={currentConfig.tipo}
          columns={currentConfig.columns}
        />
      )}
    </MySubTabs>
  );
}
