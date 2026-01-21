import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyGrid from "@/components/MyGrid";

interface Column {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
}

interface TabConfig {
  id: string;
  label: string;
  columns: Column[];
  data: Record<string, any>[];
}

interface MyTabProps {
  tabs: TabConfig[];
  defaultTab?: string;
  onRowClick?: (row: Record<string, any>, tabId: string) => void;
}

export default function MyTab({ tabs, defaultTab, onRowClick }: MyTabProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleRowClick = (row: Record<string, any>, tabId: string) => {
    setSelectedRowId(row.id);
    onRowClick?.(row, tabId);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="text-sm"
            data-testid={`tab-trigger-${tab.id}`}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-2 overflow-hidden">
          <MyGrid
            columns={tab.columns}
            data={tab.data}
            onRowClick={(row) => handleRowClick(row, tab.id)}
            selectedRowId={selectedRowId}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
