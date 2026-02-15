import { useState } from "react";
import MySubTabs from "@/components/MySubTabs";
import { ListChecks, Package, ShoppingBag, Users, Truck, Briefcase } from "lucide-react";

const paramSubTabs = [
  { id: "actividades", label: "Actividades", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "insumos", label: "Insumos", icon: <Package className="h-3.5 w-3.5" /> },
  { id: "productos", label: "Productos", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { id: "personal", label: "Personal", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "proveedores", label: "Proveedores", icon: <Truck className="h-3.5 w-3.5" /> },
  { id: "cargos", label: "Cargos", icon: <Briefcase className="h-3.5 w-3.5" /> },
];

interface AdminParametrosProps {
  filtroDeUnidad?: string;
}

export default function AdminParametros({ filtroDeUnidad }: AdminParametrosProps) {
  const [activeParamTab, setActiveParamTab] = useState("actividades");

  return (
    <MySubTabs
      tabs={paramSubTabs}
      activeTab={activeParamTab}
      onTabChange={(id) => setActiveParamTab(id)}
      testIdPrefix="tab-admin-param"
    >
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {activeParamTab}
      </div>
    </MySubTabs>
  );
}
