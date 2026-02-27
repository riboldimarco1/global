import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, User, RefreshCw, Sprout, MapPin, Home, Navigation, Truck, ShoppingBag, Grid3X3 } from "lucide-react";

const choferesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "ced_rif", label: "Cédula", defaultWidth: 120, type: "text" },
  { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
  { key: "cuenta", label: "Cuenta", defaultWidth: 150, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const ciclosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const cultivosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const destinoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const fincasColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Código", defaultWidth: 120, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const origenColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const placasColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Placa", defaultWidth: 120, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "proveedor", label: "Proveedor", defaultWidth: 150, type: "text" },
  { key: "chofer", label: "Chofer", defaultWidth: 150, type: "text" },
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

const tablonesColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "unidad", label: "Unidad", defaultWidth: 120, type: "text" },
  { key: "hectareas", label: "Hectáreas", defaultWidth: 100, type: "number" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const paramSubTabs = [
  { id: "chofer", label: "Choferes", icon: <User className="h-3.5 w-3.5" /> },
  { id: "ciclos", label: "Ciclos", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  { id: "cultivo", label: "Cultivos", icon: <Sprout className="h-3.5 w-3.5" /> },
  { id: "destino", label: "Destino", icon: <MapPin className="h-3.5 w-3.5" /> },
  { id: "fincas", label: "Fincas", icon: <Home className="h-3.5 w-3.5" /> },
  { id: "origen", label: "Origen", icon: <Navigation className="h-3.5 w-3.5" /> },
  { id: "placa", label: "Placas", icon: <Truck className="h-3.5 w-3.5" /> },
  { id: "productos", label: "Productos", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: "tablones", label: "Tablones", icon: <Grid3X3 className="h-3.5 w-3.5" /> },
];

const tipoMap: Record<string, string> = {
  chofer: "chofer",
  ciclos: "ciclo",
  cultivo: "cultivo",
  destino: "destino",
  fincas: "fincas",
  origen: "origen",
  placa: "placa",
  productos: "productos",
  tablones: "tablones",
};

export default function CosechaParametros({ unidadFilter }: { unidadFilter: string }) {
  const [activeTab, setActiveTab] = useState("chofer");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { showPop } = useMyPop();

  const tipo = tipoMap[activeTab] || activeTab;

  const newRecordDefaults = useMemo(() => ({
    tipo,
    ...(unidadFilter && unidadFilter !== "all" ? { unidad: unidadFilter } : {}),
  }), [tipo, unidadFilter]);

  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
  });

  const filteredData = useMemo(() => {
    return allParametros.filter((row: Record<string, any>) => {
      if (row.tipo !== tipo) return false;
      if (unidadFilter && unidadFilter !== "all" && row.unidad && row.unidad !== unidadFilter) return false;
      return true;
    });
  }, [allParametros, tipo, unidadFilter]);

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
        queryClient.setQueriesData(
          { queryKey: ["/api/parametros"] },
          (oldData: any) => Array.isArray(oldData) ? [...oldData, saved] : oldData
        );
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
      const now = new Date();
      const propietario = `${localStorage.getItem("current_username") || "unknown"} ${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value, propietario }),
      });
      if (res.ok) {
        queryClient.setQueriesData(
          { queryKey: ["/api/parametros"] },
          (oldData: any) => Array.isArray(oldData) ? oldData.map((r: any) => String(r.id) === String(row.id) ? { ...r, [field]: value, propietario } : r) : oldData
        );
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
      case "chofer":
        return choferesColumns;
      case "ciclos":
        return ciclosColumns;
      case "cultivo":
        return cultivosColumns;
      case "destino":
        return destinoColumns;
      case "fincas":
        return fincasColumns;
      case "origen":
        return origenColumns;
      case "placa":
        return placasColumns;
      case "productos":
        return productosColumns;
      case "tablones":
        return tablonesColumns;
      default:
        return choferesColumns;
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
      testIdPrefix="tab-cosecha-param"
    >
      <MyGrid
        key={`cosecha-param-${activeTab}`}
        tableId={`cosecha-param-${activeTab}`}
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
        localSearchField="nombre"
      />
    </MySubTabs>
  );
}
