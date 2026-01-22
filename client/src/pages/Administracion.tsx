import { useState, useMemo } from "react";
import { Building2 } from "lucide-react";
import MyWindow from "@/components/MyWindow";
import MyFilter from "@/components/MyFilter";
import MyFiltroDeUnidad from "@/components/MyFiltroDeUnidad";
import MyTab, { type TabConfig } from "@/components/MyTab";

const adminTabs: TabConfig[] = [
  {
    id: "facturas",
    label: "Facturas",
    tipo: "facturas",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150 },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "comprobant", label: "Comprobante", defaultWidth: 100, type: "number" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    tipo: "nomina",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "personal", label: "Personal", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "actividad", label: "Actividad", defaultWidth: 120 },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "ventas",
    label: "Ventas",
    tipo: "ventas",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150 },
      { key: "producto", label: "Producto", defaultWidth: 150 },
      { key: "cantidad", label: "Cantidad", defaultWidth: 80, align: "right", type: "number" },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "cuentasporcobrar",
    label: "Cuentas por Cobrar",
    tipo: "cuentasporcobrar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "cliente", label: "Cliente", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "cuentasporpagar",
    label: "Cuentas por Pagar",
    tipo: "cuentasporpagar",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "proveedor", label: "Proveedor", defaultWidth: 150 },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
  {
    id: "prestamos",
    label: "Préstamos",
    tipo: "prestamos",
    columns: [
      { key: "fecha", label: "Fecha", defaultWidth: 90, type: "date" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200 },
      { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
      { key: "montodol", label: "Monto $", defaultWidth: 100, align: "right", type: "number" },
      { key: "capital", label: "Capital", defaultWidth: 80, type: "boolean" },
      { key: "utility", label: "Utilidad", defaultWidth: 80, type: "boolean" },
      { key: "formadepag", label: "Forma Pago", defaultWidth: 100 },
      { key: "evidenciado", label: "Evidenciado", defaultWidth: 90, type: "boolean" },
    ],
  },
];

interface AdminContentProps {
  tableData?: Record<string, any>[];
}

function AdminContent({ tableData = [] }: AdminContentProps) {
  const [activeTab, setActiveTab] = useState("facturas");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [unidadFilter, setUnidadFilter] = useState("all");

  const filteredData = useMemo(() => {
    if (unidadFilter === "all") return tableData;
    return tableData.filter((r) => r.unidad === unidadFilter);
  }, [tableData, unidadFilter]);

  const handleClearFilters = () => {
    setUnidadFilter("all");
  };

  const handleRowClick = (row: Record<string, any>) => {
    setSelectedRowId(row.id);
  };

  return (
    <div className="flex flex-col h-full p-3">
      <MyFilter onClearFilters={handleClearFilters}>
        <MyFiltroDeUnidad
          value={unidadFilter}
          onChange={setUnidadFilter}
          valueType="nombre"
          showLabel={true}
          testId="admin-filtro-unidad"
        />
      </MyFilter>

      <div className="flex-1 overflow-hidden mt-2">
        <MyTab
          tabs={adminTabs}
          data={filteredData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRowClick={handleRowClick}
          selectedRowId={selectedRowId}
          icon={<Building2 className="h-4 w-4 text-indigo-500" />}
          title="Tipo"
        />
      </div>
    </div>
  );
}

interface AdministracionProps {
  onBack: () => void;
  onLogout: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function Administracion({ onBack, onFocus, zIndex }: AdministracionProps) {
  return (
    <MyWindow
      id="administracion"
      title="Administración"
      icon={<Building2 className="h-4 w-4 text-indigo-500" />}
      initialPosition={{ x: 120, y: 80 }}
      initialSize={{ width: 1000, height: 650 }}
      minSize={{ width: 600, height: 400 }}
      maxSize={{ width: 1400, height: 900 }}
      onClose={onBack}
      onFocus={onFocus}
      zIndex={zIndex}
      borderColor="border-indigo-500/40"
      autoLoadTable={true}
    >
      <AdminContent />
    </MyWindow>
  );
}
