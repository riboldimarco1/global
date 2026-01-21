import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Settings } from "lucide-react";
import MyGrid, { type Column } from "./MyGrid";

export interface TabConfig {
  id: string;
  label: string;
  clase: string;
  columns: Column[];
}

interface MyTabProps {
  tabs: TabConfig[];
  data: Record<string, any>[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onDelete?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onEdit?: (row: Record<string, any>) => void;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
}

export const defaultTabs: TabConfig[] = [
  {
    id: "unidades",
    label: "Unidades",
    clase: "unidades",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "actividades",
    label: "Actividades",
    clase: "actividades",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    clase: "clientes",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "insumos",
    label: "Insumos",
    clase: "insumos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad Med.", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    clase: "personal",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "productos",
    label: "Productos",
    clase: "productos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "unidad", label: "Unidad Med.", defaultWidth: 120, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "proveedores",
    label: "Proveedores",
    clase: "proveedores",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 180, type: "text" },
      { key: "direccion", label: "Dirección", defaultWidth: 200, type: "text" },
      { key: "telefono", label: "Teléfono", defaultWidth: 120, type: "text" },
      { key: "ced_rif", label: "Cédula/RIF", defaultWidth: 120, type: "text" },
      { key: "cheque", label: "Cheque", defaultWidth: 60, type: "boolean", align: "center" },
      { key: "transferencia", label: "Trans.", defaultWidth: 60, type: "boolean", align: "center" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "bancos",
    label: "Bancos",
    clase: "bancos",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 200, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    clase: "operacionesbancarias",
    columns: [
      { key: "nombre", label: "Nombre", defaultWidth: 200, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 250, type: "text" },
      { key: "abilitado", label: "Hab.", defaultWidth: 60, type: "boolean", align: "center" },
    ],
  },
  {
    id: "dolar",
    label: "Dólar",
    clase: "dolar",
    columns: [
      { key: "nombre", label: "Tasa", defaultWidth: 150, type: "text" },
      { key: "descripcion", label: "Descripción", defaultWidth: 250, type: "text" },
      { key: "fecha", label: "Fecha", defaultWidth: 100, type: "date" },
    ],
  },
];

export default function MyTab({
  tabs,
  data,
  activeTab,
  onTabChange,
  onRowClick,
  selectedRowId,
  onDelete,
  onCopy,
  onEdit,
  onBooleanChange,
}: MyTabProps) {
  const currentTab = tabs.find((t) => t.id === activeTab);
  const filteredData = data.filter((row) => row.clase === currentTab?.clase);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-2 border-b pb-2">
        <div className="flex items-center gap-2 px-1 border-r pr-3">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Configuración:
          </span>
        </div>
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="pb-1">
            <TabsList className="inline-flex h-8 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="px-3 h-6 text-xs shrink-0"
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-0 h-full focus-visible:outline-none"
          >
            {activeTab === tab.id && (
              <MyGrid
                tableId={`mytab-${tab.id}`}
                columns={tab.columns}
                data={filteredData}
                onRowClick={onRowClick}
                selectedRowId={selectedRowId}
                onDelete={onDelete}
                onCopy={onCopy}
                onEdit={onEdit}
                onBooleanChange={onBooleanChange}
              />
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
