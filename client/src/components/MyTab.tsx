import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import MyGrid, { type Column } from "./MyGrid";
import { useTableData } from "@/contexts/TableDataContext";

export interface TabConfig {
  id: string;
  label: string;
  tipo: string;
  columns: Column[];
}

interface MyTabProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  data?: Record<string, any>[];
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
  icon?: React.ReactNode;
  title?: string;
  showPropColumn?: boolean;
  showUtilityColumn?: boolean;
  tableName?: string;
  onEdit?: (row: Record<string, any>) => void;
  onCopy?: (row: Record<string, any>) => void;
  onDelete?: (row: Record<string, any>) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSaveNew?: (data: Record<string, any>, onComplete?: (savedRecord: Record<string, any>) => void) => void;
  onRefresh?: (newRecord?: Record<string, any>) => void;
}

export default function MyTab({
  tabs,
  activeTab,
  onTabChange,
  data: dataProp,
  onRowClick,
  selectedRowId,
  onBooleanChange,
  icon,
  title,
  showPropColumn,
  showUtilityColumn,
  tableName: tableNameProp,
  onEdit: onEditProp,
  onCopy: onCopyProp,
  onDelete: onDeleteProp,
  hasMore: hasMoreProp,
  onLoadMore: onLoadMoreProp,
  onSaveNew: onSaveNewProp,
  onRefresh: onRefreshProp,
}: MyTabProps) {
  const context = useTableData();
  
  const tableName = tableNameProp ?? context.tableName;
  const tableData = context.tableData;
  const hasMore = hasMoreProp ?? context.hasMore ?? false;
  const onLoadMore = onLoadMoreProp ?? context.onLoadMore;
  const onRefresh = onRefreshProp ?? context.onRefresh;
  const onSaveNew = onSaveNewProp ?? context.onSaveNew;
  const onEdit = onEditProp ?? context.onEdit;
  const onCopy = onCopyProp ?? context.onCopy;
  const onDelete = onDeleteProp ?? context.onDelete;
  
  const currentTab = tabs.find((t) => t.id === activeTab);
  const sourceData = dataProp ?? tableData;
  const filteredData = sourceData.filter((row) => row.tipo === currentTab?.tipo);

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
                  tableName={tableName}
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
                  onRefresh={onRefresh}
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
