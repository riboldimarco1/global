import { useState } from "react";
import { Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import MyWindow from "@/components/MyWindow";
import MyTab, { type TabConfig } from "@/components/MyTab";
import { type Column } from "@/components/MyGrid";

const baseColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
  { key: "descripcion", label: "Descripción", defaultWidth: 220 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
  { key: "capital", label: "Cap", defaultWidth: 45, type: "boolean", align: "center" },
  { key: "anticipo", label: "Ant", defaultWidth: 45, type: "boolean", align: "center" },
  { key: "unidad", label: "Unidad", defaultWidth: 100 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 120 },
];

const testTabs: TabConfig[] = [
  { id: "facturas", label: "Facturas", tipo: "facturas", columns: baseColumns },
  { id: "nomina", label: "Nómina", tipo: "nomina", columns: baseColumns },
  { id: "ventas", label: "Ventas", tipo: "ventas", columns: baseColumns },
];

const initialTestData = [
  { id: "1", fecha: "2026-01-20", tipo: "facturas", descripcion: "Compra de materiales", monto: 5000, capital: true, anticipo: false, unidad: "luvica", proveedor: "Ferretería ABC", utility: false },
  { id: "2", fecha: "2026-01-19", tipo: "facturas", descripcion: "Pago servicios", monto: 2500, capital: false, anticipo: true, unidad: "casa", proveedor: "CANTV", utility: true },
  { id: "3", fecha: "2026-01-18", tipo: "nomina", descripcion: "Pago quincenal", monto: 15000, capital: false, anticipo: false, unidad: "luvica", proveedor: "Personal", utility: false },
  { id: "4", fecha: "2026-01-17", tipo: "ventas", descripcion: "Venta de productos", monto: 8500, capital: true, anticipo: true, unidad: "agrosuinos", proveedor: "Cliente X", utility: true },
  { id: "5", fecha: "2026-01-16", tipo: "facturas", descripcion: "Combustible", monto: 3200, capital: false, anticipo: false, unidad: "luvica", proveedor: "Estación", utility: false },
  { id: "6", fecha: "2026-01-15", tipo: "facturas", descripcion: "Alimento animales", monto: 12000, capital: true, anticipo: false, unidad: "agrosuinos", proveedor: "Agropecuaria", utility: false },
  { id: "7", fecha: "2026-01-14", tipo: "nomina", descripcion: "Bono especial", monto: 5000, capital: false, anticipo: true, unidad: "casa", proveedor: "Personal", utility: true },
  { id: "8", fecha: "2026-01-13", tipo: "ventas", descripcion: "Venta ganado", monto: 45000, capital: true, anticipo: false, unidad: "la pastoreña", proveedor: "Comprador Y", utility: false },
  { id: "9", fecha: "2026-01-12", tipo: "facturas", descripcion: "Reparación equipo", monto: 7800, capital: false, anticipo: true, unidad: "luvica", proveedor: "Técnico", utility: false },
  { id: "10", fecha: "2026-01-11", tipo: "facturas", descripcion: "Insumos agrícolas", monto: 25000, capital: true, anticipo: false, unidad: "luvica", proveedor: "AgroVentas", utility: true },
  { id: "11", fecha: "2026-01-10", tipo: "nomina", descripcion: "Aguinaldo", monto: 35000, capital: false, anticipo: false, unidad: "luvica", proveedor: "Personal", utility: false },
  { id: "12", fecha: "2026-01-09", tipo: "ventas", descripcion: "Venta cosecha", monto: 120000, capital: false, anticipo: true, unidad: "luvica", proveedor: "Agrícola XY", utility: true },
];

interface TestContentProps {
  tableData: Record<string, any>[];
  onBooleanChange: (row: Record<string, any>, field: string, value: boolean) => void;
}

function TestContent({ tableData, onBooleanChange }: TestContentProps) {
  const [activeTab, setActiveTab] = useState("facturas");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col gap-2 p-2" data-testid="container-test-content">
      <div className="text-sm text-muted-foreground" data-testid="text-record-count">
        Datos de prueba: {tableData.length} registros (haz clic en Cap, Ant o Uti para cambiar)
      </div>
      <div className="flex-1 overflow-hidden">
        <MyTab
          tabs={testTabs}
          data={tableData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRowClick={(row) => setSelectedRowId(row.id)}
          selectedRowId={selectedRowId}
          onEdit={(row) => console.log("Edit:", row)}
          onCopy={(row) => console.log("Copy:", row)}
          onDelete={(row) => console.log("Delete:", row)}
          onBooleanChange={onBooleanChange}
          showUtilityColumn={true}
          showPropColumn={false}
          icon={<FileText className="h-4 w-4 text-violet-500" />}
          title="Tipo"
        />
      </div>
    </div>
  );
}

export default function TestWindow() {
  const [isOpen, setIsOpen] = useState(true);
  const [testData, setTestData] = useState(initialTestData);

  const handleBooleanChange = (row: Record<string, any>, field: string, value: boolean) => {
    setTestData(prev => 
      prev.map(item => 
        item.id === row.id ? { ...item, [field]: value } : item
      )
    );
  };

  if (!isOpen) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Button
          onClick={() => setIsOpen(true)}
          data-testid="button-reopen-window"
        >
          Abrir Ventana de Prueba
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <MyWindow
        id="test-admin"
        title="Test Administración"
        icon={<Building2 className="h-4 w-4 text-indigo-400" />}
        initialPosition={{ x: 100, y: 50 }}
        initialSize={{ width: 1000, height: 500 }}
        onClose={() => setIsOpen(false)}
        borderColor="border-indigo-500/50"
        zIndex={50}
      >
        <TestContent tableData={testData} onBooleanChange={handleBooleanChange} />
      </MyWindow>
    </div>
  );
}
