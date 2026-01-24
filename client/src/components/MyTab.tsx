import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import MyGrid, { type Column } from "./MyGrid";

export interface TabConfig {
  id: string;
  label: string;
  tipo: string;
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
  showPropColumn?: boolean;
  showUtilityColumn?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSaveNew?: (data: Record<string, any>) => void;
  addRecord?: (record: Record<string, any>) => void;
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
  showPropColumn,
  showUtilityColumn,
  hasMore,
  onLoadMore,
  onSaveNew,
  addRecord,
}: MyTabProps) {
  const currentTab = tabs.find((t) => t.id === activeTab);
  const filteredData = data.filter((row) => row.tipo === currentTab?.tipo);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="flex flex-col h-full min-h-0 w-full min-w-0 p-3 bg-gradient-to-br from-violet-500/5 to-violet-600/10 border-violet-500/20">
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full min-h-0">
            <div className="mb-2 border-b pb-2">
              {(icon || title) && (
                <div className="flex items-center gap-2 px-1 mb-2 cursor-default">
                  {icon}
                  {title && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {title}:
                    </span>
                  )}
                </div>
              )}
              <TabsList className="flex flex-wrap h-auto items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-2 h-6 text-xs"
                    data-testid={`tab-${tab.id}`}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="mt-0 h-full min-h-0 focus-visible:outline-none"
          >
            {activeTab === tab.id && (
              <div className="h-full min-h-0 p-2 overflow-hidden border rounded-md bg-gradient-to-br from-amber-500/5 to-orange-500/10 border-amber-500/20">
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
                  showPropColumn={showPropColumn}
                  showUtilityColumn={showUtilityColumn}
                  hasMore={hasMore}
                  onLoadMore={onLoadMore}
                  onSaveNew={onSaveNew}
                  addRecord={addRecord}
                />
              </div>
            )}
          </TabsContent>
        ))}
          </div>
          </Tabs>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-indigo-600 text-white text-xs">
        MyTab
      </TooltipContent>
    </Tooltip>
  );
}
