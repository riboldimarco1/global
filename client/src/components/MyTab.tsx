import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import MyGrid, { type Column } from "./MyGrid";
import { useTableData } from "@/contexts/TableDataContext";
import { matchesTipo } from "@/hooks/useParametrosOptions";

export type TabColor = 
  | "purple" | "purple-light" 
  | "indigo" | "indigo-light" 
  | "blue" | "blue-light" 
  | "cyan" | "cyan-light" 
  | "teal" | "teal-light" 
  | "green" | "green-light" 
  | "emerald" | "emerald-light" 
  | "yellow" 
  | "amber" | "amber-light" 
  | "orange" | "orange-light" 
  | "red" | "red-light" 
  | "rose" | "rose-light" 
  | "pink" | "pink-light" 
  | "violet" 
  | "gray" | "slate" | "zinc";

export interface TabConfig {
  id: string;
  label: string;
  tipo: string;
  columns: Column[];
  color?: TabColor;
}

const tabColorClasses: Record<TabColor, { bg: string; border: string; text: string; activeBg: string }> = {
  purple: { bg: "bg-purple-600", border: "border-purple-700", text: "text-white", activeBg: "bg-purple-700" },
  "purple-light": { bg: "bg-purple-500", border: "border-purple-600", text: "text-white", activeBg: "bg-purple-600" },
  indigo: { bg: "bg-indigo-600", border: "border-indigo-700", text: "text-white", activeBg: "bg-indigo-700" },
  "indigo-light": { bg: "bg-indigo-500", border: "border-indigo-600", text: "text-white", activeBg: "bg-indigo-600" },
  blue: { bg: "bg-blue-600", border: "border-blue-700", text: "text-white", activeBg: "bg-blue-700" },
  "blue-light": { bg: "bg-blue-500", border: "border-blue-600", text: "text-white", activeBg: "bg-blue-600" },
  cyan: { bg: "bg-cyan-600", border: "border-cyan-700", text: "text-white", activeBg: "bg-cyan-700" },
  "cyan-light": { bg: "bg-cyan-500", border: "border-cyan-600", text: "text-white", activeBg: "bg-cyan-600" },
  teal: { bg: "bg-teal-600", border: "border-teal-700", text: "text-white", activeBg: "bg-teal-700" },
  "teal-light": { bg: "bg-teal-500", border: "border-teal-600", text: "text-white", activeBg: "bg-teal-600" },
  green: { bg: "bg-green-600", border: "border-green-700", text: "text-white", activeBg: "bg-green-700" },
  "green-light": { bg: "bg-green-500", border: "border-green-600", text: "text-white", activeBg: "bg-green-600" },
  emerald: { bg: "bg-emerald-600", border: "border-emerald-700", text: "text-white", activeBg: "bg-emerald-700" },
  "emerald-light": { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white", activeBg: "bg-emerald-600" },
  yellow: { bg: "bg-yellow-500", border: "border-yellow-600", text: "text-black", activeBg: "bg-yellow-600" },
  amber: { bg: "bg-amber-600", border: "border-amber-700", text: "text-white", activeBg: "bg-amber-700" },
  "amber-light": { bg: "bg-amber-500", border: "border-amber-600", text: "text-black", activeBg: "bg-amber-600" },
  orange: { bg: "bg-orange-600", border: "border-orange-700", text: "text-white", activeBg: "bg-orange-700" },
  "orange-light": { bg: "bg-orange-500", border: "border-orange-600", text: "text-white", activeBg: "bg-orange-600" },
  red: { bg: "bg-red-600", border: "border-red-700", text: "text-white", activeBg: "bg-red-700" },
  "red-light": { bg: "bg-red-500", border: "border-red-600", text: "text-white", activeBg: "bg-red-600" },
  rose: { bg: "bg-rose-600", border: "border-rose-700", text: "text-white", activeBg: "bg-rose-700" },
  "rose-light": { bg: "bg-rose-500", border: "border-rose-600", text: "text-white", activeBg: "bg-rose-600" },
  pink: { bg: "bg-pink-600", border: "border-pink-700", text: "text-white", activeBg: "bg-pink-700" },
  "pink-light": { bg: "bg-pink-500", border: "border-pink-600", text: "text-white", activeBg: "bg-pink-600" },
  violet: { bg: "bg-violet-600", border: "border-violet-700", text: "text-white", activeBg: "bg-violet-700" },
  gray: { bg: "bg-gray-500", border: "border-gray-600", text: "text-white", activeBg: "bg-gray-600" },
  slate: { bg: "bg-slate-600", border: "border-slate-700", text: "text-white", activeBg: "bg-slate-700" },
  zinc: { bg: "bg-zinc-500", border: "border-zinc-600", text: "text-white", activeBg: "bg-zinc-600" },
};

interface MyTabProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onRowClick?: (row: Record<string, any>) => void;
  selectedRowId?: string | null;
  onBooleanChange?: (row: Record<string, any>, field: string, value: boolean) => void;
  icon?: React.ReactNode;
  title?: string;
  showUtilityColumn?: boolean;
  tableName?: string;
  filterFn?: (row: Record<string, any>) => boolean;
  newRecordDefaults?: Record<string, any>;
  onRecordSaved?: (record: Record<string, any>) => void;
  disableCrud?: boolean;
  filtroDeUnidad?: string;
  filtroDeBanco?: string;
  onDateStartClick?: (data: { fecha: string; id: string }) => void;
  onDateEndClick?: (data: { fecha: string; id: string }) => void;
  dateClickState?: "none" | "start";
  onReportes?: () => void;
  showReportes?: boolean;
}

