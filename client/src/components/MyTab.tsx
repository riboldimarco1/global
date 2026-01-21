import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  icon?: React.ReactNode;
  title?: string;
}

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
  icon,
  title,
}: MyTabProps) {
  const currentTab = tabs.find((t) => t.id === activeTab);
  const filteredData = data.filter((row) => row.clase === currentTab?.clase);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-2 border-b pb-2">
        {(icon || title) && (
          <div className="flex items-center gap-2 px-1 border-r pr-3">
            {icon}
            {title && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {title}:
              </span>
            )}
          </div>
        )}
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
