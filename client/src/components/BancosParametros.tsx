import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useMyPop } from "@/components/MyPop";
import { getStoredUsername } from "@/lib/auth";
import { MyButtonStyle } from "@/components/MyButtonStyle";
import MySubTabs from "@/components/MySubTabs";
import MyGrid, { type Column } from "@/components/MyGrid";
import { Loader2, Landmark, DollarSign, CreditCard, RefreshCw } from "lucide-react";

const bancosColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "transferencia", label: "T", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const dolarColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
  { key: "valor", label: "Valor", defaultWidth: 120, type: "number", align: "right" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const formadepagoColumns: Column[] = [
  { key: "habilitado", label: "H", defaultWidth: 32, type: "boolean", align: "center" },
  { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
  { key: "operador", label: "Operador", defaultWidth: 100, type: "text" },
  { key: "propietario", label: "Propietario", defaultWidth: 120, type: "text" },
];

const paramSubTabs = [
  { id: "bancos", label: "Bancos", icon: <Landmark className="h-3.5 w-3.5" /> },
  { id: "dolar", label: "Dólar", icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: "formadepago", label: "Operaciones Bancarias", icon: <CreditCard className="h-3.5 w-3.5" /> },
];

const tipoMap: Record<string, string> = {
  bancos: "bancos",
  dolar: "dolar",
  formadepago: "formadepago",
};

export default function BancosParametros() {
  const [activeTab, setActiveTab] = useState("bancos");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [bcvLoading, setBcvLoading] = useState(false);
  const { showPop } = useMyPop();

  const handleConsultarBcv = async () => {
    setBcvLoading(true);
    try {
      const res = await fetch("/api/bcv-dolar");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showPop({ title: "Error", message: err.error || "No se pudo consultar el BCV" });
        return;
      }
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/parametros"] });
      showPop({
        title: "Tasa BCV",
        message: data.inserted
          ? `Tasa del dólar BCV: ${data.valor} Bs. (${data.fecha}) - Registrada exitosamente`
          : `Tasa del dólar BCV: ${data.valor} Bs. (${data.fecha}) - Ya existía para hoy`,
      });
    } catch {
      showPop({ title: "Error", message: "Error de conexión al consultar el BCV" });
    } finally {
      setBcvLoading(false);
    }
  };

  const tipo = tipoMap[activeTab] || activeTab;

  const newRecordDefaults = useMemo(() => ({
    tipo,
  }), [tipo]);

  const { data: allParametros = [], isLoading } = useQuery<Record<string, any>[]>({
    queryKey: ["/api/parametros"],
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
      const res = await fetch(`/api/parametros/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        queryClient.setQueriesData(
          { queryKey: ["/api/parametros"] },
          (oldData: any) => Array.isArray(oldData) ? oldData.map((r: any) => String(r.id) === String(row.id) ? { ...r, [field]: value } : r) : oldData
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
      case "bancos":
        return bancosColumns;
      case "dolar":
        return dolarColumns;
      case "formadepago":
        return formadepagoColumns;
      default:
        return bancosColumns;
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
      testIdPrefix="tab-bancos-param"
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === "dolar" && (
          <div className="flex items-center gap-2 px-2 py-1">
            <MyButtonStyle color="blue" loading={bcvLoading} onClick={handleConsultarBcv}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Consultar BCV
            </MyButtonStyle>
          </div>
        )}
        <MyGrid
          key={`bancos-param-${activeTab}`}
          tableId={`bancos-param-${activeTab}`}
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
      </div>
    </MySubTabs>
  );
}
