import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MyWindow from "@/components/MyWindow";
import MyGrid, { type Column } from "@/components/MyGrid";

const testColumns: Column[] = [
  { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
  { key: "tipo", label: "Tipo", defaultWidth: 100 },
  { key: "descripcion", label: "Descripción", defaultWidth: 250 },
  { key: "monto", label: "Monto", defaultWidth: 100, align: "right", type: "number" },
  { key: "unidad", label: "Unidad", defaultWidth: 120 },
  { key: "proveedor", label: "Proveedor", defaultWidth: 150 },
  { key: "actividad", label: "Actividad", defaultWidth: 150 },
];

const testData = [
  { id: "1", fecha: "2026-01-20", tipo: "facturas", descripcion: "Compra de materiales", monto: 5000, unidad: "luvica", proveedor: "Ferretería ABC", actividad: "mantenimiento" },
  { id: "2", fecha: "2026-01-19", tipo: "facturas", descripcion: "Pago servicios", monto: 2500, unidad: "casa", proveedor: "CANTV", actividad: "administracion" },
  { id: "3", fecha: "2026-01-18", tipo: "nomina", descripcion: "Pago quincenal", monto: 15000, unidad: "luvica", proveedor: "Personal", actividad: "nomina" },
  { id: "4", fecha: "2026-01-17", tipo: "ventas", descripcion: "Venta de productos", monto: 8500, unidad: "agrosuinos", proveedor: "Cliente X", actividad: "ventas" },
  { id: "5", fecha: "2026-01-16", tipo: "facturas", descripcion: "Combustible", monto: 3200, unidad: "luvica", proveedor: "Estación", actividad: "transporte" },
  { id: "6", fecha: "2026-01-15", tipo: "facturas", descripcion: "Alimento animales", monto: 12000, unidad: "agrosuinos", proveedor: "Agropecuaria", actividad: "mantenimiento suinos" },
  { id: "7", fecha: "2026-01-14", tipo: "nomina", descripcion: "Bono especial", monto: 5000, unidad: "casa", proveedor: "Personal", actividad: "nomina" },
  { id: "8", fecha: "2026-01-13", tipo: "ventas", descripcion: "Venta ganado", monto: 45000, unidad: "la pastoreña", proveedor: "Comprador Y", actividad: "ventas" },
  { id: "9", fecha: "2026-01-12", tipo: "facturas", descripcion: "Reparación equipo", monto: 7800, unidad: "luvica", proveedor: "Técnico", actividad: "reparaciones" },
  { id: "10", fecha: "2026-01-11", tipo: "facturas", descripcion: "Insumos agrícolas", monto: 25000, unidad: "luvica", proveedor: "AgroVentas", actividad: "cultivo" },
];

function TestContent({ tableData }: { tableData: Record<string, any>[] }) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col gap-2 p-2" data-testid="container-test-content">
      <div className="text-sm text-muted-foreground" data-testid="text-record-count">
        Datos de prueba: {tableData.length} registros
      </div>
      <div className="flex-1 overflow-hidden">
        <MyGrid
          tableId="test-grid"
          columns={testColumns}
          data={tableData}
          onRowClick={(row) => setSelectedRowId(row.id)}
          selectedRowId={selectedRowId}
          onEdit={(row) => console.log("Edit:", row)}
          onCopy={(row) => console.log("Copy:", row)}
          onDelete={(row) => console.log("Delete:", row)}
        />
      </div>
    </div>
  );
}

export default function TestWindow() {
  const [isOpen, setIsOpen] = useState(true);

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
        <TestContent tableData={testData} />
      </MyWindow>
    </div>
  );
}
