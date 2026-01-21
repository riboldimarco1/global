import { useQuery } from "@tanstack/react-query";
import FloatingWindow from "@/components/FloatingWindow";
import MyTab from "@/components/MyTab";
import { Table2 } from "lucide-react";

interface Parametro {
  id: string;
  fecha: string | null;
  clase: string | null;
  nombre: string | null;
  unidad: string | null;
  direccion: string | null;
  telefono: string | null;
  ced_rif: string | null;
  descripcion: string | null;
}

interface MyTabDemoProps {
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export default function MyTabDemo({ onClose, onFocus, zIndex = 100 }: MyTabDemoProps) {
  const { data: parametros = [] } = useQuery<Parametro[]>({
    queryKey: ["/api/parametros"],
  });

  const proveedores = parametros.filter(p => p.clase === "proveedores");
  const clientes = parametros.filter(p => p.clase === "clientes");
  const personal = parametros.filter(p => p.clase === "personal");

  const tabs = [
    {
      id: "proveedores",
      label: `Proveedores (${proveedores.length})`,
      columns: [
        { key: "nombre", label: "Nombre", width: 200 },
        { key: "telefono", label: "Teléfono", width: 120 },
        { key: "ced_rif", label: "RIF", width: 120 },
        { key: "direccion", label: "Dirección", width: 250 },
      ],
      data: proveedores,
    },
    {
      id: "clientes",
      label: `Clientes (${clientes.length})`,
      columns: [
        { key: "nombre", label: "Nombre", width: 200 },
        { key: "telefono", label: "Teléfono", width: 120 },
        { key: "ced_rif", label: "RIF", width: 120 },
        { key: "direccion", label: "Dirección", width: 250 },
      ],
      data: clientes,
    },
    {
      id: "personal",
      label: `Personal (${personal.length})`,
      columns: [
        { key: "nombre", label: "Nombre", width: 200 },
        { key: "telefono", label: "Teléfono", width: 120 },
        { key: "ced_rif", label: "Cédula", width: 120 },
        { key: "unidad", label: "Unidad", width: 150 },
      ],
      data: personal,
    },
  ];

  return (
    <FloatingWindow
      id="mytab-demo"
      title="Demo MyTab"
      icon={<Table2 className="h-4 w-4 text-primary" />}
      onClose={onClose}
      onFocus={onFocus}
      zIndex={zIndex}
      initialSize={{ width: 800, height: 500 }}
      initialPosition={{ x: 150, y: 80 }}
    >
      <div className="h-full p-4">
        <MyTab
          tabs={tabs}
          defaultTab="proveedores"
          onRowClick={(row, tabId) => console.log("Clicked:", row, "Tab:", tabId)}
        />
      </div>
    </FloatingWindow>
  );
}