export default function MyTab({
  tabs,
  activeTab,
  onTabChange,
  onRowClick,
  selectedRowId,
  onBooleanChange,
  icon,
  title,
  showUtilityColumn,
  tableName: tableNameProp,
  filterFn,
  newRecordDefaults,
  onRecordSaved,
  disableCrud = false,
  filtroDeUnidad = "",
  filtroDeBanco = "",
  onDateStartClick,
  onDateEndClick,
  dateClickState = "none",
  onReportes,
  showReportes = false,
}: MyTabProps) {
  const { 
    tableName: contextTableName, 
    tableData, 
    hasMore, 
    totalCount,
    onLoadMore, 
    onRefresh, 
    onRemove,
    onSaveNew, 
    onEdit, 
    onCopy,
    onDelete 
  } = useTableData();
  
  const tableName = tableNameProp || contextTableName;
  
  const currentTab = tabs.find((t) => t.id === activeTab);
  const filteredData = tableData.filter((row) => {
    if (!currentTab?.tipo || !matchesTipo(row.tipo, currentTab.tipo)) return false;
    if (filterFn && !filterFn(row)) return false;
    return true;
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="flex flex-col h-full min-h-0 w-full min-w-0 p-3 bg-gradient-to-br from-violet-500/5 to-violet-600/10 border-violet-500/20">
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex flex-col h-full min-h-0">
            <div className="mb-2 border-b pb-2">
              <div className="flex items-center gap-1 flex-wrap">
                {(icon || title) && (
                  <div className="flex items-center gap-1 px-1 cursor-default shrink-0" data-testid="tab-title">
                    {icon}
                    {title && (
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {title}:
                      </span>
                    )}
                  </div>
                )}
                <TabsList className="flex flex-wrap h-auto items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground">
                  {tabs.map((tab) => {
                    const colorConfig = tab.color ? tabColorClasses[tab.color] : null;
                    const isActive = activeTab === tab.id;
                    
                    if (colorConfig) {
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className={`text-xs border-2 rounded-md ${
                            isActive 
                              ? `${colorConfig.activeBg} ${colorConfig.border} ${colorConfig.text}` 
                              : `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text} opacity-80`
                          }`}
                          data-testid={`tab-${tab.id}`}
                        >
                          {tab.label}
                        </TabsTrigger>
                      );
                    }
                    
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-xs"
                        data-testid={`tab-${tab.id}`}
                      >
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
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
                  onCopy={onCopy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onBooleanChange={onBooleanChange}
                  showUtilityColumn={showUtilityColumn}
                  hasMore={hasMore}
                  totalCount={totalCount}
                  onLoadMore={onLoadMore}
                  onSaveNew={onSaveNew}
                  onRefresh={onRefresh}
                  onRemove={onRemove}
                  currentTabName={tab.tipo}
                  newRecordDefaults={newRecordDefaults}
                  onRecordSaved={onRecordSaved}
                  disableCrud={disableCrud}
                  filtroDeUnidad={filtroDeUnidad}
                  filtroDeBanco={filtroDeBanco}
                  onDateStartClick={onDateStartClick}
                  onDateEndClick={onDateEndClick}
                  dateClickState={dateClickState}
                  onReportes={onReportes}
                  showReportes={showReportes}
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
